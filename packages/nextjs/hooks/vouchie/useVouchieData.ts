import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { Goal, Vouchie } from "~~/types/vouchie";

// Helper to determine status
const getStatus = (goal: any): "pending" | "in_progress" | "verifying" | "done" | "failed" => {
  if (goal.resolved) {
    return goal.successful ? "done" : "failed";
  }
  const now = Date.now() / 1000;
  if (now > goal.deadline) {
    // Deadline passed but not resolved -> failed (awaiting liquidation)
    return "failed";
  }
  // If we had a "startTime", we could distinguish pending vs in_progress.
  // The contract doesn't store "startTime", so we assume "in_progress" if created.
  return "in_progress";
};

export const useVouchieData = () => {
  const { address: walletAddress } = useAccount();
  const { context } = useMiniapp();
  const { targetNetwork } = useTargetNetwork();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  // Get the user's address - prefer Farcaster primary address, fallback to wallet
  const userAddress = context.user?.primaryAddress || walletAddress;

  // 1. Get total goal count
  const { data: goalCountData, refetch: refetchCount } = useScaffoldReadContract({
    contractName: "VouchieVault",
    functionName: "goalCount",
  });

  const goalCount = goalCountData ? Number(goalCountData) : 0;

  // 2. Prepare calls for goals and vouchies
  // Fetch last 20 goals (newest first)
  const goalIndices = useMemo(() => {
    if (goalCount === 0) return [];
    const indices = [];
    for (let i = Math.max(0, goalCount - 20); i < goalCount; i++) {
      indices.push(i);
    }
    return indices.reverse(); // Newest first
  }, [goalCount]);

  // @ts-ignore
  const deployedContract = deployedContracts[targetNetwork.id]?.VouchieVault || deployedContracts[31337]?.VouchieVault;
  const contractAddress = deployedContract?.address;
  const contractAbi = deployedContract?.abi;

  // We need to fetch 'goals(id)' and 'getVouchies(id)' for each index
  const contracts = [];
  for (const id of goalIndices) {
    contracts.push({
      address: contractAddress,
      abi: contractAbi,
      functionName: "goals",
      args: [BigInt(id)],
    });
    contracts.push({
      address: contractAddress,
      abi: contractAbi,
      functionName: "getVouchies",
      args: [BigInt(id)],
    });
  }

  const {
    data: multipleData,
    isFetching: isFetchingGoals,
    refetch: refetchGoals,
  } = useReadContracts({
    contracts: contracts as any,
    query: {
      enabled: goalIndices.length > 0,
    },
  });

  useEffect(() => {
    if (!multipleData || goalIndices.length === 0) {
      if (goalCount === 0) {
        setGoals([]);
        setLoading(false);
      }
      return;
    }

    const parsedGoals: Goal[] = [];

    // Each goal has 2 calls (goals, getVouchies)
    for (let i = 0; i < goalIndices.length; i++) {
      const goalId = goalIndices[i];
      const goalResult = multipleData[i * 2];
      const vouchiesResult = multipleData[i * 2 + 1];

      if (goalResult.status === "success" && vouchiesResult.status === "success") {
        const g: any = goalResult.result; // Struct
        const v: any = vouchiesResult.result; // Address array

        // g is [id, creator, stakeAmount, deadline, createdAt, description, resolved, successful, votesValid, votesInvalid]
        const creator = g[1] as string;
        const stake = Number(g[2]);
        const deadline = Number(g[3]);
        const createdAt = Number(g[4]);
        const description = g[5];
        const resolved = g[6];
        const successful = g[7];

        // Filter: only show goals created by the current user
        // If no user is authenticated, show nothing (they need to connect)
        if (!userAddress || creator.toLowerCase() !== userAddress.toLowerCase()) {
          continue;
        }

        const vouchieAddresses = v as string[];
        const mode = vouchieAddresses.length === 0 ? "Solo" : "Squad";

        const vouchieList: Vouchie[] = vouchieAddresses.map(addr => ({
          name: addr.slice(0, 6) + "...", // Placeholder name
          avatar: "👤",
          address: addr,
          status: "pending", // TODO: check hasVoted
        }));

        parsedGoals.push({
          id: goalId,
          title: description,
          stake: Number(stake) / 1e6, // USDC has 6 decimals
          currency: "USDC",
          deadline: deadline * 1000, // JS timestamp
          createdAt: createdAt * 1000, // JS timestamp
          mode,
          status: getStatus({ resolved, successful, deadline }),
          startTime: null, // Contract doesn't track this
          startImage: null,
          vouchies: vouchieList,
          comments: [], // No comments in contract
          progress: 0,
          color: "bg-white", // Use white for all modes - Card handles dark mode
          accent: mode === "Solo" ? "text-orange-600 dark:text-orange-400" : "text-indigo-600 dark:text-indigo-400",
          barColor: mode === "Solo" ? "bg-orange-400" : "bg-indigo-400",
        });
      }
    }
    setGoals(parsedGoals);
    setLoading(false);
  }, [multipleData, goalIndices, goalCount, userAddress]);

  const refresh = () => {
    refetchCount();
    refetchGoals();
  };

  const updateGoal = (goalId: number, updates: Partial<Goal>) => {
    setGoals(prevGoals => prevGoals.map(g => (g.id === goalId ? { ...g, ...updates } : g)));
  };

  return { goals, loading: loading || isFetchingGoals, refresh, goalCount, updateGoal };
};

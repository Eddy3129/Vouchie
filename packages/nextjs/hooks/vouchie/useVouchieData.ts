import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { FarcasterUser, useFarcasterUser } from "~~/hooks/vouchie/useFarcasterUser";
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
  const { lookupBatch } = useFarcasterUser();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [verificationGoals, setVerificationGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [farcasterUsers, setFarcasterUsers] = useState<Map<string, FarcasterUser | null>>(new Map());
  const [userVerifiedAddresses, setUserVerifiedAddresses] = useState<string[]>([]);

  // Fetch all verified addresses for current user's FID
  useEffect(() => {
    const fetchUserAddresses = async () => {
      if (!context.user?.fid) return;

      try {
        const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
        if (!apiKey) {
          console.warn("NEXT_PUBLIC_NEYNAR_API_KEY not set");
          return;
        }

        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${context.user.fid}`, {
          headers: {
            accept: "application/json",
            "x-api-key": apiKey,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const user = data.users?.[0];
          if (user?.verified_addresses?.eth_addresses) {
            const addresses = user.verified_addresses.eth_addresses.map((a: string) => a.toLowerCase());
            console.log("User verified addresses:", addresses);
            setUserVerifiedAddresses(addresses);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user verified addresses:", err);
      }
    };

    fetchUserAddresses();
  }, [context.user?.fid]);

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

    const parsedMyGoals: Goal[] = [];
    const parsedVerificationGoals: Goal[] = [];
    const allAddresses: string[] = [];

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

        const vouchieAddresses = v as string[];

        // Check if user is creator or vouchie - compare against ALL verified addresses from FID
        const allUserAddresses: string[] = [...userVerifiedAddresses];
        if (context.user?.primaryAddress && !allUserAddresses.includes(context.user.primaryAddress.toLowerCase())) {
          allUserAddresses.push(context.user.primaryAddress.toLowerCase());
        }
        if (walletAddress && !allUserAddresses.includes(walletAddress.toLowerCase())) {
          allUserAddresses.push(walletAddress.toLowerCase());
        }

        const isCreator = allUserAddresses.length > 0 && allUserAddresses.includes(creator.toLowerCase());
        const isVouchie =
          allUserAddresses.length > 0 &&
          vouchieAddresses.some((addr: string) => allUserAddresses.includes(addr.toLowerCase()));

        // Skip if neither creator nor vouchie
        if (!isCreator && !isVouchie) continue;

        const mode = vouchieAddresses.length === 0 ? "Solo" : "Squad";

        if (isVouchie && mode === "Solo") continue; // Vouchies only exist in Squad/Vouchie mode

        // Collect addresses for Farcaster lookup
        allAddresses.push(creator);
        vouchieAddresses.forEach((addr: string) => allAddresses.push(addr));

        const vouchieList: Vouchie[] = vouchieAddresses.map((addr: string) => ({
          name: addr.slice(0, 6) + "...", // Placeholder name, will be updated after lookup
          avatar: "👤",
          address: addr,
          status: "pending", // TODO: check hasVoted
        }));

        const goalObj: Goal = {
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
          creator: creator, // Add creator address for display
        };

        if (isCreator) parsedMyGoals.push(goalObj);
        if (isVouchie) parsedVerificationGoals.push(goalObj);
      }
    }

    // Lookup Farcaster users for all addresses
    if (allAddresses.length > 0) {
      lookupBatch([...new Set(allAddresses)]).then(results => {
        setFarcasterUsers(results);
      });
    }

    setGoals(parsedMyGoals);
    setVerificationGoals(parsedVerificationGoals);
    setLoading(false);
  }, [
    multipleData,
    goalIndices,
    goalCount,
    userAddress,
    // lookupBatch is stable (useCallback with []), safe to omit
    userVerifiedAddresses,
    walletAddress,
    context.user?.primaryAddress,
  ]);

  // Update goals with Farcaster usernames when lookup completes
  useEffect(() => {
    if (farcasterUsers.size === 0) return;

    const updateGoalsWithUsernames = (goalList: Goal[]): Goal[] => {
      return goalList.map(goal => {
        // Update creator info
        const creatorUser = goal.creator ? farcasterUsers.get(goal.creator.toLowerCase()) : null;

        // Update vouchie usernames
        const updatedVouchies = goal.vouchies.map(v => {
          const fcUser = v.address ? farcasterUsers.get(v.address.toLowerCase()) : null;
          if (fcUser) {
            return {
              ...v,
              name: fcUser.displayName || fcUser.username || v.name,
              username: fcUser.username,
              fid: fcUser.fid,
              avatar: fcUser.pfpUrl || v.avatar,
            };
          }
          return v;
        });

        return {
          ...goal,
          creatorUsername: creatorUser?.username,
          creatorAvatar: creatorUser?.pfpUrl,
          vouchies: updatedVouchies,
        };
      });
    };

    setGoals(prev => updateGoalsWithUsernames(prev));
    setVerificationGoals(prev => updateGoalsWithUsernames(prev));
  }, [farcasterUsers]);

  const refresh = () => {
    refetchCount();
    refetchGoals();
  };

  const updateGoal = (goalId: number, updates: Partial<Goal>) => {
    setGoals(prevGoals => prevGoals.map(g => (g.id === goalId ? { ...g, ...updates } : g)));
  };

  return { goals, verificationGoals, loading: loading || isFetchingGoals, refresh, goalCount, updateGoal };
};

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import deployedContracts from "~~/contracts/deployedContracts";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { FarcasterUser, useFarcasterUser } from "~~/hooks/vouchie/useFarcasterUser";
import { Goal, Vouchie } from "~~/types/vouchie";
import { fetchProofCasts } from "~~/utils/neynar";

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

/**
 * Hook to fetch and manage goal data for the current user.
 * Returns two separate lists based on user role:
 * - creatorGoals: Goals where the current user is the CREATOR (owns the stake)
 * - vouchieGoals: Goals where the current user is a VOUCHIE (verifies for others)
 */
export const useVouchieData = () => {
  const { address: walletAddress } = useAccount();
  const { context } = useMiniapp();
  const { targetNetwork } = useTargetNetwork();
  const { lookupBatch } = useFarcasterUser();

  // ============ STATE ============
  /** Goals where current user is the CREATOR */
  const [creatorGoals, setCreatorGoals] = useState<Goal[]>([]);
  /** Goals where current user is a VOUCHIE (needs to verify) */
  const [vouchieGoals, setVouchieGoals] = useState<Goal[]>([]);
  /** Loading state for initial data fetch */
  const [loading, setLoading] = useState(true);
  /** Map of address → Farcaster user data for avatar/username display */
  const [farcasterUsers, setFarcasterUsers] = useState<Map<string, FarcasterUser | null>>(new Map());
  /** All verified ETH addresses for the current user's Farcaster FID */
  const [userVerifiedAddresses, setUserVerifiedAddresses] = useState<string[]>([]);
  /** Map of goalId → proof cast data (text + hash) from Farcaster */
  const [proofCastsMap, setProofCastsMap] = useState<Map<number, { text: string; hash: string }>>(new Map());

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

  // We need to fetch 'goals(id)', 'getVouchies(id)', and 'vouchiesClaimed(id, userAddress)' for each index
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
    contracts.push({
      address: contractAddress,
      abi: contractAbi,
      functionName: "vouchiesClaimed",
      args: [BigInt(id), userAddress],
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
        setCreatorGoals([]);
        setLoading(false);
      }
      return;
    }

    const parsedCreatorGoals: Goal[] = [];
    const parsedVouchieGoals: Goal[] = [];
    const allAddresses: string[] = [];

    // Each goal has 3 calls (goals, getVouchies, vouchiesClaimed)
    for (let i = 0; i < goalIndices.length; i++) {
      const goalId = goalIndices[i];
      const goalResult = multipleData[i * 3];
      const vouchiesResult = multipleData[i * 3 + 1];
      const claimResult = multipleData[i * 3 + 2];

      if (goalResult.status === "success" && vouchiesResult.status === "success") {
        const g: any = goalResult.result; // Struct
        const v: any = vouchiesResult.result; // Address array
        const userHasClaimed = claimResult?.status === "success" ? (claimResult.result as boolean) : false;

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

        const currentUserVouchieIndex = isVouchie
          ? vouchieAddresses.findIndex((addr: string) => allUserAddresses.includes(addr.toLowerCase()))
          : undefined;

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
          resolved,
          successful,
          userHasClaimed,
          currentUserVouchieIndex,
          startTime: null, // Contract doesn't track this
          startImage: null,
          vouchies: vouchieList,
          comments: [], // No comments in contract
          progress: 0,
          color: "bg-white", // Use white for all modes - Card handles dark mode
          accent: mode === "Solo" ? "text-orange-600 dark:text-orange-400" : "text-indigo-600 dark:text-indigo-400",
          barColor: mode === "Solo" ? "bg-orange-400" : "bg-indigo-400",
          creator: creator, // Add creator address for display
          votesValid: Number(g[8]),
          votesInvalid: Number(g[9]),
        };

        if (isCreator) parsedCreatorGoals.push(goalObj);
        if (isVouchie) parsedVouchieGoals.push(goalObj);
      }
    }

    // Lookup Farcaster users for all addresses
    if (allAddresses.length > 0) {
      lookupBatch([...new Set(allAddresses)]).then(results => {
        setFarcasterUsers(results);
      });
    }

    setCreatorGoals(parsedCreatorGoals);
    setVouchieGoals(parsedVouchieGoals);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Fetch proofs for active Squad goals (check BOTH goals and verificationGoals)
  useEffect(() => {
    const checkProofs = async () => {
      const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;

      console.log(`[PROOF CHECK] Starting proof check...`);
      console.log(`[PROOF CHECK] API key present: ${!!apiKey}`);
      console.log(`[PROOF CHECK] Farcaster users loaded: ${farcasterUsers.size}`);
      console.log(`[PROOF CHECK] Creator goals: ${creatorGoals.length}, Vouchie goals: ${vouchieGoals.length}`);

      if (!apiKey || farcasterUsers.size === 0) {
        console.log(`[PROOF CHECK] ❌ Early exit: ${!apiKey ? "No API key" : "No Farcaster users loaded yet"}`);
        return;
      }

      // Combine both arrays and deduplicate by goal ID
      const allSquadGoals = [...creatorGoals, ...vouchieGoals].filter(
        (goal, index, self) =>
          goal.mode === "Squad" && !goal.resolved && index === self.findIndex(g => g.id === goal.id),
      );

      console.log(`[PROOF CHECK] Squad goals to check: ${allSquadGoals.length}`);
      allSquadGoals.forEach(g => {
        const creatorUser = g.creator ? farcasterUsers.get(g.creator.toLowerCase()) : null;
        console.log(
          `[PROOF CHECK] Goal ${g.id}: "${g.title}" creator=${g.creator?.slice(0, 8)}... creatorFid=${creatorUser?.fid || "NOT FOUND"}`,
        );
      });

      if (allSquadGoals.length === 0) {
        console.log(`[PROOF CHECK] ❌ No squad goals to check`);
        return;
      }

      const newProofs = new Map(proofCastsMap);
      let hasNew = false;

      await Promise.all(
        allSquadGoals.map(async goal => {
          // Only check if not already in proofs map
          if (!proofCastsMap.has(goal.id)) {
            const creatorUser = goal.creator ? farcasterUsers.get(goal.creator.toLowerCase()) : null;
            if (creatorUser?.fid) {
              console.log(`[PROOF CHECK] Checking goal ${goal.id} with creator FID ${creatorUser.fid}...`);
              const proof = await fetchProofCasts(goal.id, creatorUser.fid, apiKey);
              if (proof) {
                console.log(`[PROOF CHECK] ✅ Proof found for goal ${goal.id}`);
                newProofs.set(goal.id, proof);
                hasNew = true;
              }
            } else {
              console.log(`[PROOF CHECK] ⚠️ Goal ${goal.id}: Creator not in Farcaster users map or no FID`);
            }
          } else {
            console.log(`[PROOF CHECK] Goal ${goal.id} already has proof in cache`);
          }
        }),
      );

      if (hasNew) {
        console.log(`[PROOF CHECK] ✅ New proofs found, updating state`);
        setProofCastsMap(newProofs);
      } else {
        console.log(`[PROOF CHECK] No new proofs found`);
      }
    };

    checkProofs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farcasterUsers, creatorGoals.length, vouchieGoals.length]); // Check when users or goals count changes

  // Update goals with Farcaster usernames AND proofs when lookup completes or proofs found
  useEffect(() => {
    // We run this if users loaded OR proofs loaded
    if (farcasterUsers.size === 0 && proofCastsMap.size === 0) return;

    const updateGoalsWithData = (goalList: Goal[]): Goal[] => {
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

        // Merge proof data if available
        const proof = proofCastsMap.get(goal.id);
        const newData: Partial<Goal> = {
          creatorUsername: creatorUser?.username,
          creatorAvatar: creatorUser?.pfpUrl,
          vouchies: updatedVouchies,
        };

        if (proof) {
          newData.proofText = proof.text;
          newData.proofCastHash = proof.hash;
          newData.status = "verifying"; // Override status
        }

        return {
          ...goal,
          ...newData,
        };
      });
    };

    setCreatorGoals((prev: Goal[]) => updateGoalsWithData(prev));
    setVouchieGoals((prev: Goal[]) => updateGoalsWithData(prev));
  }, [farcasterUsers, proofCastsMap]);

  const refresh = () => {
    refetchCount();
    refetchGoals();
  };

  const updateGoal = (goalId: number, updates: Partial<Goal>) => {
    setCreatorGoals((prevGoals: Goal[]) => prevGoals.map(g => (g.id === goalId ? { ...g, ...updates } : g)));
    setVouchieGoals((prevGoals: Goal[]) => prevGoals.map(g => (g.id === goalId ? { ...g, ...updates } : g)));
  };

  return {
    /** Goals where current user is the CREATOR */
    creatorGoals,
    /** Goals where current user is a VOUCHIE */
    vouchieGoals,
    loading: loading || isFetchingGoals,
    refresh,
    goalCount,
    updateGoal,
  };
};

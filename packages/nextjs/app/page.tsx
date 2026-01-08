"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CalendarBlank, Clock, Compass, HandCoins, House, Plus, ShieldCheck, User, Users } from "@phosphor-icons/react";
import { toast } from "react-hot-toast";
import { parseUnits } from "viem";
import { erc20Abi } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import CalendarView from "~~/components/vouchie/CalendarView";
import FriendActivityView from "~~/components/vouchie/FriendActivityView";
import FontStyles from "~~/components/vouchie/Helper/FontStyles";
import HomeActiveView from "~~/components/vouchie/HomeActiveView";
import AddModal from "~~/components/vouchie/Modals/AddModal";
import GiveUpModal from "~~/components/vouchie/Modals/GiveUpModal";
import StartTaskModal from "~~/components/vouchie/Modals/StartTaskModal";
import TaskDetailModal from "~~/components/vouchie/Modals/TaskDetailModal";
import VerifyModal from "~~/components/vouchie/Modals/VerifyModal";
import ProfileView from "~~/components/vouchie/ProfileView";
import SlidingTabs from "~~/components/vouchie/SlidingTabs";
import VouchieView from "~~/components/vouchie/VouchieView";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";
import { useFamousQuotes } from "~~/hooks/vouchie/useFamousQuotes";
import { usePersonalActivities } from "~~/hooks/vouchie/usePersonalActivities";
import { useVouchieData } from "~~/hooks/vouchie/useVouchieData";
import { CANCEL_GRACE_PERIOD_MS, Goal } from "~~/types/vouchie";
import { buildGoalCreatedCast } from "~~/utils/castHelpers";

// Helper to format address
const formatAddress = (address?: string) => {
  if (!address) return "unknown";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const VouchieApp = () => {
  const { address } = useAccount();
  const { context, composeCast } = useMiniapp();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardTab, setDashboardTab] = useState<"tasks" | "verify">("tasks");
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when changing tabs
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeTab]);

  // Initialize theme from localStorage on app mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
      if (shouldBeDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      // localStorage might not be available in some contexts
      console.warn("Could not access localStorage for theme:", e);
    }
  }, []);

  // Detect virtual keyboard open/close to hide bottom nav
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      if (typeof visualViewport === "undefined" || !visualViewport) return;
      // If viewport height is significantly less than window height, keyboard is likely open
      const viewportHeight = visualViewport.height;
      const windowHeight = window.innerHeight;
      const threshold = windowHeight * 0.8; // Increased threshold slightly
      setIsKeyboardOpen(viewportHeight < threshold);
    };

    // Also listen for focus events on inputs as a faster signal
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        setIsKeyboardOpen(true);
      }
    };

    const handleBlur = () => {
      // Only reset if we're not focusing another input
      setTimeout(() => {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          // Let the resize handler verify if keyboard is actually gone (some delay needed)
          if (
            typeof visualViewport !== "undefined" &&
            visualViewport &&
            visualViewport.height >= window.innerHeight * 0.8
          ) {
            setIsKeyboardOpen(false);
          }
        }
      }, 100);
    };

    visualViewport?.addEventListener("resize", handleResize);
    window.addEventListener("focusin", handleFocus);
    window.addEventListener("focusout", handleBlur);

    return () => {
      visualViewport?.removeEventListener("resize", handleResize);
      window.removeEventListener("focusin", handleFocus);
      window.removeEventListener("focusout", handleBlur);
    };
  }, []);

  // Selection States
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Goal | null>(null);
  const [selectedTaskForStart, setSelectedTaskForStart] = useState<Goal | null>(null);
  const [selectedTaskForGiveUp, setSelectedTaskForGiveUp] = useState<Goal | null>(null);
  const [selectedVerificationGoal, setSelectedVerificationGoal] = useState<Goal | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Data Hook - creatorGoals = myCreatorGoals where user is creator, vouchieGoals = myCreatorGoals where user is vouchie
  const { creatorGoals, vouchieGoals, loading, refresh, updateGoal } = useVouchieData();

  // Personal activities for badge count (uses vouchieGoals for verification notifications)
  const { unreadCount } = usePersonalActivities({
    creatorGoals,
    vouchieGoals,
    userAddress: address,
  });

  // Filter creator myCreatorGoals by current user address (safety filter)
  const myCreatorGoals = React.useMemo(() => {
    const userAddr = context?.user?.primaryAddress || address;
    if (!userAddr) return [];
    return creatorGoals.filter((g: Goal) => g.creator?.toLowerCase() === userAddr.toLowerCase());
  }, [creatorGoals, context?.user?.primaryAddress, address]);

  // Settlement Restriction Logic
  const maturedGoals = React.useMemo(() => {
    return myCreatorGoals.filter(g => !g.resolved && g.deadline < Date.now());
  }, [myCreatorGoals]);

  const hasBlockingSettle = maturedGoals.length > 0;

  // Quotes
  useFamousQuotes();

  // Network Check
  const { targetNetwork } = useTargetNetwork();
  const usdcContractName = targetNetwork.id === 31337 ? "MockUSDC" : "USDC";
  const usdcDecimals = targetNetwork.id === 31337 ? 18 : 6;

  // Contract Info
  const { data: vaultInfo } = useDeployedContractInfo({ contractName: "VouchieVault" });
  const { data: usdcInfo } = useDeployedContractInfo({ contractName: usdcContractName as any });

  // Public client for waiting on transactions
  const publicClient = usePublicClient();

  // Contract Writes - VouchieVault
  const { writeContractAsync: createGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: verifySolo } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: streakFreeze } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: forfeitGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: cancelGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: claimGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: vote } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: resolveGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: claimFunds } = useScaffoldWriteContract({ contractName: "VouchieVault" });

  // Silent approval (no notification) using wagmi directly
  const { writeContractAsync: silentApprove } = useWriteContract();

  // Read user's USDC balance (for refetching after transactions)
  const { refetch: refetchBalance } = useReadContract({
    address: usdcInfo?.address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdcInfo?.address,
    },
  });

  // Read extension fee from VouchieVault
  const { data: extensionFee } = useScaffoldReadContract({
    contractName: "VouchieVault",
    functionName: "extensionFee",
  });

  const handleAdd = async (formData: any) => {
    try {
      const stakeAmount = parseUnits(formData.stake.toString(), usdcDecimals);
      const durationSeconds = formData.durationSeconds || 3600; // Default to 1 hour

      // Extract vouchie addresses only if vouchies array has entries
      const vouchies =
        formData.vouchies && formData.vouchies.length > 0
          ? formData.vouchies.map((v: any) => v.address).filter((addr: string) => addr && addr.startsWith("0x"))
          : [];

      // Step 1: Silent approve (no notification popup)
      if (vaultInfo?.address && usdcInfo?.address && publicClient) {
        const approveTxHash = await silentApprove({
          address: usdcInfo.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [vaultInfo.address, stakeAmount],
        });
        // Wait for approval to be confirmed before proceeding
        await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      } else if (!publicClient) {
        console.error("Public client not available, cannot wait for approval");
        return;
      }

      // Step 2: Create the goal with vouchie addresses (empty array triggers solo mode)
      await createGoal({
        functionName: "createGoal",
        args: [stakeAmount, BigInt(durationSeconds), formData.title, vouchies],
      });
      refresh();
      refetchBalance();

      // Step 3: Prompt user to share on Farcaster with dynamic OG embed
      const appUrl = typeof window !== "undefined" ? window.location.origin : "https://vouchie.app";
      const deadlineTimestamp = Date.now() + durationSeconds * 1000;
      const tempGoalId = Date.now();

      const castContent = buildGoalCreatedCast(appUrl, {
        goalId: tempGoalId,
        title: formData.title,
        stake: formData.stake,
        deadline: deadlineTimestamp,
        username: context?.user?.username || "",
        mode: vouchies.length > 0 ? "Squad" : "Solo",
        vouchieUsernames: formData.vouchies?.map((v: { username?: string }) => v.username).filter(Boolean) || [],
      });

      composeCast(castContent);
    } catch (e) {
      console.error("Error creating goal:", e);
    }
  };

  const handleStartTask = (goalId: number, image: string | null) => {
    setSelectedTaskForStart(null);
    console.log("Started task:", goalId, image);
  };

  const handleSubmitProof = async (goalId: number, _proof: string) => {
    const goal = myCreatorGoals.find(g => g.id === goalId);
    if (!goal) return;

    console.log("Submitting proof:", _proof);

    try {
      if (goal.mode === "Solo") {
        await verifySolo({
          functionName: "verifySolo",
          args: [BigInt(goalId)],
        });

        // Claim funds immediately after verification
        try {
          await claimGoal({
            functionName: "claim",
            args: [BigInt(goalId), BigInt(0)], // 0 index is ignored for creator
          });
          refetchBalance();
        } catch (claimError) {
          console.error("User rejected claim or claim failed:", claimError);
          // We don't block the UI update because the goal IS verified.
          // The user can claim later if we add a claim button.
        }

        // Optimistic update for Solo mode (immediate success)
        updateGoal(goalId, { status: "done" });
      } else {
        toast.success("Proof casted! Waiting for vouchies to verify.");
      }
      refresh();
      setSelectedTaskForDetails(null);
    } catch (e) {
      console.error("Error submitting proof:", e);
    }
  };

  const handleGiveUp = async (goalId: number) => {
    setSelectedTaskForGiveUp(myCreatorGoals.find(g => g.id === goalId) || null);
  };

  const handleConfirmGiveUp = async (goalId: number) => {
    const goal = myCreatorGoals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      // Read grace period status from contract (source of truth for blockchain time)
      let isInGracePeriod = false;
      if (vaultInfo?.address && publicClient) {
        try {
          const [inGracePeriod] = (await publicClient.readContract({
            address: vaultInfo.address,
            abi: [
              {
                name: "getGracePeriodStatus",
                type: "function",
                stateMutability: "view",
                inputs: [{ name: "_goalId", type: "uint256" }],
                outputs: [
                  { name: "inGracePeriod", type: "bool" },
                  { name: "remainingTime", type: "uint256" },
                ],
              },
            ],
            functionName: "getGracePeriodStatus",
            args: [BigInt(goalId)],
          })) as [boolean, bigint];
          isInGracePeriod = inGracePeriod;
        } catch {
          // Fallback to local calculation if contract call fails
          const now = Date.now();
          isInGracePeriod = goal.createdAt ? now <= goal.createdAt + CANCEL_GRACE_PERIOD_MS : false;
        }
      }

      if (isInGracePeriod) {
        // Within grace period - cancel with full refund
        await cancelGoal({
          functionName: "cancelGoal",
          args: [BigInt(goalId)],
        });
      } else {
        // Grace period expired - forfeit (money goes to treasury/squad)
        await forfeitGoal({
          functionName: "forfeit",
          args: [BigInt(goalId)],
        });
      }

      // Optimistic update
      updateGoal(goalId, { status: "failed" });

      refresh();
      refetchBalance();
      setSelectedTaskForDetails(null);
      setSelectedTaskForGiveUp(null);
    } catch (e) {
      console.error("Error giving up goal:", e);
    }
  };

  const handleExtend = async (goalId: number) => {
    try {
      // Step 1: Silent approve extension fee (no notification popup)
      if (vaultInfo?.address && usdcInfo?.address && extensionFee && publicClient) {
        const approveTxHash = await silentApprove({
          address: usdcInfo.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [vaultInfo.address, extensionFee],
        });
        // Wait for approval to be confirmed before proceeding
        await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      } else if (!publicClient) {
        console.error("Public client not available, cannot wait for approval");
        return;
      }

      // Step 2: Call streakFreeze (shows single success notification)
      await streakFreeze({
        functionName: "streakFreeze",
        args: [BigInt(goalId)],
      });
      refresh();
      refetchBalance();
      setSelectedTaskForDetails(null);
      setSelectedTaskForGiveUp(null);
    } catch (e) {
      console.error("Error extending goal:", e);
    }
  };

  // Handle Voting
  const handleVote = async (goalId: number, isValid: boolean, denyReason?: string) => {
    const goal = vouchieGoals.find(g => g.id === goalId);
    if (!goal) return;

    const userAddress = context?.user?.primaryAddress || address;
    if (!userAddress) {
      toast.error("Please connect wallet or log in");
      return;
    }

    const vouchieIndex = goal.vouchies.findIndex(v => v.address?.toLowerCase() === userAddress.toLowerCase());

    if (vouchieIndex === -1) {
      toast.error("You are not a vouchie for this goal");
      return;
    }

    // Log deny reason for now (could be stored on-chain or in a database later)
    if (!isValid && denyReason) {
      console.log(`Deny reason for goal ${goalId}:`, denyReason);
    }

    try {
      // Optimistic update - mark as voted immediately for better UX
      updateGoal(goalId, {
        vouchies: goal.vouchies.map((v, idx) =>
          idx === vouchieIndex ? { ...v, status: isValid ? "approved" : "denied" } : v,
        ),
      });

      await vote({
        functionName: "vote",
        args: [BigInt(goalId), isValid, BigInt(vouchieIndex)],
      });
      toast.success(isValid ? "Vote cast: Verified! 🎉" : "Vote cast: Denied");
      refresh();
      setIsVerifyModalOpen(false);
    } catch (e) {
      console.error("Error voting:", e);
      toast.error("Failed to cast vote");
      // Revert optimistic update on error
      refresh();
    }
  };

  // Manual Settle Flow
  const handleSettle = async (goalId: number) => {
    try {
      await resolveGoal({
        functionName: "resolve",
        args: [BigInt(goalId)],
      });
      refresh();
      toast.success("Goal settled on-chain!");
    } catch (e: any) {
      console.error("error settling:", e);
      toast.error(e.message || "Failed to settle goal");
    }
  };

  // Manual Claim Flow
  const handleClaim = async (goalId: number, index: number) => {
    try {
      // Optimistic update - mark as claimed immediately for better UX
      updateGoal(goalId, {
        userHasClaimed: true,
        stake: 0, // Set stake to 0 to hide claim button
      });

      await claimFunds({
        functionName: "claim",
        args: [BigInt(goalId), BigInt(index)],
      });
      refresh();
      toast.success("Rewards claimed!");
    } catch (e: any) {
      console.error("error claiming:", e);
      toast.error(e.message || "Failed to claim rewards");
      // Revert optimistic update on error
      refresh();
    }
  };

  return (
    <div
      className="flex h-screen w-full bg-[#FAF7F2] dark:bg-stone-900 text-stone-800 dark:text-stone-100 overflow-hidden"
      style={{
        paddingTop: context?.client?.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client?.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client?.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client?.safeAreaInsets?.right ?? 0,
      }}
    >
      <FontStyles />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white/50 backdrop-blur-xl border-r border-stone-100 dark:border-stone-800 flex-col p-6 h-full sticky top-0 dark:bg-stone-800/50">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 flex items-center justify-center hover-lift">
            <Image src="/logo.png" alt="Vouchie" width={40} height={40} priority />
          </div>
          <span className="text-2xl font-bold text-[#8B5A2B] dark:text-[#FFA726]">Vouchie</span>
        </div>
        <nav className="space-y-2">
          {[
            { id: "dashboard", icon: House, label: "Home" },
            { id: "calendar", icon: CalendarBlank, label: "Calendar" },
            { id: "feed", icon: Compass, label: "Feed" },
            { id: "squad", icon: Users, label: "Vouchie" },
            { id: "profile", icon: User, label: "Profile" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${activeTab === t.id ? "bg-white dark:bg-stone-700 shadow-md text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-500 dark:text-stone-400 hover:bg-white/60 dark:hover:bg-stone-800/60"}`}
            >
              <t.icon size={24} weight={activeTab === t.id ? "fill" : "regular"} />
              <span className="font-bold text-lg">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth pb-8 lg:pb-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === "dashboard" && (
              <div className="space-y-6 animate-in fade-in duration-500 px-8 pt-6">
                {/* Hero Quote Section */}
                {/* Hero Quote Section */}
                {/* Hero Quote Section Removed - Moved to Profile // */}

                {/* Dashboard Tabs */}
                <SlidingTabs
                  tabs={[
                    { id: "tasks", label: <> To Dos</> },
                    {
                      id: "verify",
                      label: (
                        <>
                          Verifications
                          {(() => {
                            // Debug logging for Verification Badge
                            const pendingCount = vouchieGoals.filter(g => !g.resolved).length;
                            const actionableCount = vouchieGoals.filter(
                              g => !g.resolved && (g.proofText || g.deadline < Date.now()),
                            ).length;

                            if (pendingCount > 0) {
                              console.log("[BADGE DEBUG] Verification Badge Calculation:", {
                                totalVouchieGoals: vouchieGoals.length,
                                unresolved: pendingCount,
                                actionable: actionableCount,
                                details: vouchieGoals
                                  .filter(g => !g.resolved)
                                  .map(g => ({
                                    id: g.id,
                                    title: g.title,
                                    resolved: g.resolved,
                                    hasProof: !!g.proofText,
                                    isExpired: g.deadline < Date.now(),
                                    timeLeft: (g.deadline - Date.now()) / 1000,
                                  })),
                              });
                            }

                            // Use actionable count instead of just unresolved count
                            return (
                              actionableCount > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                                  {actionableCount}
                                </span>
                              )
                            );
                          })()}
                        </>
                      ),
                    },
                  ]}
                  activeTab={dashboardTab}
                  onChange={id => setDashboardTab(id as "tasks" | "verify")}
                  className="mb-6"
                />

                {/* Task List Tab -> Now Home Active View */}
                {dashboardTab === "tasks" &&
                  // We need to pass data to HomeActiveView
                  // Logic: Find the single most "active" goal.
                  // Priority: Earliest deadline (most urgent)
                  (() => {
                    const activeGoals = myCreatorGoals
                      .filter(t => t.status !== "done" && t.status !== "failed")
                      .sort((a, b) => a.deadline - b.deadline);

                    // The most urgent goal (earliest deadline) is the active one
                    const activeGoal = activeGoals[0];

                    // Upcoming are the rest
                    const upcomingGoals = activeGoals.slice(1);

                    const completedGoals = myCreatorGoals.filter(t => t.status === "done");

                    return (
                      <HomeActiveView
                        activeGoal={
                          maturedGoals.length > 0 ? maturedGoals.sort((a, b) => a.deadline - b.deadline)[0] : activeGoal
                        }
                        upcomingGoals={maturedGoals.length > 0 ? activeGoals : upcomingGoals}
                        completedGoals={completedGoals}
                        onVerify={(g: Goal) => setSelectedTaskForDetails(g)}
                        onStart={(g: Goal) => setSelectedTaskForStart(g)}
                        onSettle={handleSettle}
                        onForfeit={(id: number) => {
                          const goal = myCreatorGoals.find(g => g.id === id);
                          if (goal) setSelectedTaskForGiveUp(goal);
                        }}
                        onCreate={() => setAddModalOpen(true)}
                        isBlockingSettle={hasBlockingSettle}
                      />
                    );
                  })()}

                {/* Verify Tab */}
                {dashboardTab === "verify" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 px-6 pb-24">
                    {/* Empty State */}
                    {!loading && vouchieGoals.length === 0 && (
                      <div className="p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-800/50">
                        <div className="text-4xl mb-4">🛡️</div>
                        <p className="text-stone-400 font-bold text-lg mb-2">No verifications pending</p>
                        <p className="text-stone-400 text-sm">
                          When someone adds you as a vouchie, their myCreatorGoals will appear here for you to verify.
                        </p>
                      </div>
                    )}

                    {/* Verification Cards */}
                    {!loading &&
                      (() => {
                        // Filter myCreatorGoals that can be verified (proof submitted OR expired)
                        const verifiableGoals = vouchieGoals
                          .filter(g => !g.resolved)
                          .filter(g => g.proofText || g.deadline < Date.now());

                        // If user has blocking settle AND no verifiable myCreatorGoals, show lock
                        if (hasBlockingSettle && verifiableGoals.length === 0) {
                          return (
                            <div className="p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-800/50">
                              <div className="text-4xl mb-4">🔒</div>
                              <p className="text-stone-400 font-bold text-lg mb-2">Verification Locked</p>
                              <p className="text-stone-400 text-sm">
                                You must settle your own matured myCreatorGoals before you can verify for others.
                              </p>
                              <button
                                onClick={() => {
                                  setDashboardTab("tasks");
                                  setActiveTab("dashboard");
                                }}
                                className="mt-6 px-6 py-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl font-bold text-sm transition-all border border-stone-200 dark:border-stone-700"
                              >
                                Go to My Tasks
                              </button>
                            </div>
                          );
                        }

                        // Show verifiable myCreatorGoals (or all unresolved if no blocking settle)
                        const goalsToShow = hasBlockingSettle ? verifiableGoals : vouchieGoals.filter(g => !g.resolved);

                        return goalsToShow.map(task => {
                          const isExpired = task.deadline < Date.now();
                          const canVerify = isExpired || task.proofText;

                          // Time calculation
                          const timeLeft = Math.max(0, task.deadline - Date.now());
                          const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                          const mins = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                          const secs = Math.floor((timeLeft % (1000 * 60)) / 1000);

                          return (
                            <div
                              key={task.id}
                              className={`bg-white dark:bg-stone-800 rounded-2xl p-4 border transition-all ${
                                isExpired
                                  ? "border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-900/10"
                                  : "border-stone-200 dark:border-stone-700 shadow-sm"
                              }`}
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                  {/* Creator Avatar */}
                                  {task.creatorAvatar ? (
                                    <Image
                                      src={task.creatorAvatar}
                                      alt={task.creatorUsername || "Creator"}
                                      width={40}
                                      height={40}
                                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-stone-800"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5A2B] to-[#FFA726] flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-stone-800">
                                      {task.creator?.charAt(0).toUpperCase() || "?"}
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {isExpired ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                          Expired - Ready to Settle
                                        </span>
                                      ) : task.proofText ? (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                          Proof Submitted
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                          {hours}h {mins}m {secs}s remaining
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-stone-800 dark:text-white text-base leading-tight truncate">
                                        {task.title}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                                      by @{task.creatorUsername || formatAddress(task.creator)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right ml-3">
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                    $
                                    {task.stake.toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </p>
                                  <p className="text-[10px] text-stone-400 uppercase">USDC</p>
                                </div>
                              </div>

                              {/* Action Button */}
                              {task.resolved && !task.userHasClaimed && task.stake > 0 ? (
                                <button
                                  onClick={() => handleClaim(task.id, task.currentUserVouchieIndex || 0)}
                                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20"
                                >
                                  Claim {task.successful ? "Refund" : "Share"} (+$
                                  {task.stake.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  })}
                                  ) <HandCoins size={18} weight="bold" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (canVerify || isExpired) {
                                      setSelectedVerificationGoal(task);
                                      setIsVerifyModalOpen(true);
                                    }
                                  }}
                                  disabled={!canVerify && !isExpired}
                                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                                    canVerify || isExpired
                                      ? "bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] text-white dark:text-stone-900"
                                      : "bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-not-allowed shadow-none border border-stone-200 dark:border-stone-700"
                                  }`}
                                >
                                  {isExpired ? (
                                    <Clock size={18} weight="fill" />
                                  ) : (
                                    <ShieldCheck size={18} weight="fill" />
                                  )}
                                  {isExpired ? "Review & Settle" : canVerify ? "Verify" : "Verification Locked"}
                                </button>
                              )}
                            </div>
                          );
                        });
                      })()}
                  </div>
                )}
              </div>
            )}

            {activeTab === "calendar" && (
              <CalendarView tasks={myCreatorGoals} vouchieGoals={vouchieGoals} onClaim={handleClaim} />
            )}
            {activeTab === "feed" && (
              <FriendActivityView
                creatorGoals={myCreatorGoals}
                vouchieGoals={vouchieGoals}
                onVerify={(g: Goal) => {
                  setSelectedVerificationGoal(g);
                  setIsVerifyModalOpen(true);
                }}
                onClaim={handleClaim}
              />
            )}
            {activeTab === "squad" && <VouchieView />}
            {activeTab === "profile" && <ProfileView />}
          </div>
        </div>

        {/* Desktop FAB */}
        <div className="hidden lg:block fixed bottom-10 right-10 z-50">
          <button
            onClick={() => !hasBlockingSettle && setAddModalOpen(true)}
            disabled={hasBlockingSettle}
            className={`relative w-16 h-16 rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(255,167,38,0.3)] group ${
              hasBlockingSettle ? "opacity-50 grayscale cursor-not-allowed" : "hover:scale-110"
            }`}
          >
            <div
              className={`absolute inset-[-100%] ${
                hasBlockingSettle
                  ? "bg-stone-400"
                  : "bg-[conic-gradient(from_90deg_at_50%_50%,#1F1F1F_0%,#FFA726_50%,#1F1F1F_100%)] animate-[spin_2s_linear_infinite]"
              }`}
            />
            <div className="absolute inset-[2px] bg-white dark:bg-[#1F1F1F] rounded-[14px] flex items-center justify-center z-10">
              <Plus size={32} weight="bold" className="text-[#8B5A2B] dark:text-[#FFA726]" />
            </div>
          </button>
        </div>

        {/* Bottom Nav (Mobile) - FAB integrated in center, hidden when keyboard is open */}
        <div
          className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-stone-900/95 backdrop-blur-lg border-t border-stone-100 dark:border-stone-800 flex items-center justify-around px-4 z-40 transition-transform duration-200 ${isKeyboardOpen ? "translate-y-full" : "translate-y-0"}`}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === "dashboard" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
          >
            <House size={22} weight={activeTab === "dashboard" ? "fill" : "bold"} />
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === "calendar" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
          >
            <CalendarBlank size={22} weight={activeTab === "calendar" ? "fill" : "bold"} />
          </button>
          {/* Center FAB in nav */}
          <button
            onClick={() => !hasBlockingSettle && setAddModalOpen(true)}
            disabled={hasBlockingSettle}
            className={`relative w-14 h-14 rounded-xl overflow-hidden transition-all duration-300 shadow-[0_0_15px_rgba(255,167,38,0.3)] -mt-4 group ${
              hasBlockingSettle ? "opacity-50 grayscale cursor-not-allowed" : "hover:scale-105"
            }`}
          >
            <div
              className={`absolute inset-[-100%] ${
                hasBlockingSettle
                  ? "bg-stone-400"
                  : "bg-[conic-gradient(from_90deg_at_50%_50%,#1F1F1F_0%,#FFA726_50%,#1F1F1F_100%)] animate-[spin_2s_linear_infinite]"
              }`}
            />
            <div className="absolute inset-[2px] bg-white dark:bg-[#1F1F1F] rounded-[10px] flex items-center justify-center z-10">
              <Plus size={28} weight="bold" className="text-[#8B5A2B] dark:text-[#FFA726]" />
            </div>
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`relative flex flex-col items-center justify-center w-12 h-12 ${activeTab === "feed" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
          >
            <Compass size={22} weight={activeTab === "feed" ? "fill" : "bold"} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === "profile" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
          >
            <User size={22} weight={activeTab === "profile" ? "fill" : "bold"} />
          </button>
        </div>

        {/* Modals */}
        <AddModal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAdd} />

        <TaskDetailModal
          isOpen={!!selectedTaskForDetails}
          goal={selectedTaskForDetails}
          onClose={() => setSelectedTaskForDetails(null)}
          onSubmit={handleSubmitProof}
          onGiveUp={handleGiveUp}
          onExtend={handleExtend}
          onComposeCast={composeCast}
          onSettle={handleSettle}
          onClaim={handleClaim}
        />

        <GiveUpModal
          isOpen={!!selectedTaskForGiveUp}
          goal={selectedTaskForGiveUp}
          onClose={() => setSelectedTaskForGiveUp(null)}
          onConfirmGiveUp={handleConfirmGiveUp}
          onExtend={handleExtend}
        />

        <StartTaskModal
          isOpen={!!selectedTaskForStart}
          goal={selectedTaskForStart}
          onClose={() => setSelectedTaskForStart(null)}
          onStart={handleStartTask}
        />

        <VerifyModal
          isOpen={isVerifyModalOpen}
          goal={selectedVerificationGoal}
          onClose={() => {
            setIsVerifyModalOpen(false);
            setSelectedVerificationGoal(null);
          }}
          onVote={handleVote}
          onSettle={handleSettle}
        />

        {/* Background Blobs */}
        <div className="fixed top-20 right-0 w-64 h-64 bg-[#8B5A2B] rounded-full blur-[100px] opacity-10 pointer-events-none -z-10" />
        <div className="fixed bottom-20 left-0 w-64 h-64 bg-[#FFA726] rounded-full blur-[80px] opacity-10 pointer-events-none -z-10" />
      </main>
    </div>
  );
};

export default VouchieApp;

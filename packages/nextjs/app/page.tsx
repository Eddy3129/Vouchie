"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CalendarBlank,
  CheckCircle,
  Compass,
  House,
  Plus,
  Quotes,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from "@phosphor-icons/react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { toast } from "react-hot-toast";
import { parseUnits } from "viem";
import { erc20Abi } from "viem";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import CalendarView from "~~/components/vouchie/CalendarView";
import FriendActivityView from "~~/components/vouchie/FriendActivityView";
import GoalCard from "~~/components/vouchie/GoalCard";
import FontStyles from "~~/components/vouchie/Helper/FontStyles";
import AddModal from "~~/components/vouchie/Modals/AddModal";
import GiveUpModal from "~~/components/vouchie/Modals/GiveUpModal";
import StartTaskModal from "~~/components/vouchie/Modals/StartTaskModal";
import TaskDetailModal from "~~/components/vouchie/Modals/TaskDetailModal";
import VerifyModal from "~~/components/vouchie/Modals/VerifyModal";
import ProfileView from "~~/components/vouchie/ProfileView";
import SplashScreen from "~~/components/vouchie/SplashScreen";
import VouchieView from "~~/components/vouchie/VouchieView";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
  useTargetNetwork,
} from "~~/hooks/scaffold-eth";
import { useFamousQuotes } from "~~/hooks/vouchie/useFamousQuotes";
import { useVouchieData } from "~~/hooks/vouchie/useVouchieData";
import { CANCEL_GRACE_PERIOD_MS, Goal, LongTermGoal } from "~~/types/vouchie";
import { buildGoalCreatedCast } from "~~/utils/castHelpers";

const MOCK_LONG_TERM: LongTermGoal[] = [
  {
    id: 101,
    title: "Become a Web3 Dev",
    icon: "🚀",
    color: "bg-white",
    deadline: new Date("2025-12-31"),
    routines: [
      { id: 1, text: "Daily Solidity Practice", done: true, frequency: "Daily" },
      { id: 2, text: "Read Whitepaper", done: false, frequency: "Weekly" },
      { id: 3, text: "Build dApp", done: false, frequency: "Monthly" },
    ],
  },
];

const VouchieApp = () => {
  const { address } = useAccount();
  const { context, composeCast } = useMiniapp();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardTab, setDashboardTab] = useState<"tasks" | "verify">("tasks");
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
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
    if (typeof window === "undefined" || typeof visualViewport === "undefined") return;

    const handleResize = () => {
      // If viewport height is significantly less than window height, keyboard is likely open
      const viewportHeight = visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      const threshold = windowHeight * 0.75; // Keyboard typically takes 25%+ of screen
      setIsKeyboardOpen(viewportHeight < threshold);
    };

    visualViewport?.addEventListener("resize", handleResize);
    return () => visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  // Selection States
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Goal | null>(null);
  const [selectedTaskForStart, setSelectedTaskForStart] = useState<Goal | null>(null);
  const [selectedTaskForGiveUp, setSelectedTaskForGiveUp] = useState<Goal | null>(null);
  const [selectedVerificationGoal, setSelectedVerificationGoal] = useState<Goal | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  // Data Hook
  const { goals, verificationGoals, loading, refresh, updateGoal } = useVouchieData();
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>(MOCK_LONG_TERM);

  // Quotes
  const { dailyQuote } = useFamousQuotes();

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
  const { writeContractAsync: batchResolveGoals } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: claimGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { writeContractAsync: vote } = useScaffoldWriteContract({ contractName: "VouchieVault" });

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
    if (formData.type === "goal") {
      setLongTermGoals([
        ...longTermGoals,
        {
          id: Date.now(),
          title: formData.title,
          icon: "✨",
          color: "bg-white",
          deadline: new Date(formData.goalDeadline),
          routines: [
            { id: 1, text: "Daily Task", done: false, frequency: "Daily" },
            { id: 2, text: "Weekly Check-in", done: false, frequency: "Weekly" },
          ],
        },
      ]);
    } else {
      try {
        const stakeAmount = parseUnits(formData.stake.toString(), usdcDecimals);
        const durationSeconds =
          formData.durationSeconds ||
          (formData.deadline === "1h" ? 3600 : formData.deadline === "24h" ? 86400 : 604800);
        const vouchies =
          formData.mode === "Vouchie"
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

        // Step 2: Create the goal (shows single success notification)
        await createGoal({
          functionName: "createGoal",
          args: [stakeAmount, BigInt(durationSeconds), formData.title, vouchies as any[]],
        });
        refresh();
        refetchBalance();

        // Step 3: Prompt user to share on Farcaster with dynamic OG embed
        const appUrl = typeof window !== "undefined" ? window.location.origin : "https://vouchie.app";
        const deadlineTimestamp = Date.now() + durationSeconds * 1000;

        // Get the next goal ID (we just created it, so it should be the latest)
        // For now, use timestamp as a temporary ID since we don't have the real one yet
        const tempGoalId = Date.now();

        const castContent = buildGoalCreatedCast(appUrl, {
          goalId: tempGoalId,
          title: formData.title,
          stake: formData.stake,
          deadline: deadlineTimestamp,
          username: context?.user?.username || "",
          mode: formData.vouchies?.length > 0 ? "Squad" : "Solo",
          vouchieUsernames: formData.vouchies?.map((v: { username?: string }) => v.username).filter(Boolean) || [],
        });

        composeCast(castContent);
      } catch (e) {
        console.error("Error creating goal:", e);
      }
    }
  };

  const handleStartTask = (goalId: number, image: string | null) => {
    setSelectedTaskForStart(null);
    console.log("Started task:", goalId, image);
  };

  const handleSubmitProof = async (goalId: number, _proof: string) => {
    const goal = goals.find(g => g.id === goalId);
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
    setSelectedTaskForGiveUp(goals.find(g => g.id === goalId) || null);
  };

  const handleConfirmGiveUp = async (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
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
    const goal = verificationGoals.find(g => g.id === goalId);
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
    }
  };

  // Auto-resolve goals that are past deadline (triggers on-chain liquidation)
  const autoResolveExpiredGoals = useCallback(async () => {
    const now = Date.now();
    // Find goals past deadline that haven't been resolved yet (status="failed" with deadline < now)
    const unresolvedExpired = goals.filter(g => g.status === "failed" && g.deadline < now);
    if (unresolvedExpired.length === 0) return;

    const expiredIds = unresolvedExpired.map(g => BigInt(g.id));

    try {
      await batchResolveGoals({
        functionName: "batchResolve",
        args: [expiredIds],
      });
      refresh();
    } catch (e) {
      // Likely already resolved on-chain, just refresh
      console.error("Error batch resolving goals:", e);
      refresh();
    }
  }, [goals, batchResolveGoals, refresh]);

  // Auto-resolve expired goals when detected
  useEffect(() => {
    const now = Date.now();
    const hasUnresolvedExpired = goals.some(g => g.status === "failed" && g.deadline < now);
    if (hasUnresolvedExpired && !loading) {
      autoResolveExpiredGoals();
    }
  }, [goals, loading, autoResolveExpiredGoals]);

  return (
    <>
      {showSplash ? (
        <SplashScreen
          onComplete={() => {
            setShowSplash(false);
          }}
        />
      ) : (
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
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scroll-smooth px-6 pb-24 lg:px-8 lg:pb-8">
              <div className="max-w-4xl mx-auto pt-6">
                {activeTab === "dashboard" && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Hero Quote Section */}
                    {/* Hero Quote Section */}
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#FAF7F2] via-white to-[#F5EFE6] dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 shadow-sm border border-stone-200 dark:border-stone-800">
                      {/* Subtle warm gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-[#8B5A2B]/10 via-transparent to-[#8B5A2B]/5" />

                      {/* Ghost silhouette - faded, bleeds off edge */}
                      <div className="absolute -right-6 bottom-0 w-40 h-full opacity-[0.12] pointer-events-none flex items-end justify-center">
                        <Image
                          src={dailyQuote.silhouette}
                          alt=""
                          width={160}
                          height={160}
                          className="max-w-full max-h-full object-contain object-bottom"
                          priority
                          sizes="160px"
                        />
                      </div>

                      {/* Content */}
                      <div className="relative p-4 pr-16">
                        {/* Quote mark */}
                        <Quotes
                          className="absolute top-3 left-3 text-[#FFA726]/40 dark:text-[#FFA726]/20"
                          size={24}
                          weight="fill"
                        />

                        {/* Quote text */}
                        <p
                          className="text-stone-800 dark:text-white/90 text-sm leading-relaxed pl-5 italic"
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {dailyQuote.text}
                        </p>

                        {/* Author */}
                        <p className="text-[#8B5A2B] dark:text-[#FFA726]/80 text-[10px] mt-2 font-bold tracking-widest uppercase pl-5">
                          — {dailyQuote.author}
                        </p>
                      </div>
                    </div>

                    {/* Connect Wallet CTA (if not connected and no Farcaster auth) */}
                    {!address && !context?.user?.primaryAddress && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#FAF7F2]/80 dark:bg-stone-900/80 backdrop-blur-md transition-all duration-500">
                        <div className="bg-white dark:bg-stone-800 rounded-[32px] p-8 shadow-2xl border border-stone-100 dark:border-stone-700 animate-in fade-in zoom-in-95 duration-500 max-w-sm w-full relative overflow-hidden">
                          {/* Decorative gradient blob */}
                          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-orange-50/50 dark:from-orange-900/10 to-transparent pointer-events-none" />

                          <div className="relative flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#8B5A2B] to-[#FFA726] flex items-center justify-center mb-6 shadow-xl ring-8 ring-orange-50 dark:ring-orange-900/20">
                              <Wallet size={40} weight="fill" className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-3">
                              Start Your Journey
                            </h2>
                            <p className="text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">
                              Connect your wallet to set goals, stake USDC, and make your life more productive today!
                            </p>
                            <ConnectButton.Custom>
                              {({ openConnectModal, mounted }) => {
                                const ready = mounted;
                                return (
                                  <button
                                    onClick={openConnectModal}
                                    disabled={!ready}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] hover:from-[#956A4A] hover:to-[#7A4A1B] dark:hover:from-[#E68A00] dark:hover:to-[#E67E00] text-white dark:text-stone-900 font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                                  >
                                    <Wallet size={24} weight="fill" />
                                    Connect Wallet
                                  </button>
                                );
                              }}
                            </ConnectButton.Custom>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dashboard Tabs */}
                    <div className="flex gap-2 mb-6">
                      <button
                        onClick={() => setDashboardTab("tasks")}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          dashboardTab === "tasks"
                            ? "bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900 shadow-lg"
                            : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                        }`}
                      >
                        📋 My Tasks
                        {goals.filter(t => t.status !== "done" && t.status !== "failed").length > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              dashboardTab === "tasks"
                                ? "bg-white/20 text-white dark:text-stone-900"
                                : "bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300"
                            }`}
                          >
                            {goals.filter(t => t.status !== "done" && t.status !== "failed").length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setDashboardTab("verify")}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                          dashboardTab === "verify"
                            ? "bg-blue-500 text-white shadow-lg"
                            : "bg-white dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700"
                        }`}
                      >
                        🛡️ Verify
                        {verificationGoals.length > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              dashboardTab === "verify"
                                ? "bg-white/20 text-white"
                                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {verificationGoals.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Task List Tab */}
                    {dashboardTab === "tasks" && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {/* Empty State */}
                        {!loading &&
                          address &&
                          goals.filter(t => t.status !== "done" && t.status !== "failed").length === 0 && (
                            <div className="p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-800/50">
                              <p className="text-stone-400 font-bold text-lg mb-2">
                                Woohoo! No pending tasks! <span className="text-2xl ml-1">🎉</span>
                              </p>
                              <p className="text-stone-400 text-sm">Use the + button to create a new goal.</p>
                            </div>
                          )}

                        {/* Today's Tasks */}
                        {!loading &&
                          (() => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const dayAfter = new Date(tomorrow);
                            dayAfter.setDate(dayAfter.getDate() + 1);

                            const activeGoals = goals.filter(t => t.status !== "done" && t.status !== "failed");
                            const todayGoals = activeGoals.filter(t => {
                              const deadline = new Date(t.deadline);
                              return deadline >= today && deadline < tomorrow;
                            });
                            const tomorrowGoals = activeGoals.filter(t => {
                              const deadline = new Date(t.deadline);
                              return deadline >= tomorrow && deadline < dayAfter;
                            });
                            const otherGoals = activeGoals.filter(t => {
                              const deadline = new Date(t.deadline);
                              return deadline >= dayAfter;
                            });

                            return (
                              <>
                                {todayGoals.length > 0 && (
                                  <div>
                                    <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">
                                      📅 Today
                                    </h3>
                                    <div className="space-y-3">
                                      {todayGoals.map(task => (
                                        <GoalCard
                                          key={task.id}
                                          goal={task}
                                          onStart={setSelectedTaskForStart}
                                          onViewDetails={setSelectedTaskForDetails}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {tomorrowGoals.length > 0 && (
                                  <div>
                                    <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">
                                      🌅 Tomorrow
                                    </h3>
                                    <div className="space-y-3">
                                      {tomorrowGoals.map(task => (
                                        <GoalCard
                                          key={task.id}
                                          goal={task}
                                          onStart={setSelectedTaskForStart}
                                          onViewDetails={setSelectedTaskForDetails}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {otherGoals.length > 0 && (
                                  <div>
                                    <h3 className="text-sm font-bold text-stone-500 dark:text-stone-400 mb-3 uppercase tracking-wider">
                                      📆 Later
                                    </h3>
                                    <div className="space-y-3">
                                      {otherGoals.map(task => (
                                        <GoalCard
                                          key={task.id}
                                          goal={task}
                                          onStart={setSelectedTaskForStart}
                                          onViewDetails={setSelectedTaskForDetails}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}

                        {/* Completed Section */}
                        {!loading && goals.filter(t => t.status === "done").length > 0 && (
                          <div className="pt-6 border-t border-stone-200 dark:border-stone-700">
                            <h4 className="text-stone-400 font-bold mb-4 text-xs uppercase tracking-wider flex items-center gap-2">
                              <CheckCircle size={14} weight="fill" /> Completed
                            </h4>
                            {goals
                              .filter(t => t.status === "done")
                              .map(task => (
                                <div
                                  key={task.id}
                                  className="p-4 bg-white dark:bg-stone-800 rounded-2xl opacity-60 mb-3 flex items-center gap-3 border border-stone-100 dark:border-stone-700 shadow-sm grayscale transition-all hover:grayscale-0 hover:opacity-100"
                                >
                                  <CheckCircle size={20} className="text-green-500 flex-shrink-0" weight="fill" />
                                  <div>
                                    <p className="font-bold text-stone-600 dark:text-stone-300 line-through decoration-stone-400 decoration-2">
                                      {task.title}
                                    </p>
                                    <p className="text-xs text-stone-400 font-bold mt-0.5">Completed</p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verify Tab */}
                    {dashboardTab === "verify" && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                        {/* Empty State */}
                        {!loading && verificationGoals.length === 0 && (
                          <div className="p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-800/50">
                            <div className="text-4xl mb-4">🛡️</div>
                            <p className="text-stone-400 font-bold text-lg mb-2">No verifications pending</p>
                            <p className="text-stone-400 text-sm">
                              When someone adds you as a vouchie, their goals will appear here for you to verify.
                            </p>
                          </div>
                        )}

                        {/* Verification Cards */}
                        {!loading &&
                          verificationGoals.map(task => (
                            <div
                              key={task.id}
                              className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-200 dark:border-stone-700 shadow-sm"
                            >
                              {/* Header */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                      Pending Verification
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-stone-800 dark:text-white text-lg leading-tight">
                                    {task.title}
                                  </h4>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">${task.stake}</p>
                                  <p className="text-[10px] text-stone-400 uppercase">USDC</p>
                                </div>
                              </div>

                              {/* Creator Info */}
                              <div className="flex items-center gap-2 mb-4 text-sm text-stone-500 dark:text-stone-400">
                                <span>Created by</span>
                                <span className="font-bold text-stone-700 dark:text-stone-300">
                                  @{task.creatorUsername || task.creator?.slice(0, 8) || "unknown"}
                                </span>
                              </div>

                              {/* Action Button */}
                              <button
                                onClick={() => {
                                  setSelectedVerificationGoal(task);
                                  setIsVerifyModalOpen(true);
                                }}
                                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                              >
                                <ShieldCheck size={18} weight="fill" />
                                Review & Verify
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "calendar" && <CalendarView tasks={goals} />}
                {activeTab === "feed" && <FriendActivityView />}
                {activeTab === "squad" && <VouchieView />}
                {activeTab === "profile" && <ProfileView />}
              </div>
            </div>

            {/* Desktop FAB */}
            <div className="hidden lg:block fixed bottom-10 right-10 z-50">
              <button
                onClick={() => setAddModalOpen(true)}
                className="relative w-16 h-16 rounded-2xl overflow-hidden hover:scale-110 transition-all duration-300 shadow-[0_0_15px_rgba(255,167,38,0.3)] group"
              >
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#1F1F1F_0%,#FFA726_50%,#1F1F1F_100%)] animate-[spin_2s_linear_infinite]" />
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
                onClick={() => setAddModalOpen(true)}
                className="relative w-14 h-14 rounded-xl overflow-hidden hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(255,167,38,0.3)] -mt-4 group"
              >
                <div className="absolute inset-[-100%] bg-[conic-gradient(from_90deg_at_50%_50%,#1F1F1F_0%,#FFA726_50%,#1F1F1F_100%)] animate-[spin_2s_linear_infinite]" />
                <div className="absolute inset-[2px] bg-white dark:bg-[#1F1F1F] rounded-[10px] flex items-center justify-center z-10">
                  <Plus size={28} weight="bold" className="text-[#8B5A2B] dark:text-[#FFA726]" />
                </div>
              </button>
              <button
                onClick={() => setActiveTab("feed")}
                className={`flex flex-col items-center justify-center w-12 h-12 ${activeTab === "feed" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
              >
                <Compass size={22} weight={activeTab === "feed" ? "fill" : "bold"} />
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
            />

            {/* Background Blobs */}
            <div className="fixed top-20 right-0 w-64 h-64 bg-[#8B5A2B] rounded-full blur-[100px] opacity-10 pointer-events-none -z-10" />
            <div className="fixed bottom-20 left-0 w-64 h-64 bg-[#FFA726] rounded-full blur-[80px] opacity-10 pointer-events-none -z-10" />
          </main>
        </div>
      )}
    </>
  );
};

export default VouchieApp;

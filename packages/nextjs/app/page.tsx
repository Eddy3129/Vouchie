"use client";

import React, { useState } from "react";
import {
  Bell,
  CalendarBlank,
  CheckCircle,
  Clock,
  Compass,
  House,
  List,
  Plus,
  Quotes,
  Star,
  TrendUp,
  User,
  Users,
} from "@phosphor-icons/react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import CalendarView from "~~/components/vouchie/CalendarView";
import DirectionView from "~~/components/vouchie/DirectionView";
import GoalCard from "~~/components/vouchie/GoalCard";
import FontStyles from "~~/components/vouchie/Helper/FontStyles";
import LoadingState from "~~/components/vouchie/LoadingState";
import AddModal from "~~/components/vouchie/Modals/AddModal";
import StartTaskModal from "~~/components/vouchie/Modals/StartTaskModal";
import TaskDetailModal from "~~/components/vouchie/Modals/TaskDetailModal";
import ProfileView from "~~/components/vouchie/ProfileView";
import SplashScreen from "~~/components/vouchie/SplashScreen";
import Timeline from "~~/components/vouchie/Timeline";
import VouchieView from "~~/components/vouchie/VouchieView";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useFamousQuotes } from "~~/hooks/vouchie/useFamousQuotes";
import { useLockiData } from "~~/hooks/vouchie/useLockiData";
import { Goal, LongTermGoal } from "~~/types/vouchie";

const MOCK_PROFILES = [
  {
    id: 1,
    name: "You",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
    avatarColor: "#8B5A2B",
    score: 2450,
    status: "online",
  },
  {
    id: 2,
    name: "Pudding",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pudding",
    avatarColor: "#A67B5B",
    score: 2100,
    status: "offline",
  },
  {
    id: 3,
    name: "Bunny",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bunny",
    avatarColor: "#FFA726",
    score: 1850,
    status: "online",
  },
];

const MOCK_STATS = {
  tasksCompleted: 42,
  usdcSaved: 350,
  streak: 12,
  reputation: 98,
};

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

const LockiApp = () => {
  useAccount();
  const { context } = useMiniapp();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isTimelineView, setIsTimelineView] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Selection States
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Goal | null>(null);
  const [selectedTaskForStart, setSelectedTaskForStart] = useState<Goal | null>(null);

  // Data Hook
  const { goals, loading, refresh } = useLockiData();
  const [longTermGoals, setLongTermGoals] = useState<LongTermGoal[]>(MOCK_LONG_TERM);

  // Quotes
  const { dailyQuote } = useFamousQuotes();

  // Contract Writes
  const { writeContractAsync: createGoal } = useScaffoldWriteContract("VouchieVault");
  const { writeContractAsync: verifySolo } = useScaffoldWriteContract("VouchieVault");
  const { writeContractAsync: streakFreeze } = useScaffoldWriteContract("VouchieVault");
  const { writeContractAsync: cancelGoal } = useScaffoldWriteContract("VouchieVault");

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
        const durationSeconds =
          formData.durationSeconds ||
          (formData.deadline === "1h" ? 3600 : formData.deadline === "24h" ? 86400 : 604800);
        const vouchies = formData.mode === "Vouchie" ? ["0x123..."] : [];

        await createGoal({
          functionName: "createGoal",
          args: [parseEther(formData.stake.toString()), BigInt(durationSeconds), formData.title, vouchies as any[]],
        });
        refresh();
      } catch (e) {
        console.error("Error creating goal:", e);
      }
    }
  };

  const handleStartTask = (goalId: number, image: string | null) => {
    setSelectedTaskForStart(null);
    console.log("Started task:", goalId, image);
  };

  const handleSubmitProof = async (goalId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    try {
      if (goal.mode === "Solo") {
        await verifySolo({
          functionName: "verifySolo",
          args: [BigInt(goalId)],
        });
      } else {
        alert("Proof submitted to Vouchie! Waiting for votes.");
      }
      refresh();
      setSelectedTaskForDetails(null);
    } catch (e) {
      console.error("Error submitting proof:", e);
    }
  };

  const handleGiveUp = async (goalId: number) => {
    try {
      await cancelGoal({
        functionName: "cancelGoal",
        args: [BigInt(goalId)],
      });
      refresh();
      setSelectedTaskForDetails(null);
    } catch (e) {
      console.error("Error cancelling goal:", e);
    }
  };

  const handleExtend = async (goalId: number) => {
    try {
      await streakFreeze({
        functionName: "streakFreeze",
        args: [BigInt(goalId)],
      });
      refresh();
      setSelectedTaskForDetails(null);
    } catch (e) {
      console.error("Error extending goal:", e);
    }
  };

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
              <div className="w-10 h-10 rounded-2xl bg-[#8B5A2B] flex items-center justify-center text-white shadow-lg hover-lift">
                <Star size={24} weight="fill" />
              </div>
              <span className="text-2xl font-bold text-[#8B5A2B] dark:text-[#FFA726]">Vouchie</span>
            </div>
            <nav className="space-y-2">
              {[
                { id: "dashboard", icon: House, label: "Home" },
                { id: "calendar", icon: CalendarBlank, label: "Calendar" },
                { id: "direction", icon: Compass, label: "Direction" },
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
            {/* Header */}
            <div className="h-20 flex items-center justify-between px-6 pt-4 lg:pt-0 flex-shrink-0 z-10">
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#8B5A2B] text-white flex items-center justify-center">
                  <Star size={18} weight="fill" />
                </div>
                <span className="text-xl font-bold text-[#8B5A2B] dark:text-[#FFA726]">Vouchie</span>
              </div>
              <div className="flex items-center gap-3 ml-auto">
                <button className="w-10 h-10 rounded-full bg-white dark:bg-stone-800 shadow-sm flex items-center justify-center text-stone-400 hover:text-[#8B5A2B] dark:hover:text-[#FFA726]">
                  <Bell size={20} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-4 pb-32 lg:px-8 lg:pb-8">
              <div className="max-w-3xl mx-auto pt-2">
                {activeTab === "dashboard" && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <header>
                      <h1 className="text-3xl font-bold text-stone-800 dark:text-stone-100">
                        Hi, There! <span className="text-xs ml-1 opacity-80">👋</span>
                      </h1>
                    </header>

                    {/* Motivation Banner */}
                    <div className="bg-gradient-to-r from-[#8B5A2B] to-[#A67B5B] rounded-2xl p-6 text-white shadow-lg shadow-stone-200 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl" />
                      <Quotes className="absolute top-4 right-4 opacity-20 transform rotate-180" size={32} />
                      <p className="font-bold text-sm relative z-10 leading-snug">&quot;{dailyQuote.text}&quot;</p>
                      <p className="text-xs text-stone-200 mt-2 italic relative z-10">- {dailyQuote.author}</p>
                      <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#8B5A2B]">
                        <TrendUp size={14} /> Daily Wisdom
                      </div>
                    </div>

                    <div className="flex">
                      {/* Vertical Timeline - Visible if toggled or on Desktop */}
                      <div className={`${isTimelineView ? "block" : "hidden"} sm:block`}>
                        <Timeline />
                      </div>

                      {/* Task List */}
                      <div className="flex-1 grid gap-4">
                        <div className="flex justify-between items-center mb-2 pl-2 pr-2">
                          <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider">
                            Trajectory of the Day
                          </h3>
                          <button
                            onClick={() => setIsTimelineView(!isTimelineView)}
                            className="p-1.5 rounded-lg bg-white/50 text-stone-400 hover:bg-white hover:text-[#8B5A2B] transition-colors sm:hidden"
                          >
                            {isTimelineView ? <List size={18} /> : <Clock size={18} />}
                          </button>
                        </div>

                        {loading && <LoadingState variant="full" text="Loading goals..." />}

                        {!loading && goals.length === 0 && (
                          <div className="p-8 text-center text-stone-400 font-bold border-2 border-dashed border-stone-200 rounded-2xl">
                            No active goals. Start one! <span className="text-xs ml-1">🚀</span>
                          </div>
                        )}

                        {!loading &&
                          goals
                            .filter(t => t.status !== "done" && t.status !== "failed")
                            .map(task => (
                              <GoalCard
                                key={task.id}
                                goal={task}
                                onStart={setSelectedTaskForStart}
                                onViewDetails={setSelectedTaskForDetails}
                              />
                            ))}

                        {!loading && goals.filter(t => t.status === "done").length > 0 && (
                          <div className="pt-4 border-t border-stone-200">
                            <h4 className="text-stone-400 font-bold mb-2 text-sm pl-2">Completed</h4>
                            {goals
                              .filter(t => t.status === "done")
                              .map(task => (
                                <div
                                  key={task.id}
                                  className="p-4 bg-white rounded-2xl opacity-60 mb-2 flex items-center gap-2 border border-stone-100 shadow-sm"
                                >
                                  <CheckCircle size={16} className="text-green-500" />
                                  <span className="font-bold text-stone-500 line-through decoration-2 decoration-stone-400">
                                    {task.title}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "calendar" && <CalendarView tasks={goals} />}
                {activeTab === "direction" && (
                  <DirectionView longTermGoals={longTermGoals} setLongTermGoals={setLongTermGoals} />
                )}
                {activeTab === "squad" && <VouchieView />}
                {activeTab === "profile" && (
                  <ProfileView user={MOCK_PROFILES[0]} stats={MOCK_STATS} leaderboard={MOCK_PROFILES} />
                )}
              </div>
            </div>

            {/* Floating Action Button (Centered) */}
            <div className="fixed bottom-16 left-1/2 -translate-x-1/2 lg:left-auto lg:translate-x-0 lg:bottom-10 lg:right-10 z-50">
              <button
                onClick={() => setAddModalOpen(true)}
                className="w-16 h-16 bg-[#8B5A2B] text-white rounded-2xl shadow-xl hover:bg-[#6B4423] hover:scale-110 transition-all duration-300 flex items-center justify-center border-4 border-[#FAF7F2] lg:border-0"
              >
                <Plus size={32} strokeWidth={3} />
              </button>
            </div>

            {/* Bottom Nav (Mobile) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-stone-900/90 backdrop-blur-lg border-t border-stone-100 dark:border-stone-800 flex justify-between items-center px-6 pb-2 z-40">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex flex-col items-center gap-1 ${activeTab === "dashboard" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
              >
                <House size={24} weight={activeTab === "dashboard" ? "fill" : "bold"} />
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={`flex flex-col items-center gap-1 ${activeTab === "calendar" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
              >
                <CalendarBlank size={24} weight={activeTab === "calendar" ? "fill" : "bold"} />
              </button>
              <div className="w-8"></div> {/* Spacer for FAB */}
              <button
                onClick={() => setActiveTab("direction")}
                className={`flex flex-col items-center gap-1 ${activeTab === "direction" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
              >
                <Compass size={24} weight={activeTab === "direction" ? "fill" : "bold"} />
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex flex-col items-center gap-1 ${activeTab === "profile" ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-400"}`}
              >
                <User size={24} weight={activeTab === "profile" ? "fill" : "bold"} />
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
            />

            <StartTaskModal
              isOpen={!!selectedTaskForStart}
              goal={selectedTaskForStart}
              onClose={() => setSelectedTaskForStart(null)}
              onStart={handleStartTask}
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

export default LockiApp;

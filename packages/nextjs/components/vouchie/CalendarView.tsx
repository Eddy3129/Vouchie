import React, { useState } from "react";
import Image from "next/image";
import { Goal } from "../../types/vouchie";
import Card from "./Helper/Card";
import { Bank, CalendarPlus, CaretLeft, CaretRight, HandCoins } from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { useScaffoldWriteContract, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useActivities } from "~~/hooks/vouchie/usePonderData";
import { useVouchieData } from "~~/hooks/vouchie/useVouchieData";

interface CalendarViewProps {
  tasks: Goal[];
  onTaskClick?: (goal: Goal) => void;
}

const CalendarView = ({ tasks }: CalendarViewProps) => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const { refresh } = useVouchieData();
  const { writeContractAsync: claimGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });
  const { data: activities } = useActivities(50);
  const { targetNetwork } = useTargetNetwork();
  const decimals = targetNetwork.id === 31337 ? 18 : 6;

  // Helper to find original stake from activities
  const getOriginalStake = (goalId: number, currentStake: number) => {
    if (currentStake > 0) return currentStake;
    const activity = activities?.find(a => Number(a.goalId) === goalId && a.type === "goal_created");
    if (activity) {
      return Number(formatUnits(BigInt(activity.stakeAmount || 0), decimals));
    }
    return 0;
  };

  const handleClaim = async (e: React.MouseEvent, goalId: number) => {
    e.stopPropagation(); // Don't open details modal when claiming
    try {
      await claimGoal({
        functionName: "claim",
        args: [BigInt(goalId), BigInt(0)],
      });
      refresh();
    } catch (e) {
      console.error("Error claiming goal:", e);
    }
  };

  // Get month details
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();

  // Get first day of month and total days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build calendar grid (6 weeks max)
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }
  // Fill remaining cells to complete the grid
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  // Get tasks for a specific day
  const getTasksForDay = (day: number) => {
    const startOfDay = new Date(year, month, day, 0, 0, 0).getTime();
    const endOfDay = new Date(year, month, day, 23, 59, 59).getTime();
    return tasks.filter(t => t.deadline >= startOfDay && t.deadline <= endOfDay);
  };

  // Check if day has tasks
  const dayHasTasks = (day: number) => getTasksForDay(day).length > 0;

  // Get task status for day indicator color
  const getDayStatus = (day: number) => {
    const dayTasks = getTasksForDay(day);
    if (dayTasks.length === 0) return null;
    if (dayTasks.some(t => t.status === "failed")) return "failed";
    if (dayTasks.every(t => t.status === "done")) return "done";
    return "active";
  };

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const upcomingTasks = tasks.filter(t => t.status !== "done" && t.status !== "failed");
  const pastTasks = tasks.filter(t => t.status === "done" || t.status === "failed");

  const getDurationLeft = (deadline: number) => {
    const now = new Date().getTime();
    const diff = deadline - now;
    if (diff <= 0) return "Overdue";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayedTasks = activeTab === "upcoming" ? upcomingTasks : pastTasks;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-baseline gap-2">
            {monthName} <span className="text-sm text-stone-400 font-semibold">{year}</span>
          </h2>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 bg-white dark:bg-stone-800 rounded-lg shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300 border border-stone-100 dark:border-stone-700"
          >
            <CaretLeft size={16} weight="bold" />
          </button>
          <button
            onClick={goToToday}
            className="p-1.5 bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900 rounded-lg shadow-sm hover:bg-[#6B4423] dark:hover:bg-[#FF9800] transition-colors"
          >
            <CalendarPlus size={16} weight="fill" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1.5 bg-white dark:bg-stone-800 rounded-lg shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300 border border-stone-100 dark:border-stone-700"
          >
            <CaretRight size={16} weight="bold" />
          </button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid grid-cols-7 mb-4">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center font-bold text-stone-400 text-xs">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, i) => {
            const isToday = isCurrentMonth && day === todayDate;
            const status = day ? getDayStatus(day) : null;
            const hasTasks = day ? dayHasTasks(day) : false;

            return (
              <div
                key={i}
                onClick={() => {
                  if (day && hasTasks) {
                    const dayTasks = getTasksForDay(day);
                    if (dayTasks.length > 0) {
                      setActiveTab(
                        dayTasks[0].status === "pending" || dayTasks[0].status === "in_progress" ? "upcoming" : "past",
                      );
                      setExpandedTaskId(dayTasks[0].id);
                    }
                  }
                }}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all duration-200
                  ${!day ? "" : hasTasks ? "cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800/80 active:scale-95 shadow-sm" : "cursor-default opacity-40"}
                  ${isToday ? "bg-[#8B5A2B] dark:bg-[#FFA726] !opacity-100 text-white dark:text-stone-900 shadow-md z-10 scale-105" : "text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-800"}
                  ${hasTasks && !isToday ? "border border-stone-200 dark:border-stone-700" : ""}
                `}
              >
                <span className={`font-bold text-sm ${isToday ? "text-white dark:text-stone-900" : ""}`}>{day}</span>
                {hasTasks && (
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      status === "done"
                        ? "bg-green-500"
                        : status === "failed"
                          ? "bg-red-500"
                          : isToday
                            ? "bg-white dark:bg-stone-900"
                            : "bg-orange-500"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="space-y-3">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-stone-200 dark:border-stone-700 mb-4 px-2">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`pb-2 text-sm font-bold transition-colors relative ${
              activeTab === "upcoming"
                ? "text-[#8B5A2B] dark:text-[#FFA726]"
                : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            }`}
          >
            Upcoming ({upcomingTasks.length})
            {activeTab === "upcoming" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5A2B] dark:bg-[#FFA726] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`pb-2 text-sm font-bold transition-colors relative ${
              activeTab === "past"
                ? "text-[#8B5A2B] dark:text-[#FFA726]"
                : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            }`}
          >
            Past ({pastTasks.length})
            {activeTab === "past" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5A2B] dark:bg-[#FFA726] rounded-full" />
            )}
          </button>
        </div>

        {/* Task List */}
        {displayedTasks.length === 0 ? (
          <div className="text-center py-8 text-stone-400 font-bold text-sm">
            {activeTab === "upcoming" ? "No upcoming tasks!" : "No past tasks yet."}
          </div>
        ) : (
          displayedTasks.map(task => {
            const isPast = activeTab === "past";
            const isSolo = task.mode === "Solo";
            const isExpanded = expandedTaskId === task.id;

            return (
              <div
                key={task.id}
                onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                className={`bg-white dark:bg-stone-800 rounded-2xl p-4 border transition-all duration-300 group active:scale-[0.98] ${
                  isExpanded
                    ? "border-orange-400 dark:border-orange-500 shadow-lg ring-1 ring-orange-500/20"
                    : "border-stone-100 dark:border-stone-700 shadow-sm hover:border-[#8B5A2B] dark:hover:border-[#FFA726] cursor-pointer"
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-3">
                    {/* Avatar with status indicator */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-stone-50 dark:border-stone-700 shadow-sm shadow-stone-200/50">
                        {task.creatorAvatar ? (
                          <Image
                            src={task.creatorAvatar}
                            alt={task.creatorUsername || "creator"}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-stone-400 text-xs font-bold uppercase">
                            {(task.creatorUsername || "U").charAt(0)}
                          </div>
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-stone-800 ${
                          task.status === "done"
                            ? "bg-green-500"
                            : task.status === "failed"
                              ? "bg-red-500"
                              : "bg-[#8B5A2B] dark:bg-[#FFA726]"
                        }`}
                      />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h4 className="font-bold text-stone-800 dark:text-stone-100 truncate text-sm leading-tight">
                        {task.title}
                      </h4>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                        {isPast ? (task.status === "done" ? "Completed" : "Failed") : getDurationLeft(task.deadline)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 bg-stone-50 dark:bg-stone-900/40 px-2 py-1 rounded-lg border border-stone-100 dark:border-stone-700">
                    <span className="text-xs font-black text-stone-800 dark:text-stone-100">
                      ${getOriginalStake(task.id, task.stake) || "---"}
                    </span>
                    <span className="text-[8px] font-bold text-stone-400">USDC</span>
                  </div>
                </div>

                {/* Inline Expansion Content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 animate-in slide-in-from-top-2 duration-300">
                    {isPast ? (
                      <div className="space-y-4">
                        <div className="bg-stone-50 dark:bg-stone-900/40 rounded-xl p-3 border border-stone-100 dark:border-stone-700/50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                              Resolution Payout
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${task.status === "done" ? "bg-green-100 dark:bg-green-900/40 text-green-600" : "bg-red-100 dark:bg-red-900/40 text-red-600"}`}
                            >
                              {task.status === "done" ? "Paid out" : isSolo ? "Burned" : "Squad Pot"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${task.status === "done" ? "bg-green-500 text-white" : "bg-red-500 text-white shadow-inner"}`}
                            >
                              {task.status === "done" ? (
                                <HandCoins size={18} weight="fill" />
                              ) : (
                                <Bank size={18} weight="fill" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-black text-stone-800 dark:text-white leading-none mb-0.5">
                                ${getOriginalStake(task.id, task.stake) || "---"}{" "}
                                <span className="text-[8px] text-stone-400 font-bold uppercase">USDC</span>
                              </p>
                              <p className="text-[10px] text-stone-500 font-medium">
                                {task.status === "done" ? (
                                  <>
                                    Successfully collected by{" "}
                                    <span className="font-bold text-stone-700 dark:text-stone-300">
                                      @{task.creatorUsername || "creator"}
                                    </span>
                                  </>
                                ) : isSolo ? (
                                  <>
                                    Slashed to{" "}
                                    <span className="font-bold text-red-600/80 dark:text-red-400/80">
                                      Protocol Treasury
                                    </span>
                                  </>
                                ) : (
                                  "Distributed among the Squad"
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {task.status === "done" && task.stake > 0 && (
                          <button
                            onClick={e => handleClaim(e, task.id)}
                            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-black py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <HandCoins size={16} weight="bold" /> Claim Funds
                          </button>
                        )}
                        <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold px-1">
                          <span>Verified on {formatDateTime(task.deadline)}</span>
                          <span className="text-[#8B5A2B] dark:text-[#FFA726] uppercase">View Cast →</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl p-3 border border-orange-100 dark:border-orange-900/30">
                          <p className="text-xs text-orange-800 dark:text-orange-200 font-medium">
                            This task is currently active. Submit your proof before the deadline to claim your stake
                            back.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CalendarView;

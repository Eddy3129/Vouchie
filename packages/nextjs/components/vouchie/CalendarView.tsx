import React, { useState } from "react";
import { Goal } from "../../types/vouchie";
import Card from "./Helper/Card";
import SlidingTabs from "./SlidingTabs";
import { Bank, CalendarPlus, CaretLeft, CaretRight, Check, Clock, HandCoins, X } from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useActivities } from "~~/hooks/vouchie/usePonderData";

// ... existing imports

interface CalendarViewProps {
  tasks: Goal[];
  verificationGoals?: Goal[];
  onTaskClick?: (goal: Goal) => void;
  onClaim?: (goalId: number, vouchieIndex: number) => void;
}
const CalendarView = ({ tasks, verificationGoals = [], onClaim }: CalendarViewProps) => {
  const [activeTab, setActiveTab] = useState<"timeline" | "history">("timeline");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { data: activities } = useActivities(100);
  const { targetNetwork } = useTargetNetwork();
  const { address: connectedAddress } = useAccount();
  const { context } = useMiniapp();

  const userAddress = context?.user?.primaryAddress || connectedAddress;
  const decimals = targetNetwork.id === 31337 ? 18 : 6;

  // Determine current calendar state
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getOriginalStake = (goalId: number, currentStake: number) => {
    if (currentStake > 0) return currentStake;
    const activity = activities?.find(a => Number(a.goalId) === goalId && a.type === "goal_created");
    if (activity) {
      // Use logic to determine stake
      return Number(formatUnits(BigInt(activity.stakeAmount || 0), decimals));
    }
    return 0;
  };

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  const getTasksForDay = (day: number) => {
    const startOfDay = new Date(year, month, day, 0, 0, 0).getTime();
    const endOfDay = new Date(year, month, day, 23, 59, 59).getTime();
    return tasks.filter(t => t.deadline >= startOfDay && t.deadline <= endOfDay);
  };

  const getDayActivity = (day: number) => {
    const dayTasks = getTasksForDay(day);
    if (dayTasks.length === 0) return null;

    return {
      success: dayTasks.filter(t => t.status === "done"),
      failed: dayTasks.filter(t => t.status === "failed"),
      active: dayTasks.filter(t => t.status === "verifying" || t.status === "in_progress"),
    };
  };

  const renderSymbols = (count: number, color: "green" | "red" | "amber") => {
    const stars = Math.floor(count / 5);
    const dots = count % 5;
    const colorClass = color === "green" ? "text-green-500" : color === "red" ? "text-red-500" : "text-amber-400";
    return (
      <div className={`flex flex-wrap justify-center items-center gap-0.5 max-w-[32px] overflow-hidden`}>
        {Array.from({ length: stars }).map((_, i) => (
          <span key={`star-${i}`} className={`text-[10px] ${colorClass} leading-none`}>
            ★
          </span>
        ))}
        {Array.from({ length: dots }).map((_, i) => (
          <span key={`dot-${i}`} className={`text-[10px] ${colorClass} leading-none`}>
            •
          </span>
        ))}
      </div>
    );
  };

  // Combine creator goals and vouchie claims (failed squad goals where user is vouchie)
  // Each item tracks whether it's a "creator" or "vouchie" claim
  const historyItems = [
    // Creator's own goals
    ...tasks
      .filter(t => t.status === "done" || t.status === "failed")
      .filter(t => {
        if (!userAddress) return false;
        return t.creator?.toLowerCase() === userAddress.toLowerCase();
      })
      .map(t => ({ ...t, claimRole: "creator" as const })),
    // Vouchie claims: failed squad goals where user is vouchie
    ...verificationGoals
      .filter(t => t.status === "failed" && t.resolved && t.mode === "Squad")
      .map(t => ({ ...t, claimRole: "vouchie" as const })),
  ].sort((a, b) => b.deadline - a.deadline);

  const netResult = historyItems.reduce((acc, t) => {
    const stake = getOriginalStake(t.id, t.stake);
    if (t.status === "failed") return acc - stake;
    return acc;
  }, 0);
  // Define tabs for SlidingTabs
  const tabs = [
    {
      id: "timeline",
      label: (
        <>
          <CalendarPlus size={16} weight="bold" /> Timeline
        </>
      ),
    },
    {
      id: "history",
      label: (
        <>
          <HandCoins size={16} weight="bold" /> PnL History
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 px-6 pt-6">
      {/* Tab Switcher */}
      <SlidingTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as "timeline" | "history")}
        className="mb-6"
      />

      {activeTab === "timeline" ? (
        <>
          {/* Calendar Header */}
          <header className="flex justify-between items-center mb-4 px-2">
            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-baseline gap-2">
              {currentDate.toLocaleString("default", { month: "long" })}{" "}
              <span className="text-sm text-stone-400 font-semibold">{year}</span>
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                <CaretLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-orange-500"
              >
                <CalendarPlus size={16} weight="fill" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
              >
                <CaretRight size={16} />
              </button>
            </div>
          </header>

          <Card className="p-4 border-none shadow-none bg-transparent">
            <div className="grid grid-cols-7 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="text-center font-bold text-stone-400 text-[10px] uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-3 gap-x-1">
              {calendarDays.map((day, i) => {
                const isToday = isCurrentMonth && day === todayDate;
                const isSelected = day !== null && selectedDay === day;
                const activity = day ? getDayActivity(day) : null;

                return (
                  <div
                    key={i}
                    onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                    className={`
                      aspect-square rounded-2xl flex flex-col items-center justify-start py-1 relative transition-all
                      ${!day ? "" : "hover:bg-stone-100 dark:hover:bg-stone-800/80 cursor-pointer"}
                      ${isSelected ? "bg-orange-50 dark:bg-orange-900/20 ring-1 ring-orange-200 dark:ring-orange-800/50" : ""}
                      ${isToday && !isSelected ? "ring-1 ring-orange-500/50" : ""}
                    `}
                  >
                    {day && (
                      <>
                        <span
                          className={`text-xs font-bold leading-none mb-1.5 ${
                            isSelected
                              ? "text-orange-600 dark:text-orange-400"
                              : isToday
                                ? "text-orange-500"
                                : "text-stone-600 dark:text-stone-400"
                          }`}
                        >
                          {day}
                        </span>
                        <div className="flex flex-col gap-0.5 items-center w-full px-0.5 overflow-hidden">
                          {activity?.success &&
                            activity.success.length > 0 &&
                            renderSymbols(activity.success.length, "green")}
                          {activity?.failed &&
                            activity.failed.length > 0 &&
                            renderSymbols(activity.failed.length, "red")}
                          {activity?.active &&
                            activity.active.length > 0 &&
                            renderSymbols(activity.active.length, "amber")}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Activity List for Selected Day */}
          {selectedDay && (
            <div className="mx-2 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
                  Tasks for {currentDate.toLocaleString("default", { month: "short" })} {selectedDay}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-[10px] font-bold text-stone-400 uppercase tracking-widest hover:text-stone-600"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-2">
                {getTasksForDay(selectedDay).length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 dashed">
                    <p className="text-xs text-stone-400 font-medium italic">No activity on this day</p>
                  </div>
                ) : (
                  getTasksForDay(selectedDay).map(task => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            task.status === "done"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                              : task.status === "failed"
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                          }`}
                        >
                          {task.status === "done" ? (
                            <Check size={16} weight="bold" />
                          ) : task.status === "failed" ? (
                            <X size={16} weight="bold" />
                          ) : (
                            <Clock size={16} weight="fill" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-stone-700 dark:text-stone-200 truncate">
                            {task.title}
                          </h4>
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                            {task.status === "done" ? "Completed" : task.status === "failed" ? "Failed" : "Active"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span
                          className={`text-sm font-bold ${
                            task.status === "done"
                              ? "text-green-600"
                              : task.status === "failed"
                                ? "text-red-600"
                                : "text-amber-500"
                          }`}
                        >
                          {task.status === "done" ? "+" : "-"}${getOriginalStake(task.id, task.stake).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="px-4 py-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl mx-2 border border-stone-100 dark:border-stone-800">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Legend</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />{" "}
                <span className="text-xs text-stone-500">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />{" "}
                <span className="text-xs text-stone-500">Failed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />{" "}
                <span className="text-xs text-stone-500">Scheduled</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* PNL HISTORY TAB */
        <div className="px-2 space-y-6">
          {/* Net Result Card with Floating Water Graph */}
          <div
            className={`relative overflow-hidden card-vouchie ${
              netResult >= 0
                ? "bg-gradient-to-br from-green-50 to-white dark:from-green-900/10 dark:to-stone-900"
                : "bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-stone-900"
            }`}
          >
            {/* Floating Water Graph Background */}
            {historyItems.length > 1 && (
              <>
                {/* Graph Layer */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      {/* Gradient that follows the line upward */}
                      <linearGradient id="waterGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop
                          offset="0%"
                          stopColor="currentColor"
                          stopOpacity="0.02"
                          className={netResult >= 0 ? "text-green-500" : "text-red-500"}
                        />
                        <stop
                          offset="50%"
                          stopColor="currentColor"
                          stopOpacity="0.08"
                          className={netResult >= 0 ? "text-green-400" : "text-red-400"}
                        />
                        <stop
                          offset="100%"
                          stopColor="currentColor"
                          stopOpacity="0.12"
                          className={netResult >= 0 ? "text-green-300" : "text-red-300"}
                        />
                      </linearGradient>
                    </defs>
                    {/* Water area under the line */}
                    <path
                      d={`
                         M 0,100
                         ${historyItems
                           .slice()
                           .reverse()
                           .map((item, i) => {
                             const cumulative = historyItems.slice(historyItems.length - i - 1).reduce((acc, t) => {
                               const stake = getOriginalStake(t.id, t.stake);
                               return t.status === "failed" ? acc - stake : acc;
                             }, 0);
                             const maxAbs = Math.max(
                               ...historyItems.map((_, idx) =>
                                 Math.abs(
                                   historyItems.slice(idx).reduce((acc, t) => {
                                     const stake = getOriginalStake(t.id, t.stake);
                                     return t.status === "failed" ? acc - stake : acc;
                                   }, 0),
                                 ),
                               ),
                               10,
                             );
                             const x = (i / Math.max(historyItems.length - 1, 1)) * 100;
                             const y = 50 - (cumulative / maxAbs) * 30;
                             return `L ${x},${y}`;
                           })
                           .join(" ")}
                         L 100,100
                         Z
                       `}
                      fill="url(#waterGradient)"
                    />
                    {/* Subtle line on top */}
                    <polyline
                      points={historyItems
                        .slice()
                        .reverse()
                        .map((item, i) => {
                          const cumulative = historyItems.slice(historyItems.length - i - 1).reduce((acc, t) => {
                            const stake = getOriginalStake(t.id, t.stake);
                            return t.status === "failed" ? acc - stake : acc;
                          }, 0);
                          const maxAbs = Math.max(
                            ...historyItems.map((_, idx) =>
                              Math.abs(
                                historyItems.slice(idx).reduce((acc, t) => {
                                  const stake = getOriginalStake(t.id, t.stake);
                                  return t.status === "failed" ? acc - stake : acc;
                                }, 0),
                              ),
                            ),
                            10,
                          );
                          const x = (i / Math.max(historyItems.length - 1, 1)) * 100;
                          const y = 50 - (cumulative / maxAbs) * 30;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeOpacity="0.2"
                      className={
                        netResult >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }
                    />
                  </svg>
                </div>

                {/* Protective overlay to ensure text readability */}
                <div className="absolute inset-0 bg-white/40 dark:bg-stone-900/40 pointer-events-none" />
              </>
            )}

            <div className="relative z-10">
              <span
                className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest"
                style={{ fontFamily: "Playfair Display, serif" }}
              >
                Net PnL
              </span>
              <div className="flex items-baseline gap-3 mt-2">
                <h2
                  className={`text-4xl font-black ${
                    netResult >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  }`}
                  style={{ fontFamily: "Playfair Display, serif" }}
                >
                  {netResult >= 0 ? "+" : "−"}${Math.abs(netResult).toFixed(2)}
                </h2>
                <span className="text-sm font-bold text-stone-400" style={{ fontFamily: "Playfair Display, serif" }}>
                  USDC
                </span>
              </div>
              <p
                className="text-xs text-stone-600 dark:text-stone-400 mt-2"
                style={{ fontFamily: "Playfair Display, serif" }}
              >
                {netResult >= 0
                  ? "You're on track! Keep building that streak."
                  : "Every setback is a setup for a comeback."}
              </p>
            </div>
          </div>

          {/* History List */}
          <div className="space-y-3">
            {historyItems.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <Bank size={48} weight="thin" className="mx-auto mb-3 opacity-30" />
                <p className="font-medium" style={{ fontFamily: "Playfair Display, serif" }}>
                  No history yet.
                </p>
                <p className="text-xs mt-1" style={{ fontFamily: "Playfair Display, serif" }}>
                  Complete your first commitment to see your financial journey.
                </p>
              </div>
            ) : (
              historyItems.map(task => {
                const stake = getOriginalStake(task.id, task.stake);
                const isDone = task.status === "done";
                const isVouchieRole = task.claimRole === "vouchie";

                // Determine claim eligibility
                // Creator claims: successful goals where stake > 0 and not claimed
                // Vouchie claims: failed squad goals where stake > 0 and not claimed
                const canClaim =
                  task.resolved &&
                  !task.userHasClaimed &&
                  stake > 0 &&
                  onClaim &&
                  // Solo failures have no payout
                  !(task.status === "failed" && task.mode === "Solo" && task.claimRole === "creator");

                return (
                  <div
                    key={`${task.id}-${task.claimRole}`}
                    className="card-vouchie relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div className="flex gap-3 relative z-10">
                      {/* Avatar with Status Badge Overlay */}
                      <div className="relative flex-shrink-0 w-11 h-11">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-stone-800 ${
                            isDone ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                          }`}
                        >
                          {isDone ? (
                            <HandCoins size={20} weight="fill" className="text-green-600 dark:text-green-400" />
                          ) : (
                            <Bank size={20} weight="fill" className="text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        {/* Status Badge Overlay */}
                        <div
                          className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-stone-800 shadow-sm ${
                            isDone ? "bg-green-500 dark:bg-green-600" : "bg-red-500 dark:bg-red-600"
                          }`}
                        >
                          {isDone ? (
                            <Check size={12} weight="bold" className="text-white" />
                          ) : (
                            <X size={12} weight="bold" className="text-white" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                        {/* Top Row: Date + Status Pill */}
                        <div className="flex justify-between items-center">
                          <span
                            className="text-stone-400 font-normal text-xs"
                            style={{ fontFamily: "Playfair Display, serif" }}
                          >
                            {new Date(task.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>

                          {/* Status Pill */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                              isDone
                                ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:border-green-900/30"
                                : "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-900/30"
                            }`}
                            style={{ fontFamily: "Playfair Display, serif" }}
                          >
                            {isDone ? "Completed" : "Failed"}
                            {isVouchieRole && " (Vouchie)"}
                          </span>
                        </div>

                        {/* Goal Title */}
                        <div
                          className="text-base font-bold text-stone-800 dark:text-stone-100 leading-tight line-clamp-2"
                          style={{ fontFamily: "Playfair Display, serif" }}
                        >
                          {task.title}
                        </div>

                        {/* Footer Row: Amount + Claim Button */}
                        <div className="flex items-center justify-between mt-1">
                          <div className="flex items-center gap-2">
                            {/* Amount Display */}
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                isDone
                                  ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                                  : isVouchieRole
                                    ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                                    : "text-red-600 bg-red-50 dark:bg-red-900/20"
                              }`}
                              style={{ fontFamily: "Playfair Display, serif" }}
                            >
                              {isDone || isVouchieRole ? `+$${stake.toFixed(2)}` : `−$${stake.toFixed(2)}`}
                            </span>

                            {/* Status text */}
                            <span
                              className="text-[10px] font-bold text-stone-400 uppercase tracking-wide"
                              style={{ fontFamily: "Playfair Display, serif" }}
                            >
                              {task.userHasClaimed
                                ? "Claimed"
                                : isDone
                                  ? "Refundable"
                                  : isVouchieRole
                                    ? "Claimable"
                                    : "Lost"}
                            </span>
                          </div>

                          {/* Claim Button */}
                          {canClaim && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onClaim(task.id, task.currentUserVouchieIndex || 0);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] text-white dark:text-stone-900 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                              {isDone ? "Claim Refund" : "Claim Share"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;

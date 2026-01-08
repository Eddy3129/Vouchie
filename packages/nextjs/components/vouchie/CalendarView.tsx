import React, { useState } from "react";
import { Goal } from "../../types/vouchie";
import Card from "./Helper/Card";
import SlidingTabs from "./SlidingTabs";
import {
  ArrowSquareOut,
  Bank,
  CalendarPlus,
  CaretLeft,
  CaretRight,
  Check,
  Clock,
  HandCoins,
  X,
} from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { useActivities } from "~~/hooks/vouchie/usePonderData";

/**
 * Converts points to a smooth SVG path using Catmull-Rom spline interpolation.
 * Creates water-like smooth curves instead of straight lines.
 */
const pointsToSmoothPath = (points: { x: number; y: number }[]): string => {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  // Catmull-Rom to Bezier conversion
  const tension = 0.3; // Lower = smoother curves
  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calculate control points
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return path;
};

// ... existing imports

interface CalendarViewProps {
  tasks: Goal[];
  vouchieGoals?: Goal[];
  onTaskClick?: (goal: Goal) => void;
  onClaim?: (goalId: number, vouchieIndex: number) => void;
}
const CalendarView = ({ tasks, vouchieGoals = [], onClaim }: CalendarViewProps) => {
  const [activeTab, setActiveTab] = useState<"timeline" | "history">("timeline");
  const [currentDate, setCurrentDate] = useState(new Date());
  // Default to today's date when in current month
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
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
    ...vouchieGoals
      .filter(t => t.status === "failed" && t.resolved && t.mode === "Squad")
      .map(t => ({ ...t, claimRole: "vouchie" as const })),
  ].sort((a, b) => b.deadline - a.deadline);

  const netResult = historyItems.reduce((acc, t) => {
    const stake = getOriginalStake(t.id, t.stake);
    const isVouchieRole = t.claimRole === "vouchie";
    if (t.status === "failed") {
      if (isVouchieRole) {
        const share = stake / (t.vouchies?.length || 1);
        return acc + share;
      }
      return acc - stake;
    }
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
                        {/* Dots on single row */}
                        <div className="flex gap-0.5 items-center justify-center flex-wrap max-w-[36px]">
                          {activity?.success?.map((_, idx) => (
                            <span key={`s-${idx}`} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          ))}
                          {activity?.failed?.map((_, idx) => (
                            <span key={`f-${idx}`} className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          ))}
                          {activity?.active?.map((_, idx) => (
                            <span key={`a-${idx}`} className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          ))}
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
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 py-2 bg-stone-50 dark:bg-stone-800/50 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-medium text-stone-500">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[10px] font-medium text-stone-500">Failed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-medium text-stone-500">In Progress</span>
                </div>
              </div>

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
                    {/* Generate smooth curve points */}
                    {(() => {
                      const maxAbs = Math.max(
                        ...historyItems.map((_, idx) =>
                          Math.abs(
                            historyItems.slice(idx).reduce((acc, t) => {
                              const stake = getOriginalStake(t.id, t.stake);
                              const isVouchieRole = t.claimRole === "vouchie";
                              if (t.status === "failed") {
                                if (isVouchieRole) {
                                  const share = stake / (t.vouchies?.length || 1);
                                  return acc + share;
                                }
                                return acc - stake;
                              }
                              return acc;
                            }, 0),
                          ),
                        ),
                        10,
                      );

                      const points = historyItems
                        .slice()
                        .reverse()
                        .map((item, i) => {
                          const cumulative = historyItems.slice(historyItems.length - i - 1).reduce((acc, t) => {
                            const stake = getOriginalStake(t.id, t.stake);
                            const isVouchieRole = t.claimRole === "vouchie";
                            if (t.status === "failed") {
                              if (isVouchieRole) {
                                const share = stake / (t.vouchies?.length || 1);
                                return acc + share;
                              }
                              return acc - stake;
                            }
                            return acc;
                          }, 0);
                          return {
                            x: (i / Math.max(historyItems.length - 1, 1)) * 100,
                            y: 50 - (cumulative / maxAbs) * 30,
                          };
                        });

                      const smoothPath = pointsToSmoothPath(points);

                      return (
                        <>
                          {/* Water area under the smooth curve */}
                          <path
                            d={`M 0,100 L 0,${points[0]?.y || 50} ${smoothPath.replace("M", "").replace(/^[^C]*/, "")} L 100,100 Z`}
                            fill="url(#waterGradient)"
                          />
                          {/* Smooth line on top */}
                          <path
                            d={smoothPath}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeOpacity="0.2"
                            className={
                              netResult >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }
                          />
                        </>
                      );
                    })()}
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
                const share = isVouchieRole ? stake / (task.vouchies?.length || 1) : stake;

                // Determine display amount
                const displayAmount = isVouchieRole ? share : stake;
                const isProfit = isVouchieRole && task.status === "failed";
                const isLoss = !isVouchieRole && task.status === "failed";
                const sign = isProfit ? "+" : isLoss ? "-" : "+";

                // Calculate fund distribution for expanded view (for BOTH creator and vouchie views)
                const numVouchies = task.vouchies?.length || 1;
                const protocolTaxRate = 0.1; // 10% protocol tax
                const isFailed = task.status === "failed";
                const protocolAmount = isFailed && task.mode === "Squad" ? stake * protocolTaxRate : 0;
                const vouchiePool = isFailed && task.mode === "Squad" ? stake - protocolAmount : 0;
                const perVouchieShare = vouchiePool / numVouchies;

                // Determine claim eligibility
                const canClaim =
                  task.resolved &&
                  !task.userHasClaimed &&
                  task.stake > 0 &&
                  onClaim &&
                  ((task.status === "failed" && isVouchieRole) || (task.status === "done" && !isVouchieRole));

                // Determine border and icon styles
                let borderClass, iconBg, icon;
                if (isDone) {
                  borderClass = "border-l-4 border-l-green-500";
                  iconBg = "bg-green-100 dark:bg-green-900/30 text-green-600";
                  icon = <HandCoins size={20} weight="fill" />;
                } else if (isVouchieRole) {
                  borderClass = "border-l-4 border-l-orange-500";
                  iconBg = "bg-orange-100 dark:bg-orange-900/30 text-orange-600";
                  icon = <HandCoins size={20} weight="fill" />;
                } else {
                  borderClass = "border-l-4 border-l-red-500";
                  iconBg = "bg-red-100 dark:bg-red-900/30 text-red-600";
                  icon = <Bank size={20} weight="fill" />;
                }

                return (
                  <details
                    key={`${task.id}-${task.claimRole}`}
                    className={`card-base p-4 relative overflow-hidden transition-all group ${borderClass}`}
                  >
                    <summary className="flex items-start gap-3 cursor-pointer list-none outline-none">
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}
                      >
                        {icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          {/* Title */}
                          <span className="font-bold text-stone-900 dark:text-white text-sm line-clamp-1">
                            {task.title}
                          </span>
                          {/* Status Badge - top right */}
                          <span
                            className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 ${
                              isDone
                                ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                                : isVouchieRole
                                  ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30"
                                  : "bg-red-100 text-red-600 dark:bg-red-900/30"
                            }`}
                          >
                            {isDone ? "Completed" : isVouchieRole ? "Slashed" : "Failed"}
                          </span>
                        </div>

                        {/* Description Row */}
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                          {isDone
                            ? "Goal verified successfully. Stake refunded."
                            : isVouchieRole
                              ? `You slashed @${task.creatorUsername || "creator"} for failing this goal.`
                              : "Goal failed. Stake was forfeited to vouchies."}
                        </p>

                        {/* Footer Row: Amount + Timestamp */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {/* Amount Badge */}
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                isProfit
                                  ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                                  : isLoss
                                    ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                                    : "bg-green-100 text-green-600 dark:bg-green-900/30"
                              }`}
                            >
                              {sign}${displayAmount.toFixed(2)}
                            </span>
                            {/* Status text */}
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                              {task.userHasClaimed
                                ? "Claimed"
                                : isDone
                                  ? "Refunded"
                                  : isVouchieRole
                                    ? "Claimable"
                                    : "Lost"}
                            </span>
                          </div>

                          {/* Date */}
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide">
                            {new Date(task.deadline).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Claim Button */}
                        {canClaim && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              e.preventDefault();
                              onClaim(task.id, task.currentUserVouchieIndex || 0);
                            }}
                            className="mt-3 w-full px-3 py-2 bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] text-white dark:text-stone-900 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                          >
                            {isDone ? "Claim Refund" : "Claim Share"}
                          </button>
                        )}
                      </div>

                      {/* Dropdown caret */}
                      <div className="ml-2 text-stone-300 group-open:rotate-180 transition-transform flex-shrink-0">
                        <CaretRight size={14} weight="bold" className="rotate-90 group-open:-rotate-90" />
                      </div>
                    </summary>

                    {/* Expandable Details - Fund Distribution */}
                    <div className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 ml-[52px]">
                      <div className="space-y-3">
                        {/* Fund Distribution Breakdown */}
                        <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                          Fund Distribution
                        </div>

                        {isDone ? (
                          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <HandCoins size={16} weight="fill" />
                            <span className="font-medium">
                              ${stake.toFixed(2)} refunded to @{task.creatorUsername || "you"}
                            </span>
                          </div>
                        ) : task.mode === "Squad" && isFailed ? (
                          <div className="space-y-2">
                            {/* Vouchie Pool with avatars */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                <HandCoins size={16} weight="fill" />
                                <span>To Vouchie{numVouchies > 1 ? "s" : ""}</span>
                                {/* Vouchie avatars (up to 5) */}
                                <div className="flex -space-x-2 ml-1">
                                  {(task.vouchies || []).slice(0, 5).map((v, idx) => (
                                    <div
                                      key={idx}
                                      className="w-6 h-6 rounded-full bg-stone-200 dark:bg-stone-700 border-2 border-white dark:border-stone-900 flex items-center justify-center text-[8px] font-bold text-stone-600 dark:text-stone-300 overflow-hidden"
                                      title={v.username || v.name || v.address || "Vouchie"}
                                    >
                                      {v.avatar ? (
                                        <img src={v.avatar} alt={v.name} className="w-full h-full object-cover" />
                                      ) : (
                                        (v.name || v.username || v.address?.slice(2, 4) || "V")
                                          .slice(0, 2)
                                          .toUpperCase()
                                      )}
                                    </div>
                                  ))}
                                  {numVouchies > 5 && (
                                    <div className="w-6 h-6 rounded-full bg-stone-300 dark:bg-stone-600 border-2 border-white dark:border-stone-900 flex items-center justify-center text-[8px] font-bold text-stone-600 dark:text-stone-300">
                                      +{numVouchies - 5}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="font-bold text-stone-700 dark:text-stone-300">
                                ${vouchiePool.toFixed(2)} (${perVouchieShare.toFixed(2)} ea)
                              </span>
                            </div>
                            {/* Protocol Treasury */}
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-stone-500">
                                <Bank size={16} weight="fill" />
                                <span>Protocol Treasury (10%)</span>
                              </div>
                              <span className="font-bold text-stone-700 dark:text-stone-300">
                                ${protocolAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                              <Bank size={16} weight="fill" />
                              <span>To Protocol Treasury</span>
                            </div>
                            <span className="font-bold text-stone-700 dark:text-stone-300">${stake.toFixed(2)}</span>
                          </div>
                        )}

                        {/* Proof Link */}
                        {task.proofCastHash && (
                          <div className="flex items-center gap-2 text-xs text-stone-500 pt-2 border-t border-stone-100 dark:border-stone-700">
                            <ArrowSquareOut size={14} />
                            <a
                              href={`https://warpcast.com/~/conversations/${task.proofCastHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-purple-500 underline"
                            >
                              View Verification Proof
                            </a>
                          </div>
                        )}

                        {/* Mode Badge */}
                        <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-stone-400 pt-2">
                          <Clock size={12} />
                          {task.mode === "Squad" ? "Squad Verification" : "Solo Commitment"}
                        </div>
                      </div>
                    </div>
                  </details>
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

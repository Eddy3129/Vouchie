import React, { useState } from "react";
import { Goal } from "../../types/vouchie";
import Card from "./Helper/Card";
import { Bank, CalendarPlus, CaretLeft, CaretRight, Clock, HandCoins } from "@phosphor-icons/react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useVouchieData } from "~~/hooks/vouchie/useVouchieData";

interface CalendarViewProps {
  tasks: Goal[];
  onTaskClick?: (goal: Goal) => void;
}

const CalendarView = ({ tasks, onTaskClick }: CalendarViewProps) => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [currentDate, setCurrentDate] = useState(new Date());

  const { refresh } = useVouchieData();
  const { writeContractAsync: claimGoal } = useScaffoldWriteContract({ contractName: "VouchieVault" });

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
      <header className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-baseline gap-2">
            {monthName} <span className="text-lg text-stone-400 font-semibold">{year}</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 bg-white dark:bg-stone-800 rounded-xl shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300"
          >
            <CaretLeft size={20} weight="bold" />
          </button>
          <button
            onClick={goToToday}
            className="p-2 bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900 rounded-xl shadow-sm hover:bg-[#6B4423] dark:hover:bg-[#FF9800] transition-colors"
          >
            <CalendarPlus size={20} weight="fill" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 bg-white dark:bg-stone-800 rounded-xl shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300"
          >
            <CaretRight size={20} weight="bold" />
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
                    if (dayTasks.length > 0) onTaskClick?.(dayTasks[0]);
                  }
                }}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200
                  ${!day ? "" : hasTasks ? "cursor-pointer hover:scale-105 active:scale-95" : "cursor-default"}
                  ${isToday ? "bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900 shadow-md z-10" : "text-stone-600 dark:text-stone-300"}
                  ${hasTasks && !isToday ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30" : ""}
                  ${day && !hasTasks && !isToday ? "hover:bg-stone-50 dark:hover:bg-stone-800/50" : ""}
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

            if (isPast) {
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="bg-white dark:bg-stone-800 rounded-2xl p-4 border border-stone-100 dark:border-stone-700 shadow-sm cursor-pointer hover:border-[#8B5A2B] dark:hover:border-[#FFA726] transition-all group active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1.5 h-6 rounded-full ${task.status === "done" ? "bg-green-500" : "bg-red-500"}`}
                      />
                      <h4 className="font-bold text-stone-800 dark:text-stone-100 truncate">{task.title}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        task.status === "done"
                          ? "bg-green-100 dark:bg-green-900/40 text-green-600"
                          : "bg-red-100 dark:bg-red-900/40 text-red-600"
                      }`}
                    >
                      {task.status === "done" ? "Success" : "Failed"}
                    </span>
                  </div>

                  <div className="bg-stone-50 dark:bg-stone-900/40 rounded-xl p-3 border border-stone-100 dark:border-stone-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${task.status === "done" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
                      >
                        {task.status === "done" ? <HandCoins size={20} /> : <Bank size={20} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                          ${task.stake} <span className="text-[10px] text-stone-400 font-normal">USDC</span>
                        </span>
                        <span className="text-[10px] text-stone-500">
                          {task.status === "done" ? (
                            <>Claimed by @{task.creatorUsername || "creator"}</>
                          ) : isSolo ? (
                            <>Sent to Treasury</>
                          ) : (
                            <>Squad Pot</>
                          )}
                        </span>
                      </div>
                    </div>

                    {task.status === "done" && task.stake > 0 && (
                      <button
                        onClick={e => handleClaim(e, task.id)}
                        className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all shadow-sm"
                      >
                        Claim
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-stone-400 font-bold">
                    <span>{formatDateTime(task.deadline)}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">View Details →</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className="relative bg-white dark:bg-stone-800 py-1 pr-2 pl-4 rounded-lg flex items-center justify-between shadow-sm border border-stone-100 dark:border-stone-700 cursor-pointer hover:border-[#8B5A2B] dark:hover:border-[#FFA726] transition-all"
              >
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-[#8B5A2B] dark:bg-[#FFA726]" />
                <div className="flex flex-col min-w-0 flex-1 mr-2 pl-2 justify-center py-2">
                  <p className="font-bold text-sm text-stone-800 dark:text-stone-100 truncate leading-none mb-1">
                    {task.title}
                  </p>
                  <p className="text-[10px] text-stone-400 font-bold flex items-center gap-1 leading-none">
                    <Clock size={10} weight="bold" />
                    {getDurationLeft(task.deadline)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  <span className="text-sm font-bold px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
                    ${task.stake}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CalendarView;

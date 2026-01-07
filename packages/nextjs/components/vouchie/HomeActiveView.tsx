import React, { useState } from "react";
import { Goal } from "../../types/vouchie";
import { ArrowRight, CheckCircle, Clock } from "@phosphor-icons/react";
import { formatUnits } from "viem";

interface HomeActiveViewProps {
  activeGoal: Goal | undefined;
  upcomingGoals: Goal[];
  completedGoals: Goal[];
  onVerify: (goal: Goal) => void;
  onStart: (goal: Goal) => void;
  onCreate: () => void;
}

const HomeActiveView = ({
  activeGoal,
  upcomingGoals,
  completedGoals,
  onVerify,
  onStart,
  onCreate,
}: HomeActiveViewProps) => {
  const [showCompleted, setShowCompleted] = useState(false);

  // Helper to format remaining time
  const getTimeRemaining = (deadline: number) => {
    const diff = deadline - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isUrgent = activeGoal ? activeGoal.deadline - Date.now() < 1000 * 60 * 60 * 4 : false;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 px-6 pt-6">
      {/* 1. HERO SECTION: Active Commitment */}
      {activeGoal ? (
        <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-stone-900 shadow-xl border-2 border-stone-100 dark:border-stone-800 p-8 text-center group transition-all hover:shadow-2xl hover:scale-[1.01]">
          {/* Background Glow */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[100px] opacity-40 pointer-events-none ${
              isUrgent ? "bg-red-500" : "bg-orange-500"
            }`}
          />

          <div className="relative z-10 flex flex-col items-center">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 mb-6 border border-stone-200 dark:border-stone-700 backdrop-blur-md">
              <div className={`w-2 h-2 rounded-full animate-pulse ${isUrgent ? "bg-red-500" : "bg-green-500"}`} />
              <span className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-widest">
                Active Commitment
              </span>
            </div>

            {/* Task Title */}
            <h1 className="text-4xl md:text-5xl font-black text-stone-800 dark:text-stone-50 mb-4 leading-tight">
              {activeGoal.title}
            </h1>

            {/* Stakes & Time */}
            <div className="flex items-center gap-6 mb-8 text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-2 bg-white/50 dark:bg-stone-800/50 px-4 py-2 rounded-xl border border-stone-100 dark:border-stone-700/50">
                <span className="text-2xl font-bold text-stone-800 dark:text-white">
                  ${formatUnits(BigInt(activeGoal.stake), 6)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider">At Risk</span>
              </div>
              <div className="flex items-center gap-2 bg-white/50 dark:bg-stone-800/50 px-4 py-2 rounded-xl border border-stone-100 dark:border-stone-700/50">
                <Clock size={20} weight="fill" className={isUrgent ? "text-red-500" : "text-stone-400"} />
                <span
                  className={`text-xl font-bold ${isUrgent ? "text-red-600 dark:text-red-400" : "text-stone-700 dark:text-stone-300"}`}
                >
                  {getTimeRemaining(activeGoal.deadline)}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            {activeGoal.status === "in_progress" ? (
              <button
                onClick={() => onVerify(activeGoal)}
                className="w-full max-w-sm py-4 bg-[#FF8C00] hover:bg-[#EF6C00] text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-3 transform active:scale-95"
              >
                Verify Completion <ArrowRight size={20} weight="bold" />
              </button>
            ) : (
              <button
                onClick={() => onStart(activeGoal)}
                className="w-full max-w-sm py-4 bg-stone-800 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 transform active:scale-95"
              >
                Start Task
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-[2rem] bg-stone-50 dark:bg-stone-900 border-2 border-dashed border-stone-200 dark:border-stone-800">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6 text-orange-500">
            <span className="text-4xl">🧘</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">No active commitments</h2>
          <p className="text-stone-500 dark:text-stone-400 max-w-md mb-8">
            The mind is calm, but progress requires action. Set a new goal to build momentum.
          </p>
          <button
            onClick={onCreate}
            className="px-8 py-4 bg-[#8B5A2B] hover:bg-[#7A4A1F] text-white rounded-2xl font-bold shadow-lg hover:shadow-lg transition-all transform active:scale-95"
          >
            Create New Commitment
          </button>
        </div>
      )}

      {/* 2. SECONDARY: Upcoming */}
      {upcomingGoals.length > 0 && (
        <div className="px-2">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 ml-2">Up Next</h3>
          <div className="grid gap-3">
            {upcomingGoals.slice(0, 2).map(goal => (
              <div
                key={goal.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-stone-800 rounded-2xl border border-stone-100 dark:border-stone-700 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-stone-400">
                    <Clock size={20} weight="fill" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-700 dark:text-stone-200 text-sm">{goal.title}</h4>
                    <p className="text-[10px] font-bold text-stone-400 uppercase mt-0.5">
                      Starts in {getTimeRemaining(goal.startTime || Date.now())}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-stone-800 dark:text-stone-300">
                    ${formatUnits(BigInt(goal.stake), 6)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. COLLAPSED: Completed */}
      {completedGoals.length > 0 && (
        <div className="px-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors p-2"
          >
            <span className="text-xs font-bold uppercase tracking-widest">
              Completed Today ({completedGoals.length})
            </span>
            <ArrowRight
              size={14}
              weight="bold"
              className={`transform transition-transform ${showCompleted ? "rotate-90" : ""}`}
            />
          </button>

          {showCompleted && (
            <div className="mt-3 grid gap-2 animate-in slide-in-from-top-2 duration-200">
              {completedGoals.map(goal => (
                <div
                  key={goal.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-100 dark:border-stone-800 opacity-60"
                >
                  <CheckCircle size={16} weight="fill" className="text-green-500" />
                  <span className="text-sm font-bold text-stone-600 dark:text-stone-400 line-through decoration-stone-400">
                    {goal.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeActiveView;

import React from "react";
import { Goal } from "../../types/vouchie";
import Avatar from "./Avatar";
import Card from "./Helper/Card";
import { CheckCircle, Clock, Eye, Play } from "@phosphor-icons/react";
import toast from "react-hot-toast";

interface GoalCardProps {
  goal: Goal;
  onStart: (goal: Goal) => void;
  onViewDetails: (goal: Goal) => void;
  isTimelineMode?: boolean;
  variant?: "default" | "timeline";
}

const MOCK_PROFILES = [
  {
    id: 1,
    name: "Mochi",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mochi",
    score: 2450,
    status: "online",
  },
  {
    id: 2,
    name: "Pudding",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pudding",
    score: 2100,
    status: "offline",
  },
  {
    id: 3,
    name: "Bunny",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bunny",
    score: 1850,
    status: "online",
  },
  {
    id: 4,
    name: "Froggy",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Froggy",
    score: 1200,
    status: "offline",
  },
];

// Helper to format time remaining
const formatTimeRemaining = (deadline: number) => {
  const now = Date.now();
  const diff = deadline - now;

  if (diff <= 0) return { text: "Expired", hours: 0, minutes: 0 };

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return { text: `${days}d ${remainingHours}h`, hours, minutes };
  }

  if (hours > 0) {
    return { text: `${hours}h ${minutes}m`, hours, minutes };
  }

  return { text: `${minutes}m`, hours, minutes };
};

// Calculate time remaining as percentage (for visual bar)
const getTimeRemainingPercent = (deadline: number, createdAt?: number) => {
  const now = Date.now();
  // Default to 24h duration if createdAt not available
  const startTime = createdAt || deadline - 24 * 60 * 60 * 1000;
  const totalDuration = deadline - startTime;
  const elapsed = now - startTime;
  const remaining = Math.max(0, 100 - (elapsed / totalDuration) * 100);
  return Math.min(100, Math.max(0, remaining));
};

const GoalCard = ({ goal, onStart, onViewDetails, isTimelineMode = false, variant = "default" }: GoalCardProps) => {
  const timeRemaining = formatTimeRemaining(goal.deadline);
  const timePercent = getTimeRemainingPercent(goal.deadline, goal.createdAt);
  const isUrgent = goal.deadline - Date.now() < 1000 * 60 * 60 * 4; // < 4 hours
  const isCritical = goal.deadline - Date.now() < 1000 * 60 * 60; // < 1 hour
  const isDone = goal.status === "done";
  const isPending = goal.status === "pending";
  const isFailed = goal.status === "failed";
  const latestComment = goal.comments.length > 0 ? goal.comments[0] : null;

  if (variant === "timeline") {
    return (
      <div
        className={`relative h-full transition-all duration-300 cursor-pointer overflow-hidden rounded-lg group ${
          isDone
            ? "bg-green-100 dark:bg-green-900/20 border-l-4 border-green-500"
            : isFailed
              ? "bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500"
              : isUrgent
                ? "bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500"
                : "bg-white dark:bg-stone-800 border-l-4 border-stone-300 dark:border-stone-600 shadow-sm"
        }`}
        onClick={() => onViewDetails(goal)}
      >
        <div className="p-2 h-full flex flex-col justify-between">
          <div className="min-h-0">
            <div className="flex justify-between items-start gap-1">
              <h3
                className={`font-bold text-xs truncate leading-snug w-full ${isDone ? "line-through opacity-70" : "text-stone-800 dark:text-stone-200"}`}
              >
                {goal.title}
              </h3>
            </div>
            <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 mt-0.5 whitespace-nowrap overflow-hidden">
              {formatTimeRemaining(goal.deadline).text}
            </div>
          </div>

          {/* Status Icon for very small heights */}
          {isDone && <CheckCircle size={14} weight="fill" className="text-green-600 absolute bottom-1.5 right-1.5" />}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative transition-all duration-300 ${isUrgent && goal.status === "in_progress" ? "urgent-glow rounded-2xl" : ""} ${isTimelineMode ? "cursor-pointer" : ""}`}
      onClick={() => isTimelineMode && onViewDetails(goal)}
    >
      <Card
        color={isFailed ? "bg-red-50 dark:bg-red-900/10" : goal.status === "verifying" ? "bg-white" : goal.color}
        className={`flex flex-col gap-4 mb-4 ${isFailed ? "opacity-75 border-red-500 dark:border-red-500/50" : isDone ? "border-green-500 dark:border-green-500/50" : goal.status === "verifying" ? "border-blue-500 dark:border-blue-500/50" : "border-stone-300 dark:border-stone-600"}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${goal.accent} opacity-60 mb-1 block`}>
              {goal.mode} Quest
            </span>
            <h3
              className={`text-lg font-bold text-stone-800 dark:text-stone-100 leading-tight ${isDone ? "line-through opacity-50 decoration-2 decoration-stone-400" : ""} ${isFailed ? "line-through opacity-50 decoration-2 decoration-red-400" : ""}`}
            >
              {goal.title}
            </h3>
          </div>
          <div className="flex flex-col items-end">
            {!isDone && !isPending && !isFailed && (
              <div
                className={`mt-1 text-xs font-bold flex items-center gap-1 ${isCritical ? "text-red-500 animate-pulse" : isUrgent ? "text-orange-500" : "text-stone-400"}`}
              >
                <Clock size={12} weight="bold" />
                {timeRemaining.text} left
              </div>
            )}
            {isPending && (
              <span className="bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400 px-2 py-1 rounded-lg text-xs font-bold">
                Not Started
              </span>
            )}
            {isDone && (
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg text-xs font-bold">
                Complete
              </span>
            )}
            {isFailed && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg text-xs font-bold">
                Failed
              </span>
            )}
          </div>
        </div>

        {!isDone && latestComment && (
          <div className="mt-1">
            <div
              className="relative bg-white/70 dark:bg-stone-700/50 p-3 rounded-2xl border border-white/50 dark:border-stone-600/50 group cursor-pointer"
              onClick={() => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(latestComment.text);
                  toast.success("Comment copied!", { duration: 2000, position: "top-center" });
                }
              }}
            >
              <div className="flex gap-3 items-start">
                <Avatar
                  src={MOCK_PROFILES.find(p => p.name === latestComment.user)?.avatar || ""}
                  name={latestComment.user}
                  size="sm"
                  showBorder
                />
                <div className="flex-1 text-stone-700 dark:text-stone-200">
                  <span className="font-bold text-sm">{latestComment.user}</span>: &quot;
                  {latestComment.text}&quot;
                  <span className="text-xs text-stone-400 ml-2">📋</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {goal.startTime && !isDone && (
          <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400 bg-white/40 dark:bg-stone-700/40 p-2 rounded-xl">
            {goal.startImage && <span className="text-xs">{goal.startImage}</span>}
            <span>
              Started at {new Date(goal.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {!isTimelineMode && goal.status === "in_progress" && (
          <div>
            <div className="flex justify-between text-xs font-bold text-stone-500 dark:text-stone-400 mb-2">
              <span>Time Remaining</span>
              <span className={isCritical ? "text-red-500" : isUrgent ? "text-orange-500" : ""}>
                {timeRemaining.text}
              </span>
            </div>
            <div className="h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCritical ? "bg-red-500" : isUrgent ? "bg-orange-500" : "bg-green-500"
                }`}
                style={{ width: `${timePercent}%` }}
              />
            </div>
          </div>
        )}

        {goal.status === "pending" && (
          <button
            onClick={() => onStart(goal)}
            className="w-full py-3 bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] text-white dark:text-stone-900 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            Begin Task <Play size={16} weight="fill" />
          </button>
        )}

        {!isTimelineMode && goal.status === "in_progress" && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onViewDetails(goal)}
              className="flex-1 py-3 bg-white dark:bg-stone-700 rounded-xl text-stone-700 dark:text-stone-200 font-bold text-sm shadow-sm hover:bg-stone-50 dark:hover:bg-stone-600 transition-colors flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-600 min-h-[44px]"
            >
              View Details <Eye size={16} weight="bold" />
            </button>
          </div>
        )}

        {goal.status === "verifying" && (
          <div className="bg-white/50 dark:bg-stone-700/50 p-3 rounded-xl text-center text-xs font-bold text-stone-500 dark:text-stone-400 flex items-center justify-center gap-2">
            <Clock size={14} className="animate-spin" /> Verifying...
          </div>
        )}

        {isFailed && (
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-xl text-center text-xs font-bold text-red-600 dark:text-red-400">
            Lost ${goal.stake} {goal.currency}
          </div>
        )}
      </Card>
    </div>
  );
};

export default GoalCard;

import React from "react";
import { Goal } from "../../types/vouchie";
import CuteCard from "./Helper/CuteCard";
import ProgressBar from "./Helper/ProgressBar";
import { Clock, Eye, Play } from "lucide-react";

interface GoalCardProps {
  goal: Goal;
  onStart: (goal: Goal) => void;
  onViewDetails: (goal: Goal) => void;
}

const MOCK_PROFILES = [
  { id: 1, name: "Mochi", color: "bg-pink-200", avatar: "🐱", score: 2450, status: "online" },
  { id: 2, name: "Pudding", color: "bg-blue-200", avatar: "🐶", score: 2100, status: "offline" },
  { id: 3, name: "Bunny", color: "bg-green-200", avatar: "🐰", score: 1850, status: "online" },
  { id: 4, name: "Froggy", color: "bg-teal-200", avatar: "🐸", score: 1200, status: "offline" },
];

const GoalCard = ({ goal, onStart, onViewDetails }: GoalCardProps) => {
  const isUrgent = goal.deadline - Date.now() < 1000 * 60 * 60 * 4;
  const isDone = goal.status === "done";
  const isPending = goal.status === "pending";
  const latestComment = goal.comments.length > 0 ? goal.comments[0] : null;

  return (
    <div
      className={`relative transition-all duration-300 ${isUrgent && goal.status === "in_progress" ? "urgent-glow rounded-[28px]" : ""}`}
    >
      <CuteCard color={goal.status === "verifying" ? "bg-stone-100" : goal.color} className="flex flex-col gap-4 mb-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${goal.accent} opacity-60 mb-1 block`}>
              {goal.mode} Quest
            </span>
            <h3
              className={`text-lg font-bold text-stone-800 leading-tight ${isDone ? "line-through opacity-50 decoration-2 decoration-stone-400" : ""}`}
            >
              {goal.title}
            </h3>
          </div>
          <div className="flex flex-col items-end">
            {!isDone && !isPending && (
              <div
                className={`mt-1 text-xs font-bold flex items-center gap-1 ${isUrgent ? "text-orange-500" : "text-stone-400"}`}
              >
                <Clock size={12} />
                {Math.floor((goal.deadline - Date.now()) / (1000 * 60 * 60))}h left
              </div>
            )}
            {isPending && (
              <span className="bg-stone-200 text-stone-500 px-2 py-1 rounded-lg text-xs font-bold">Not Started</span>
            )}
            {isDone && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold">Complete</span>
            )}
          </div>
        </div>

        {/* Comment Bubble */}
        {!isDone && latestComment && (
          <div className="mt-1">
            <div className="relative bg-white/70 p-3 rounded-2xl rounded-tl-sm border border-white/50 group">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs border border-white shadow-sm flex-shrink-0">
                  {MOCK_PROFILES.find(p => p.name === latestComment.user)?.avatar || "👤"}
                </div>
                <div className="flex-1">
                  <span className="font-bold text-stone-700">{latestComment.user}</span>: &quot;{latestComment.text}
                  &quot;
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Started Time / Selfie Icon */}
        {goal.startTime && !isDone && (
          <div className="flex items-center gap-2 text-xs font-bold text-stone-500 bg-white/40 p-2 rounded-xl">
            {goal.startImage && <span>{goal.startImage}</span>}
            <span>
              Started at {new Date(goal.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {/* Progress */}
        {goal.status === "in_progress" && (
          <div>
            <div className="flex justify-between text-xs font-bold text-stone-500 mb-2">
              <span>Progress</span>
              <span>{goal.progress}%</span>
            </div>
            <ProgressBar progress={goal.progress} color={goal.barColor} />
          </div>
        )}

        {/* Actions */}
        {goal.status === "pending" && (
          <button
            onClick={() => onStart(goal)}
            className="w-full py-3 bg-stone-800 text-white rounded-xl font-bold text-sm shadow-sm hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
          >
            Begin Task <Play size={16} fill="currentColor" />
          </button>
        )}

        {goal.status === "in_progress" && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onViewDetails(goal)}
              className="flex-1 py-3 bg-white rounded-xl text-stone-700 font-bold text-sm shadow-sm hover:bg-stone-50 transition-colors flex items-center justify-center gap-2 border border-stone-100"
            >
              View Details <Eye size={16} />
            </button>
          </div>
        )}

        {goal.status === "verifying" && (
          <div className="bg-white/50 p-3 rounded-xl text-center text-xs font-bold text-stone-500 flex items-center justify-center gap-2">
            <Clock size={14} className="animate-spin" /> Verifying...
          </div>
        )}
      </CuteCard>
    </div>
  );
};

export default GoalCard;

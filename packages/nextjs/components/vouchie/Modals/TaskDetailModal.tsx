import React, { useEffect, useMemo, useState } from "react";
import { Goal } from "../../../types/vouchie";
import { Camera, CheckCircle, SmileySad, X } from "@phosphor-icons/react";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSubmit: (goalId: number, proof: string) => void;
  onGiveUp: (goalId: number) => void;
  onExtend: (goalId: number) => void;
}

const TaskDetailModal = ({ isOpen, onClose, goal, onSubmit, onGiveUp }: TaskDetailModalProps) => {
  const [proofText, setProofText] = useState("");
  const [now, setNow] = useState(Date.now());

  // Update time every second for live countdown
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Calculate time remaining and urgency
  const timeData = useMemo(() => {
    if (!goal) return { hoursLeft: 0, minutesLeft: 0, secondsLeft: 0, percentRemaining: 0, urgency: "safe" };

    const totalMs = goal.deadline - (goal.startTime || now - 3600000); // Assume 1h if no start
    const remainingMs = Math.max(0, goal.deadline - now);

    const hoursLeft = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutesLeft = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const secondsLeft = Math.floor((remainingMs % (1000 * 60)) / 1000);
    const percentRemaining = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));

    let urgency: "safe" | "warning" | "danger" = "safe";
    if (hoursLeft < 1) urgency = "danger";
    else if (hoursLeft < 4) urgency = "warning";

    return { hoursLeft, minutesLeft, secondsLeft, percentRemaining, urgency };
  }, [goal, now]);

  if (!isOpen || !goal) return null;
  const isSolo = goal.mode === "Solo";

  // SVG ring calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeData.percentRemaining / 100) * circumference;

  // Color based on urgency
  const ringColor = timeData.urgency === "danger" ? "#EF4444" : timeData.urgency === "warning" ? "#F59E0B" : "#22C55E";

  const bgGlow =
    timeData.urgency === "danger"
      ? "shadow-[0_0_60px_rgba(239,68,68,0.3)]"
      : timeData.urgency === "warning"
        ? "shadow-[0_0_60px_rgba(245,158,11,0.2)]"
        : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-stone-900 w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto ${bgGlow}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-1 block">
              {goal.mode} Quest
            </span>
            <h3 className="text-xl font-bold text-white leading-tight">{goal.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-stone-800 rounded-full hover:bg-stone-700 transition-colors text-stone-400"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Countdown Ring with Money */}
        <div className="flex justify-center my-6">
          <div className="relative">
            {/* SVG Ring */}
            <svg width="180" height="180" className="transform -rotate-90">
              {/* Background ring */}
              <circle cx="90" cy="90" r={radius} stroke="#374151" strokeWidth="8" fill="none" />
              {/* Progress ring - smooth transition */}
              <circle
                cx="90"
                cy="90"
                r={radius}
                stroke={ringColor}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
              />
            </svg>

            {/* Center content - Money being ripped */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Money graphic */}
              <div
                className={`text-5xl mb-1 ${timeData.urgency === "danger" ? "animate-pulse" : ""}`}
                style={{
                  filter: timeData.urgency === "danger" ? "grayscale(0.5)" : "none",
                  transform: timeData.urgency === "danger" ? "scale(0.9)" : "scale(1)",
                  transition: "all 0.3s",
                }}
              >
                💸
              </div>
              {/* Stake amount */}
              <div className="text-center">
                <span className="text-2xl font-bold text-white">${goal.stake}</span>
                <span className="text-xs text-stone-400 ml-1">USDC</span>
              </div>
            </div>

            {/* Urgency indicator */}
            {timeData.urgency === "danger" && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                HURRY!
              </div>
            )}
          </div>
        </div>

        {/* Time remaining text - now with seconds */}
        <div className="text-center mb-6">
          <div
            className={`text-3xl font-bold tabular-nums ${
              timeData.urgency === "danger"
                ? "text-red-400"
                : timeData.urgency === "warning"
                  ? "text-amber-400"
                  : "text-green-400"
            }`}
          >
            {timeData.hoursLeft}h {timeData.minutesLeft}m {timeData.secondsLeft}s
          </div>
          <p className="text-stone-500 text-sm font-semibold">remaining</p>
        </div>

        {/* Submit Proof Section */}
        <div className="bg-stone-800 p-4 rounded-2xl mb-4 border border-stone-700">
          <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
            <Camera size={16} weight="bold" className="text-stone-400" /> Submit Proof
          </h4>
          <div className="bg-stone-700/50 p-4 rounded-xl border-2 border-dashed border-stone-600 mb-3 flex items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-700 hover:border-stone-500 transition-all">
            <span className="text-sm font-semibold">Tap to upload photo</span>
          </div>
          {!isSolo && (
            <textarea
              rows={2}
              placeholder="Tell your vouchie you did it..."
              className="w-full bg-stone-700/50 p-3 rounded-xl outline-none font-semibold text-sm text-stone-200 resize-none mb-3 placeholder:text-stone-500 border border-stone-600 focus:border-stone-500"
              value={proofText}
              onChange={e => setProofText(e.target.value)}
            />
          )}
          <button
            onClick={() => onSubmit(goal.id, proofText)}
            className="w-full py-3.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <CheckCircle size={18} weight="bold" /> Mark as Done
          </button>
        </div>

        {/* Give Up Button - Opens GiveUpModal */}
        <button
          onClick={() => onGiveUp(goal.id)}
          className="w-full py-3 text-red-400 font-bold hover:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-red-900/50"
        >
          <SmileySad size={16} weight="bold" /> I Can&apos;t Do This
        </button>
      </div>
    </div>
  );
};

export default TaskDetailModal;

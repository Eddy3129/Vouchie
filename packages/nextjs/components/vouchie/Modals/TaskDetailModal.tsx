import React, { useEffect, useMemo, useState } from "react";
import { Goal } from "../../../types/vouchie";
import { ArrowRight, Bank, Camera, HandCoins, PaperPlaneTilt, SmileySad, X } from "@phosphor-icons/react";
import { buildProofSubmittedCast } from "~~/utils/castHelpers";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSubmit: (goalId: number, proof: string) => void;
  onGiveUp: (goalId: number) => void;
  onExtend: (goalId: number) => void;
  onComposeCast?: (params: { text: string; embeds?: string[] }) => void;
}

const TaskDetailModal = ({
  isOpen,
  onClose,
  goal,
  onSubmit,
  onGiveUp,
  onComposeCast,
  onSettle,
  onClaim,
}: TaskDetailModalProps & { onSettle?: (id: number) => void; onClaim?: (id: number, index: number) => void }) => {
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

  // Handle submit - now casts for BOTH Solo and Squad modes
  const handleSubmit = () => {
    // Always prompt to cast for both modes
    if (onComposeCast) {
      const appUrl = typeof window !== "undefined" ? window.location.origin : "https://vouchie.app";

      // Get vouchie usernames for @mentions (Squad mode only)
      const vouchieUsernames = goal.vouchies
        .filter(v => v.username)
        .slice(0, 3)
        .map(v => v.username as string);

      const castContent = buildProofSubmittedCast(appUrl, {
        goalId: goal.id,
        title: goal.title,
        stake: goal.stake,
        deadline: goal.deadline,
        mode: goal.mode as "Solo" | "Squad",
        vouchieUsernames: vouchieUsernames,
        proofText: proofText,
      });

      onComposeCast(castContent);
    }

    // Call onSubmit to process the verification
    onSubmit(goal.id, proofText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto border border-stone-200 dark:border-transparent ${bgGlow}`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5A2B] dark:text-orange-400 mb-1 block">
              {goal.mode} Quest
            </span>
            <h3 className="text-xl font-bold text-stone-800 dark:text-white leading-tight">{goal.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-stone-500 dark:text-stone-400"
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
              <circle
                cx="90"
                cy="90"
                r={radius}
                stroke="#E5E7EB"
                className="dark:stroke-[#374151]"
                strokeWidth="8"
                fill="none"
              />
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
                <span className="text-2xl font-bold text-stone-800 dark:text-white">${goal.stake}</span>
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

        {/* Time remaining or Status */}
        <div className="text-center mb-6">
          {goal.resolved ? (
            <div className="flex flex-col items-center">
              <div
                className={`text-4xl font-black ${goal.successful ? "text-green-500" : "text-red-500"} flex items-center gap-2 mb-2 tracking-tight`}
              >
                {goal.successful ? "SUCCESS" : "FAILED"}
              </div>

              {/* Fund Destination Card */}
              <div
                className={`w-full bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4 border border-stone-100 dark:border-stone-700/50 mb-2 mt-2`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Resolution Payout
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${goal.successful ? "bg-green-100 dark:bg-green-900/30 text-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-600"}`}
                  >
                    {goal.successful ? "Refund" : "Slashed"}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${goal.successful ? "bg-green-500" : "bg-red-500"} text-white shadow-lg shadow-inner`}
                  >
                    {goal.successful ? <HandCoins size={24} weight="fill" /> : <Bank size={24} weight="fill" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xl font-black text-stone-800 dark:text-white leading-none mb-1">
                      ${goal.stake} <span className="text-[10px] text-stone-400 font-bold">USDC</span>
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {goal.successful ? (
                        <>
                          to be claimed by{" "}
                          <span className="font-bold text-stone-700 dark:text-stone-200">
                            @{goal.creatorUsername || "creator"}
                          </span>
                        </>
                      ) : isSolo ? (
                        <>
                          sent to{" "}
                          <span className="font-bold text-red-600/80 dark:text-red-400/80">Protocol Treasury</span>
                        </>
                      ) : (
                        "distributed to the Squad"
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : now > goal.deadline ? (
            <div className="flex flex-col items-center">
              <div className="text-4xl font-black text-amber-500 mb-2 tracking-tight">EXPIRED</div>

              {/* Expected Resolution Preview */}
              <div className="w-full bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-4 border border-amber-100 dark:border-amber-900/30 mb-2 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-amber-500/80 uppercase tracking-widest">
                    Pending Resolution
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600">
                    Expired
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-400 text-white shadow-lg">
                    <Bank size={24} weight="fill" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xl font-black text-stone-800 dark:text-white leading-none mb-1">
                      ${goal.stake} <span className="text-[10px] text-stone-400 font-bold">USDC</span>
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      will be{" "}
                      {isSolo ? (
                        <>
                          sent to <span className="font-bold text-amber-600">Protocol Treasury</span>
                        </>
                      ) : (
                        <>
                          split by <span className="font-bold text-amber-600">The Squad</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
              <p className="text-stone-500 text-sm font-semibold uppercase tracking-wider">remaining</p>
            </>
          )}
        </div>

        {/* Vouchies Section - Show who will verify (Squad mode only) */}
        {!isSolo && goal.vouchies.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl mb-4 border border-purple-200 dark:border-purple-800/50">
            <h4 className="font-bold text-purple-700 dark:text-purple-300 mb-3 text-sm">
              👥 Your Vouchies ({goal.vouchies.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {goal.vouchies.map((vouchie, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white dark:bg-stone-800 px-3 py-2 rounded-full border border-purple-200 dark:border-purple-700"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {vouchie.username ? vouchie.username.charAt(0).toUpperCase() : vouchie.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                    {vouchie.username ? `@${vouchie.username}` : vouchie.name}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-purple-600 dark:text-purple-400 text-xs mt-3">
              They will verify your proof via Farcaster
            </p>
          </div>
        )}

        {/* Settlement / Claiming Actions */}
        {!goal.resolved && now > goal.deadline && (
          <button
            onClick={() => onSettle?.(goal.id)}
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-orange-500/20 mb-4"
          >
            Settle Goal Now <ArrowRight size={18} weight="bold" />
          </button>
        )}

        {goal.resolved && !goal.userHasClaimed && goal.stake > 0 && (
          <button
            onClick={() => onClaim?.(goal.id, goal.currentUserVouchieIndex || 0)}
            className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/20 mb-4"
          >
            Claim {goal.successful ? "Refund" : "Share"} (+${goal.stake}) <HandCoins size={18} weight="bold" />
          </button>
        )}

        {goal.resolved && goal.userHasClaimed && (
          <div className="bg-stone-100 dark:bg-stone-800 p-4 rounded-xl text-center mb-4 border border-stone-200 dark:border-stone-700">
            <p className="text-sm font-bold text-stone-400">✅ Payout Collected</p>
          </div>
        )}

        {/* Submit Proof Section - Only if active */}
        {!goal.resolved && now <= goal.deadline && (
          <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-2xl mb-4 border border-stone-200 dark:border-stone-700">
            <h4 className="font-bold text-stone-800 dark:text-white mb-3 flex items-center gap-2 text-sm">
              <Camera size={16} weight="bold" className="text-stone-400" /> Submit Proof
            </h4>
            <p className="text-stone-500 dark:text-stone-400 text-xs mb-3">
              Your proof will be shared via Farcaster cast. Add a message below!
            </p>
            <textarea
              rows={2}
              placeholder={
                isSolo ? "Add a message to your celebration post..." : "Tell your vouchies what you accomplished..."
              }
              className="w-full bg-stone-100 dark:bg-stone-700/50 p-3 rounded-xl outline-none font-semibold text-sm text-stone-800 dark:text-stone-200 resize-none mb-3 placeholder:text-stone-400 dark:placeholder:text-stone-500 border border-stone-200 dark:border-stone-600 focus:border-stone-400 dark:focus:border-stone-500"
              value={proofText}
              onChange={e => setProofText(e.target.value)}
            />
            <button
              onClick={handleSubmit}
              className={`w-full py-3.5 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 text-sm ${
                isSolo ? "bg-green-500 hover:bg-green-600" : "bg-purple-500 hover:bg-purple-600"
              }`}
            >
              {isSolo ? (
                <>
                  <PaperPlaneTilt size={18} weight="bold" /> Complete & Share
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={18} weight="bold" /> Cast Proof to Vouchies
                </>
              )}
            </button>
            <p className="text-stone-500 text-xs text-center mt-2">
              {isSolo ? "Share your win with your followers! 🎉" : "Your vouchies will verify via the cast embed"}
            </p>
          </div>
        )}

        {/* Give Up Button - Only if active */}
        {!goal.resolved && now <= goal.deadline && (
          <button
            onClick={() => onGiveUp(goal.id)}
            className="w-full py-3 text-red-400 font-bold hover:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-red-900/50"
          >
            <SmileySad size={16} weight="bold" /> I Can&apos;t Do This
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskDetailModal;

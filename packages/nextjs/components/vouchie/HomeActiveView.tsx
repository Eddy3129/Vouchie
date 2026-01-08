import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Goal } from "../../types/vouchie";
import { ArrowRight, CheckCircle, Clock, ShieldCheck, User } from "@phosphor-icons/react";

// --- Component: Single Flip Digit ---
const FlipDigit = ({ val, colorClass }: { val: string; colorClass: string }) => {
  // displayedDigit is what's currently shown - only updates AFTER flip completes
  const [displayedDigit, setDisplayedDigit] = useState(val);
  const [isFlipping, setIsFlipping] = useState(false);
  const [nextDigit, setNextDigit] = useState(val);
  const isFirstRender = useRef(true);

  // Use useLayoutEffect to synchronously detect changes before paint
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only trigger flip if the value actually changed from what's displayed
    if (val !== displayedDigit && !isFlipping) {
      setNextDigit(val);
      setIsFlipping(true);
    }
  }, [val, displayedDigit, isFlipping]);

  // When flip animation ends, update the displayed digit
  useEffect(() => {
    if (isFlipping) {
      const timer = setTimeout(() => {
        setDisplayedDigit(nextDigit);
        setIsFlipping(false);
      }, 600); // Duration matches CSS animation
      return () => clearTimeout(timer);
    }
  }, [isFlipping, nextDigit]);

  // What to show during animation vs static state
  const topStaticDigit = isFlipping ? nextDigit : displayedDigit; // New digit revealed under flip
  const bottomStaticDigit = displayedDigit; // Old digit (or current when not flipping)
  const topFlapDigit = displayedDigit; // Old digit on the flipping panel
  const bottomFlapDigit = nextDigit; // New digit coming up from below

  return (
    <div className="relative w-8 h-12" style={{ perspective: "400px" }}>
      {/* --- STATIC LAYER (Behind) --- */}
      {/* Top Half - Shows digit that will be revealed (next digit during flip) */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-stone-900 rounded-t-lg overflow-hidden border-b border-black/40 z-0 flex justify-center items-end">
        <span
          className={`text-2xl font-black tracking-tighter translate-y-[50%] ${colorClass}`}
          style={{ fontFamily: "'Pixelify Sans', monospace" }}
        >
          {topStaticDigit}
        </span>
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Bottom Half - Shows current/old digit (will be covered by flip) */}
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-stone-900 rounded-b-lg overflow-hidden border-t border-white/5 z-0 flex justify-center items-start shadow-xl">
        <span
          className={`text-2xl font-black tracking-tighter -translate-y-[50%] ${colorClass}`}
          style={{ fontFamily: "'Pixelify Sans', monospace" }}
        >
          {bottomStaticDigit}
        </span>
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* --- ANIMATION LAYERS (Front) --- */}
      {/* Top Flipping Card - Shows OLD digit, flips down to reveal new digit underneath */}
      <div
        className={`absolute top-0 left-0 w-full h-1/2 bg-stone-900 rounded-t-lg overflow-hidden border-b border-black/40 z-10 origin-bottom backface-hidden flex justify-center items-end ${
          isFlipping ? "animate-flip-down" : ""
        }`}
        style={{ transformStyle: "preserve-3d" }}
      >
        <span
          className={`text-2xl font-black tracking-tighter translate-y-[50%] ${colorClass}`}
          style={{ fontFamily: "'Pixelify Sans', monospace" }}
        >
          {topFlapDigit}
        </span>
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
      </div>

      {/* Bottom Flipping Card - Shows NEW digit, flips up to cover old digit */}
      <div
        className={`absolute top-1/2 left-0 w-full h-1/2 bg-stone-900 rounded-b-lg overflow-hidden border-t border-white/5 z-10 origin-top backface-hidden flex justify-center items-start ${
          isFlipping ? "animate-flip-up" : "hidden"
        }`}
        style={{ transform: "rotateX(180deg)" }}
      >
        <span
          className={`text-2xl font-black tracking-tighter -translate-y-[50%] ${colorClass}`}
          style={{ fontFamily: "'Pixelify Sans', monospace" }}
        >
          {bottomFlapDigit}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
    </div>
  );
};

// --- Component: Group of two digits ---
const FlipGroup = ({ val, colorClass, label }: { val: string; colorClass: string; label: string }) => {
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1 items-center">
        <FlipDigit val={val[0] || "0"} colorClass={colorClass} />
        <FlipDigit val={val[1] || "0"} colorClass={colorClass} />
      </div>
      <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 mt-2">{label}</span>
    </div>
  );
};

interface HomeActiveViewProps {
  activeGoal: Goal | undefined;
  upcomingGoals: Goal[];
  completedGoals: Goal[];
  onVerify: (goal: Goal) => void;
  onStart: (goal: Goal) => void;
  onSettle: (goalId: number) => void;
  onForfeit: (goalId: number) => void;
  onCreate: () => void;
  isBlockingSettle?: boolean;
}

const HomeActiveView = ({
  activeGoal,
  upcomingGoals,
  completedGoals,
  onVerify,
  onStart,
  onSettle,
  onForfeit,
  onCreate,
  isBlockingSettle = false,
}: HomeActiveViewProps) => {
  const [showCompleted, setShowCompleted] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to get time units
  const getTimeUnits = (deadline: number) => {
    const diff = deadline - now;
    if (diff <= 0) return { h: "00", m: "00", s: "00", expired: true };
    const h = Math.floor(diff / (1000 * 60 * 60))
      .toString()
      .padStart(2, "0");
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      .toString()
      .padStart(2, "0");
    const s = Math.floor((diff % (1000 * 60)) / 1000)
      .toString()
      .padStart(2, "0");
    return { h, m, s, expired: false };
  };

  const getTimeRemaining = (deadline: number) => {
    const diff = deadline - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const isUrgent = activeGoal ? activeGoal.deadline - now < 1000 * 60 * 60 * 4 && !activeGoal.resolved : false;
  const isMatured = activeGoal ? activeGoal.deadline < now && !activeGoal.resolved : false;

  // Filter completed goals to only show those from TODAY
  const completedToday = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return completedGoals.filter(goal => {
      const goalDate = new Date(goal.deadline);
      return goalDate >= startOfToday;
    });
  }, [completedGoals]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-8 px-6">
      <style>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        @keyframes flip-down {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-180deg); }
        }
        
        @keyframes flip-up {
          0% { transform: rotateX(180deg); }
          100% { transform: rotateX(0deg); }
        }
        
        .animate-flip-down {
          animation: flip-down 0.6s cubic-bezier(0.455, 0.030, 0.515, 0.955) forwards;
        }
        
        .animate-flip-up {
          animation: flip-up 0.6s cubic-bezier(0.455, 0.030, 0.515, 0.955) forwards;
        }
      `}</style>
      {/* 1. HERO SECTION: Active Commitment */}
      {activeGoal ? (
        <div className="relative overflow-hidden rounded-[2rem] bg-white dark:bg-stone-900 shadow-xl border-2 border-stone-100 dark:border-stone-800 p-6 text-center group transition-all hover:shadow-2xl hover:scale-[1.01]">
          {/* Background Glow & Urgent Pulse */}
          <div
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] opacity-40 pointer-events-none transition-all duration-1000 ${
              isUrgent ? "bg-red-500 animate-pulse" : isMatured ? "bg-amber-500" : "bg-orange-500"
            }`}
          />

          {/* Animated Glow Border for Urgency */}
          {isUrgent && (
            <div className="absolute inset-0 rounded-[2rem] border-2 border-red-500/20 animate-pulse pointer-events-none" />
          )}

          <div className="relative z-10 flex flex-col items-center">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 mb-6 border border-stone-200 dark:border-stone-700 backdrop-blur-md">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${isMatured ? "bg-amber-500" : isUrgent ? "bg-red-500" : "bg-green-500"}`}
              />
              <span className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-widest">
                {isMatured ? "Pending Resolve" : "Active"}
              </span>
            </div>

            {/* Task Title */}
            <h1 className="text-3xl font-black text-stone-900 dark:text-white mb-6 leading-[1.1] font-serif">
              {activeGoal.title}
            </h1>

            {/* Refined Countdown Display */}
            <div className="flex flex-col items-center w-full max-w-[320px] mb-8">
              <div className="w-full flex justify-center gap-3 mb-4">
                {(() => {
                  const { h, m, s } = getTimeUnits(activeGoal.deadline);
                  return (
                    <>
                      {[
                        { val: h, label: "Hours" },
                        { val: m, label: "Mins" },
                        { val: s, label: "Secs" },
                      ].map((unit, idx) => (
                        <div key={idx} className="flex-1 px-1">
                          <FlipGroup val={unit.val} colorClass="text-white" label={unit.label} />
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>

              {/* Stake Amount Sub-label */}
              <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-800/80 px-4 py-2 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm">
                <ShieldCheck size={16} weight="fill" className="text-orange-500" />
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">
                  Pledged Stake:{" "}
                  <span className="text-stone-900 dark:text-white ml-1">
                    $
                    {activeGoal.stake.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            {isMatured ? (
              <div className="w-full max-w-sm space-y-3">
                <button
                  onClick={() => onSettle(activeGoal.id)}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-amber-500/20 transition-all flex items-center justify-center gap-3 transform active:scale-95"
                >
                  Settle <ArrowRight size={20} weight="bold" />
                </button>
                <button
                  onClick={() => onForfeit(activeGoal.id)}
                  className="w-full py-3 bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-xl font-bold text-sm hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Forfeit
                </button>
              </div>
            ) : activeGoal.status === "verifying" ? (
              <button
                disabled
                className="w-full max-w-sm py-3 bg-amber-600 text-white rounded-2xl font-bold text-lg shadow-lg flex flex-col items-center justify-center gap-2 cursor-not-allowed opacity-90"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying...</span>
                </div>

                {/* Verification Progress */}
                {activeGoal.mode === "Squad" && activeGoal.vouchies && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: activeGoal.vouchies.length || 0 }).map((_, i) => {
                        const totalVotes = (activeGoal.votesValid || 0) + (activeGoal.votesInvalid || 0);
                        const isVoted = i < totalVotes;
                        return (
                          <User
                            key={i}
                            weight={isVoted ? "fill" : "bold"}
                            className={`w-4 h-4 ${isVoted ? "text-white" : "text-white/50"}`}
                          />
                        );
                      })}
                    </div>
                    <span className="text-xs font-medium text-white/80">
                      {(activeGoal.votesValid || 0) + (activeGoal.votesInvalid || 0)}/{activeGoal.vouchies.length}{" "}
                      Verified
                    </span>
                  </div>
                )}
              </button>
            ) : activeGoal.status === "in_progress" ? (
              <button
                onClick={() => onVerify(activeGoal)}
                className="w-full max-w-sm py-4 bg-[#FF8C00] hover:bg-[#EF6C00] text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-3 transform active:scale-95"
              >
                Complete <ArrowRight size={20} weight="bold" />
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
            disabled={isBlockingSettle}
            className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all transform active:scale-95 ${
              isBlockingSettle
                ? "bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed opacity-75"
                : "bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] text-white dark:text-stone-900"
            }`}
          >
            {isBlockingSettle ? "Settle Matured Goals to Create" : "Create New Commitment"}
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
                    ${goal.stake.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. COLLAPSED: Completed */}
      {completedToday.length > 0 && (
        <div className="px-2">
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="w-full flex items-center justify-between text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors p-2"
          >
            <span className="text-xs font-bold uppercase tracking-widest">
              Completed Today ({completedToday.length})
            </span>
            <ArrowRight
              size={14}
              weight="bold"
              className={`transform transition-transform ${showCompleted ? "rotate-90" : ""}`}
            />
          </button>

          {showCompleted && (
            <div className="mt-3 grid gap-2 animate-in slide-in-from-top-2 duration-200">
              {completedToday.map(goal => (
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

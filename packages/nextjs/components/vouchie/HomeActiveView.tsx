import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Goal } from "../../types/vouchie";
import { ArrowRight, CheckCircle, Clock, ShieldCheck, Spinner, User } from "@phosphor-icons/react";

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
  creationStep?: "idle" | "approving" | "creating";
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
  creationStep = "idle",
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

  // Urgency levels based on time remaining
  const timeRemaining = activeGoal ? activeGoal.deadline - now : 0;
  const isCritical = activeGoal ? timeRemaining < 1000 * 60 * 60 * 1 && !activeGoal.resolved : false; // < 1 hour
  const isWarning = activeGoal ? timeRemaining < 1000 * 60 * 60 * 12 && !isCritical && !activeGoal.resolved : false; // < 12 hours
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

  // Determine glow color based on urgency
  const glowColor = isCritical
    ? "bg-red-500 animate-pulse"
    : isWarning
      ? "bg-amber-400 animate-pulse"
      : isMatured
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <div className="flex flex-col min-h-[60vh] animate-in fade-in duration-500 pb-8 px-6">
      {/* 1. HERO SECTION: Active Commitment */}
      {activeGoal ? (
        <div className="flex-1 flex flex-col justify-center">
          <div className="card-hero group hover:shadow-2xl hover:scale-[1.01] animate-cycle-pulse">
            {/* Background Glow & Urgent Pulse */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] opacity-40 pointer-events-none transition-all duration-1000 ${glowColor}`}
            />

            <div className="relative z-10 flex flex-col items-center">
              {/* Status Pill */}
              <div className="status-pill mb-6">
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${isMatured ? "bg-amber-500" : isCritical ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-green-500"}`}
                />
                <span className="text-xs font-bold text-stone-500 dark:text-stone-300 uppercase tracking-widest">
                  {isMatured ? "Pending Resolve" : "Active"}
                </span>
              </div>

              {/* Task Title */}
              <h1 className="text-hero mb-6">{activeGoal.title}</h1>

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
                      {activeGoal.stake.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </span>
                </div>
              </div>

              {/* Primary Action Button */}
              {isMatured ? (
                (() => {
                  // For Squad mode: require at least 1 vote before allowing settle
                  const isSquad = activeGoal.mode === "Squad" && activeGoal.vouchies && activeGoal.vouchies.length > 0;
                  const totalVotes = (activeGoal.votesValid || 0) + (activeGoal.votesInvalid || 0);
                  const canSettle = !isSquad || totalVotes > 0;

                  return (
                    <div className="w-full max-w-sm space-y-3">
                      {canSettle ? (
                        <button onClick={() => onSettle(activeGoal.id)} className="btn-primary-lg">
                          Settle <ArrowRight size={20} weight="bold" />
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-3 bg-amber-600/80 text-white rounded-2xl font-bold text-lg shadow-lg flex flex-col items-center justify-center gap-2 cursor-not-allowed opacity-90"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Awaiting Verification</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: activeGoal.vouchies?.length || 0 }).map((_, i) => (
                              <User key={i} weight="bold" className="w-4 h-4 text-white/50" />
                            ))}
                          </div>
                          <span className="text-xs text-white/70">0/{activeGoal.vouchies?.length} vouchies voted</span>
                        </button>
                      )}
                      <button onClick={() => onForfeit(activeGoal.id)} className="btn-secondary-lg">
                        Forfeit
                      </button>
                    </div>
                  );
                })()
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
                  className="btn-primary-lg bg-[#FF8C00] hover:bg-[#EF6C00] hover:shadow-orange-500/20"
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
        </div>
      ) : (
        /* Empty State */
        <div className="card-empty">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6 text-orange-500">
            <span className="text-4xl">🧘</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200 mb-2">No active commitments</h2>
          <p className="text-stone-500 dark:text-stone-400 max-w-md mb-8">
            The mind is calm, but progress requires action. Set a new goal to build momentum.
          </p>
          <button
            onClick={onCreate}
            disabled={isBlockingSettle || creationStep !== "idle"}
            className={`px-8 py-4 rounded-2xl font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
              isBlockingSettle || creationStep !== "idle"
                ? "bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed opacity-75"
                : "bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] text-white dark:text-stone-900"
            }`}
          >
            {creationStep !== "idle" ? (
              <>
                <Spinner size={20} className="animate-spin" />
                {creationStep === "approving" ? "Approving..." : "Creating..."}
              </>
            ) : isBlockingSettle ? (
              "Settle Matured Goals to Create"
            ) : (
              "Create New Commitment"
            )}
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
                  <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-yellow-500">
                    <Clock size={20} weight="fill" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-700 dark:text-stone-200 text-sm">{goal.title}</h4>
                    <p className="text-[10px] font-bold text-stone-400 uppercase mt-0.5">
                      {goal.status === "verifying"
                        ? "Verifying..."
                        : (() => {
                            const timeStr = getTimeRemaining(goal.deadline);
                            return timeStr === "Expired" ? "Expired" : `Due in ${timeStr}`;
                          })()}
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

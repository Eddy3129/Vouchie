import React, { useEffect, useRef, useState } from "react";
import { Goal } from "../../types/vouchie";
import GoalCard from "./GoalCard";

interface TimelineViewProps {
  goals: Goal[];
  onStart: (goal: Goal) => void;
  onViewDetails: (goal: Goal) => void;
}

const PIXELS_PER_HOUR = 80;
const START_HOUR = 0;
const END_HOUR = 24;

const TimelineView = ({ goals, onStart, onViewDetails }: TimelineViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTimeTop, setCurrentTimeTop] = useState<number>(0);

  // Filter relevant goals for today (or displaying all active if simpler for MVP)
  // For now, we display all pending/in_progress goals.
  // Ideally, we'd filter by "scheduled for today".
  // Assuming 'goals' passed in are already relevant.

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  // Update current time indicator
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const minutesSinceStart = now.getHours() * 60 + now.getMinutes();
      setCurrentTimeTop((minutesSinceStart / 60) * PIXELS_PER_HOUR);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    // Scroll to current time on mount
    if (containerRef.current) {
      const now = new Date();
      const scrollPos = ((now.getHours() * 60 + now.getMinutes()) / 60) * PIXELS_PER_HOUR - 200; // Center it a bit
      containerRef.current.scrollTop = scrollPos;
    }

    return () => clearInterval(interval);
  }, []);

  const getGoalStyle = (goal: Goal) => {
    const start = new Date(goal.startTime || goal.createdAt || Date.now()); // Fallback to createdAt or now
    // If goal is "pending" and has no specific start time, maybe defaulting to "now" or "9am" isn't right?
    // But for this view, we need a time.
    // If it's a scheduled goal, it should have a deadline.
    // Let's assume deadline - duration = start time if start time is missing?
    // Or just use startTime if present.

    // Improve logic:
    // If goal.startTime exists, use it.
    // If not, but goal.deadline exists, and we have a duration?
    // Let's use user provided startTime from AddModal logic.

    // NOTE: In AddModal we set startTime.

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const top = (startMinutes / 60) * PIXELS_PER_HOUR;

    // Calculate duration
    let durationMinutes = 60; // Default 1 hour
    if (goal.deadline) {
      const end = new Date(goal.deadline);
      const diffMs = end.getTime() - start.getTime();
      durationMinutes = diffMs / (1000 * 60);
    }

    // Cap minimum height for visibility
    const height = Math.max(30, (durationMinutes / 60) * PIXELS_PER_HOUR);

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  return (
    <div className="flex bg-stone-50 dark:bg-stone-900/50 rounded-3xl overflow-hidden border border-stone-200 dark:border-stone-800 h-[600px] relative">
      {/* Time Labels Column */}
      <div className="w-16 flex-shrink-0 bg-stone-100 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 overflow-hidden relative">
        <div
          className="absolute inset-0 overflow-hidden"
          ref={containerRef /* Sync scroll? No need if main scroll handles it */}
        >
          {/* We need main container to scroll both, so actually wrap inputs together */}
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative custom-scrollbar flex"
        style={{ height: "100%" }}
      >
        {/* Time Labels (sticky left inside scroll container not easy, so separate col approach usually better, but let's try clean flex) */}
        <div className="w-14 flex-shrink-0 flex flex-col items-center pt-2 bg-stone-50 dark:bg-stone-900 sticky left-0 z-30 border-r border-stone-100 dark:border-stone-800">
          {hours.map(hour => (
            <div key={hour} className="h-[80px] text-xs font-bold text-stone-400 -mt-2.5">
              {hour.toString().padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Grid Content */}
        <div className="flex-1 relative min-w-[200px]">
          {/* Grid Lines */}
          {hours.map(hour => (
            <div
              key={hour}
              className="absolute w-full border-t border-stone-200 dark:border-stone-800/60"
              style={{ top: `${(hour - START_HOUR) * PIXELS_PER_HOUR}px` }}
            />
          ))}

          {/* Current Time Indicator */}
          <div
            className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none"
            style={{ top: `${currentTimeTop}px` }}
          >
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
          </div>

          {/* Goals */}
          {goals.map(goal => {
            const style = getGoalStyle(goal);
            return (
              <div
                key={goal.id}
                className="absolute w-[95%] left-[2.5%] z-10 transition-all hover:z-20 hover:scale-[1.02] hover:shadow-lg"
                style={style}
              >
                <GoalCard
                  goal={goal}
                  onStart={onStart}
                  onViewDetails={onViewDetails}
                  isTimelineMode={true}
                  variant="timeline"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

import React from "react";
import { Goal } from "../../types/vouchie";
import { Clock } from "@phosphor-icons/react";

interface TimelineTaskItemProps {
  goal: Goal;
  onClick: (goal: Goal) => void;
}

const TimelineTaskItem = ({ goal, onClick }: TimelineTaskItemProps) => {
  const hoursLeft = Math.max(0, Math.floor((goal.deadline - Date.now()) / (1000 * 60 * 60)));
  const isUrgent = hoursLeft < 4;
  const isDone = goal.status === "done";

  // Calculate time span text
  const getTimeSpan = () => {
    const deadline = new Date(goal.deadline);
    const now = new Date();
    const startHour = now.getHours();
    const endHour = deadline.getHours();
    return `${startHour.toString().padStart(2, "0")}:00 - ${endHour.toString().padStart(2, "0")}:00`;
  };

  return (
    <button
      onClick={() => onClick(goal)}
      className={`w-full text-left px-3 py-2 rounded-xl transition-all ${
        isDone
          ? "bg-stone-100 dark:bg-stone-800 opacity-60"
          : isUrgent
            ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            : "bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-sm font-bold truncate ${
            isDone
              ? "line-through text-stone-400"
              : isUrgent
                ? "text-red-600 dark:text-red-400"
                : "text-stone-700 dark:text-stone-200"
          }`}
        >
          {goal.title}
        </span>
        <div
          className={`flex items-center gap-1 text-[10px] font-bold flex-shrink-0 ${
            isUrgent ? "text-red-500" : "text-stone-400"
          }`}
        >
          <Clock size={10} weight="bold" />
          {hoursLeft}h
        </div>
      </div>
      <div className="text-[10px] text-stone-400 mt-0.5">{getTimeSpan()}</div>
    </button>
  );
};

export default TimelineTaskItem;

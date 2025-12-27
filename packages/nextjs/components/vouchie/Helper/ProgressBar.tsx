import React from "react";

interface ProgressBarProps {
  progress: number;
  color?: string;
  className?: string;
}

const ProgressBar = ({ progress, color = "bg-orange-500", className = "" }: ProgressBarProps) => (
  <div className={`h-3 bg-stone-200 rounded-full overflow-hidden ${className}`}>
    <div
      className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

export default ProgressBar;

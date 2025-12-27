import React from "react";

interface ProgressBarProps {
  progress: number;
  color: string;
}

const ProgressBar = ({ progress, color }: ProgressBarProps) => (
  <div className="h-3 w-full bg-white/50 rounded-full overflow-hidden shadow-inner">
    <div
      className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
      style={{ width: `${progress}%` }}
    />
  </div>
);

export default ProgressBar;

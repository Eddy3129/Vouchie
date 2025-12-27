import React from "react";

interface LoadingStateProps {
  variant?: "full" | "card" | "inline" | "button";
  size?: "sm" | "md" | "lg";
  text?: string;
}

const LoadingState = ({ variant = "full", size = "md", text = "Loading..." }: LoadingStateProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  if (variant === "inline" || variant === "button") {
    return (
      <div className={`flex items-center justify-center ${variant === "inline" ? "inline-flex" : ""}`}>
        <div className={`spinner ${sizeClasses[size]}`} />
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="skeleton w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
        <div className="skeleton h-16 w-full rounded" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-5/6 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className={`spinner ${sizeClasses[size]}`} />
      {text && <p className="text-sm font-semibold text-stone-500">{text}</p>}
    </div>
  );
};

export default LoadingState;

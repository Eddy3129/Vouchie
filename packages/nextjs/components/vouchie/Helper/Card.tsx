import React, { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  color?: string;
  onClick?: () => void;
  shadow?: "sm" | "md" | "lg" | "none";
}

const shadowClasses = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  none: "shadow-none",
};

const Card = ({ children, className = "", color = "bg-white", onClick, shadow = "md" }: CardProps) => {
  // Add dark mode variant for default white background
  const colorClass = color === "bg-white" ? "bg-white dark:bg-stone-800" : color;
  const baseClasses = `${colorClass} rounded-2xl p-5 ${shadowClasses[shadow]} hover-lift border border-stone-100 dark:border-stone-700`;
  const clickableClasses = onClick ? "cursor-pointer" : "";

  return (
    <div onClick={onClick} className={`${baseClasses} ${clickableClasses} ${className}`}>
      {children}
    </div>
  );
};

export default Card;

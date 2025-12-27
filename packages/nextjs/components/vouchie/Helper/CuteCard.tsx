import React, { ReactNode } from "react";

interface CuteCardProps {
  children: ReactNode;
  className?: string;
  color?: string;
  onClick?: () => void;
}

const CuteCard = ({ children, className = "", color = "bg-white", onClick }: CuteCardProps) => (
  <div onClick={onClick} className={`${color} rounded-[28px] p-5 soft-shadow ${className}`}>
    {children}
  </div>
);

export default CuteCard;

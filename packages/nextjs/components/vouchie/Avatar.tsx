import React, { useState } from "react";
import Image from "next/image";

interface AvatarProps {
  src: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  status?: "online" | "offline" | "away";
  showBorder?: boolean;
  className?: string;
  avatarColor?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-2xl",
  xl: "w-24 h-24 text-4xl",
};

const generateGradient = (name: string): string => {
  const colors = [
    ["#8B5A2B", "#A67B5B"],
    ["#FFA726", "#FFB74D"],
    ["#4CAF50", "#66BB6A"],
    ["#FF9800", "#FFB74D"],
    ["#FFA726", "#FF8A65"],
    ["#8B5A2B", "#D4A574"],
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length].join(", ");
};

const Avatar = ({ src, name, size = "md", status, showBorder = false, className = "", avatarColor }: AvatarProps) => {
  const [imageError, setImageError] = useState(false);

  if (imageError || !src) {
    const gradient = avatarColor || generateGradient(name);
    const emojis = ["🐱", "🐶", "🐰", "🐸", "🦊", "🐯", "🦄", "🐝", "🐮", "🐸", "🐻"];
    const emoji = emojis[name.length % emojis.length];

    return (
      <div
        className={`relative rounded-full flex items-center justify-center text-white font-bold ${sizeClasses[size]} ${className}`}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${gradient})`,
          }}
        />
        <span className="relative z-10 text-lg">{emoji}</span>
        {showBorder && <div className="absolute inset-0 rounded-full border-2 border-white dark:border-stone-800" />}
        {status && (
          <div
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-stone-800 ${
              status === "online" ? "bg-green-500" : status === "away" ? "bg-[#FFA726]" : "bg-stone-400"
            }`}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`relative rounded-full overflow-hidden ${sizeClasses[size]} ${className}`}>
      <Image
        src={src}
        alt={name}
        width={0}
        height={0}
        sizes="100vw"
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
      {showBorder && <div className="absolute inset-0 rounded-full border-2 border-white dark:border-stone-800" />}
      {status && (
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-stone-800 ${
            status === "online" ? "bg-green-500" : status === "away" ? "bg-[#FFA726]" : "bg-stone-400"
          }`}
        />
      )}
    </div>
  );
};

export default Avatar;

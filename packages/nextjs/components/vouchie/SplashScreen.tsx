import React, { useEffect, useState } from "react";
import { Star } from "@phosphor-icons/react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 50;
      });
    }, 500);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#FAF7F2] to-[#E8E1D5] dark:from-stone-900 dark:to-stone-800 animate-out fade-out duration-300">
      <div className="flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-700">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8B5A2B] to-[#A67B5B] dark:from-[#FFA726] dark:to-[#FF9800] rounded-3xl blur-xl opacity-20 animate-pulse" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-[#8B5A2B] to-[#A67B5B] dark:from-[#FFA726] dark:to-[#FF9800] rounded-3xl flex items-center justify-center shadow-2xl">
            <Star size={48} className="text-white dark:text-stone-900" weight="fill" />
          </div>
        </div>

        {/* Brand Name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Vouchie</h1>
          <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">Lock in your goals</p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 space-y-2">
          <div className="h-2 bg-stone-300 dark:bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#8B5A2B] to-[#A67B5B] dark:from-[#FFA726] dark:to-[#FF9800] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs font-semibold text-stone-500 dark:text-stone-400">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;

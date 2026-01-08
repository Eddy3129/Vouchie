import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);

  // Keep ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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
      setTimeout(() => onCompleteRef.current(), 300);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []); // Empty deps - only run once on mount

  if (!isVisible) return null;

  return (
    <div className="splash-bg">
      <div className="flex flex-col items-center space-y-8 animate-in zoom-in-95 duration-700">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8B5A2B] to-[#A67B5B] dark:from-[#FFA726] dark:to-[#FF9800] rounded-3xl blur-xl opacity-20 animate-pulse" />
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Image src="/logo.png" alt="Vouchie" width={96} height={96} priority />
          </div>
        </div>

        {/* Brand Name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">Vouchie</h1>
          <p className="text-sm font-semibold text-stone-500 dark:text-stone-400">Lock in your goals</p>
        </div>

        {/* Progress Bar */}
        <div className="w-48 space-y-2">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-center text-xs font-semibold text-stone-500 dark:text-stone-400">Loading...</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;

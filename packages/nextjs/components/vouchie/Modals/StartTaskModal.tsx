import React from "react";
import { Goal } from "../../../types/vouchie";
import { Camera, CaretRight, X } from "@phosphor-icons/react";

interface StartTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onStart: (goalId: number, image: string | null) => void;
}

const StartTaskModal = ({ isOpen, onClose, goal, onStart }: StartTaskModalProps) => {
  if (!isOpen || !goal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] dark:bg-stone-900 w-full max-w-md rounded-3xl p-6 shadow-md animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Ready to Start?</h3>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-stone-600 dark:text-stone-300"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 shadow-inner ring-4 ring-orange-50 dark:ring-orange-900/10">
            <Camera size={32} weight="fill" />
          </div>
          <p className="text-stone-600 dark:text-stone-300 font-bold text-lg mb-2">Motivate Yourself!</p>
          <p className="text-stone-400 dark:text-stone-500 text-sm font-semibold px-4">
            Snap a pic of your setup to lock in your start time. (Optional)
          </p>
        </div>

        <button
          className="w-full py-4 bg-stone-100 dark:bg-stone-800 border-2 border-dashed border-stone-300 dark:border-stone-700 rounded-2xl mb-4 font-bold text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 hover:border-stone-400 dark:hover:border-stone-600 transition-colors flex items-center justify-center gap-2 min-h-[52px]"
          onClick={() => onStart(goal.id, "📸")}
        >
          <Camera size={20} weight="bold" /> Tap to Snap & Start
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1"></div>
          <span className="text-xs font-bold text-stone-300 dark:text-stone-600">OR</span>
          <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1"></div>
        </div>

        <button
          onClick={() => onStart(goal.id, null)}
          className="w-full py-3 mt-4 text-stone-500 dark:text-stone-400 font-bold hover:bg-stone-100 dark:hover:bg-stone-800 rounded-2xl transition-colors flex items-center justify-center gap-2 min-h-[48px]"
        >
          Skip for now <CaretRight size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
};

export default StartTaskModal;

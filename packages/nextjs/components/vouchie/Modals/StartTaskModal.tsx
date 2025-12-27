import React from "react";
import { Goal } from "../../../types/vouchie";
import { Camera, ChevronRight, X } from "lucide-react";

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
      <div className="bg-[#FAF7F2] w-full max-w-md rounded-3xl p-6 shadow-md animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-stone-800">Ready to Start?</h3>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500 shadow-inner ring-4 ring-orange-50">
            <Camera size={32} />
          </div>
          <p className="text-stone-600 font-bold text-lg mb-2">Motivate Yourself!</p>
          <p className="text-stone-400 text-sm font-semibold px-4">
            Snap a pic of your setup to lock in your start time. (Optional)
          </p>
        </div>

        <button
          className="w-full py-4 bg-stone-100 border-2 border-dashed border-stone-300 rounded-2xl mb-4 font-bold text-stone-500 hover:bg-stone-200 hover:border-stone-400 transition-colors flex items-center justify-center gap-2 min-h-[52px]"
          onClick={() => onStart(goal.id, "📸")}
        >
          <Camera size={20} /> Tap to Snap & Start
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px bg-stone-200 flex-1"></div>
          <span className="text-xs font-bold text-stone-300">OR</span>
          <div className="h-px bg-stone-200 flex-1"></div>
        </div>

        <button
          onClick={() => onStart(goal.id, null)}
          className="w-full py-3 mt-4 text-stone-500 font-bold hover:bg-stone-100 rounded-2xl transition-colors flex items-center justify-center gap-2 min-h-[48px]"
        >
          Skip for now <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default StartTaskModal;

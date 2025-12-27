import React, { useState } from "react";
import { Goal } from "../../../types/vouchie";
import { Camera, CheckCircle2, Frown, Hourglass, Wallet, X, Zap } from "lucide-react";

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSubmit: (goalId: number, proof: string) => void;
  onGiveUp: (goalId: number) => void;
  onExtend: (goalId: number) => void;
}

const TaskDetailModal = ({ isOpen, onClose, goal, onSubmit, onGiveUp, onExtend }: TaskDetailModalProps) => {
  const [proofText, setProofText] = useState("");

  if (!isOpen || !goal) return null;
  const isSolo = goal.mode === "Solo";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] w-full max-w-md rounded-3xl p-6 shadow-md animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-stone-800 flex items-center gap-2">{goal.title}</h3>
          <button onClick={onClose} className="p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-white p-3 rounded-2xl border border-stone-100">
            <p className="text-xs text-stone-400 font-bold uppercase">At Stake</p>
            <p className="text-xl font-bold text-stone-700 flex items-center gap-1">
              <Wallet size={18} className="text-stone-400" /> USDC {goal.stake}
            </p>
          </div>
          <div className="flex-1 bg-white p-3 rounded-2xl border border-stone-100">
            <p className="text-xs text-stone-400 font-bold uppercase">Started</p>
            <p className="text-md font-bold text-stone-700 flex items-center gap-1 mt-1">
              {goal.startTime
                ? new Date(goal.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Not yet"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-100">
            <h4 className="font-bold text-stone-700 mb-2 flex items-center gap-2">
              <Camera size={18} /> Submit Final Proof
            </h4>
            <div className="bg-stone-50 p-4 rounded-xl border-2 border-dashed border-stone-200 mb-3 flex items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-100">
              <span className="text-sm font-semibold">Tap to upload photo</span>
            </div>
            {!isSolo && (
              <textarea
                rows={2}
                placeholder="Tell your vouchie you did it..."
                className="w-full bg-stone-50 p-3 rounded-xl outline-none font-bold text-sm text-stone-600 resize-none mb-3"
                value={proofText}
                onChange={e => setProofText(e.target.value)}
              />
            )}
            <button
              onClick={() => onSubmit(goal.id, proofText)}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              Mark as Done <CheckCircle2 size={18} />
            </button>
          </div>

          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-orange-800 flex items-center gap-2">
                <Hourglass size={18} /> Need more time?
              </h4>
              <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">PREMIUM</span>
            </div>
            <p className="text-xs text-orange-700 mb-3 font-semibold">Extend deadline by 12 hours for a small fee.</p>
            <button
              onClick={() => onExtend(goal.id)}
              className="w-full py-2 bg-orange-400 text-white rounded-xl font-bold hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              Extend (+12h) <Zap size={16} fill="currentColor" />
            </button>
          </div>

          <button
            onClick={() => onGiveUp(goal.id)}
            className="w-full py-3 text-red-400 font-bold hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[48px]"
          >
            <Frown size={18} /> Give Up & Lose Stake
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;

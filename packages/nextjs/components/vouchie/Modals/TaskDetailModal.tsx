import React, { useState } from "react";
import { Goal } from "../../../types/vouchie";
import { Camera, CheckCircle, Hourglass, Lightning, SmileySad, Wallet, X } from "@phosphor-icons/react";

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
      <div className="bg-[#FAF7F2] dark:bg-stone-900 w-full max-w-md rounded-3xl p-6 shadow-md animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            {goal.title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-stone-600 dark:text-stone-300"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-white dark:bg-stone-800 p-3 rounded-2xl border border-stone-100 dark:border-stone-700">
            <p className="text-xs text-stone-400 font-bold uppercase">At Stake</p>
            <p className="text-xl font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1">
              <Wallet size={18} weight="fill" className="text-stone-400" /> USDC {goal.stake}
            </p>
          </div>
          <div className="flex-1 bg-white dark:bg-stone-800 p-3 rounded-2xl border border-stone-100 dark:border-stone-700">
            <p className="text-xs text-stone-400 font-bold uppercase">Started</p>
            <p className="text-md font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1 mt-1">
              {goal.startTime
                ? new Date(goal.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Not yet"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-stone-800 p-4 rounded-2xl border border-stone-100 dark:border-stone-700">
            <h4 className="font-bold text-stone-700 dark:text-stone-200 mb-2 flex items-center gap-2">
              <Camera size={18} weight="bold" /> Submit Final Proof
            </h4>
            <div className="bg-stone-50 dark:bg-stone-700/50 p-4 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-600 mb-3 flex items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-700">
              <span className="text-sm font-semibold">Tap to upload photo</span>
            </div>
            {!isSolo && (
              <textarea
                rows={2}
                placeholder="Tell your vouchie you did it..."
                className="w-full bg-stone-50 dark:bg-stone-700/50 p-3 rounded-xl outline-none font-bold text-sm text-stone-600 dark:text-stone-300 resize-none mb-3 placeholder:text-stone-400"
                value={proofText}
                onChange={e => setProofText(e.target.value)}
              />
            )}
            <button
              onClick={() => onSubmit(goal.id, proofText)}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              Mark as Done <CheckCircle size={18} weight="bold" />
            </button>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/40">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2">
                <Hourglass size={18} weight="bold" /> Need more time?
              </h4>
              <span className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-100 text-xs font-bold px-2 py-1 rounded-full">
                PREMIUM
              </span>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300 mb-3 font-semibold">
              Extend deadline by 12 hours for a small fee.
            </p>
            <button
              onClick={() => onExtend(goal.id)}
              className="w-full py-2 bg-orange-400 text-white rounded-xl font-bold hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
            >
              Extend (+12h) <Lightning size={16} weight="fill" />
            </button>
          </div>

          <button
            onClick={() => onGiveUp(goal.id)}
            className="w-full py-3 text-red-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[48px]"
          >
            <SmileySad size={18} weight="bold" /> Give Up & Lose Stake
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;

import React, { useState } from "react";
import { CheckCircle, ShieldCheck, XCircle } from "@phosphor-icons/react";
import { Goal } from "~~/types/vouchie";

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onVote: (goalId: number, isValid: boolean) => void;
}

const VerifyModal = ({ isOpen, onClose, goal, onVote }: VerifyModalProps) => {
  const [isVoting, setIsVoting] = useState(false);

  if (!isOpen || !goal) return null;

  const handleVote = async (isValid: boolean) => {
    setIsVoting(true);
    try {
      await onVote(goal.id, isValid);
      onClose();
    } catch (err) {
      console.error("Voting failed", err);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-stone-900 w-full max-w-sm rounded-3xl p-6 animate-in zoom-in-95 duration-300 shadow-2xl border border-stone-800">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-900/30 text-blue-400 mb-3">
            <ShieldCheck size={24} weight="fill" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">Verify Completion</h3>
          <p className="text-stone-400 text-sm">
            Is <span className="text-white font-bold">&quot;{goal.title}&quot;</span> complete?
          </p>
        </div>

        {/* Stake Info */}
        <div className="bg-stone-800/50 rounded-2xl p-4 mb-6 border border-stone-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Stake at Risk</span>
            <span className="text-lg font-bold text-white">${goal.stake} USDC</span>
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            If you verify, they get their stake back. If you deny, the stake is slashed.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isVoting}
            className="w-full py-4 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-900/20"
          >
            <CheckCircle size={20} weight="fill" />
            Yes, Verify Completion
          </button>

          <button
            onClick={() => handleVote(false)}
            disabled={isVoting}
            className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20"
          >
            <XCircle size={20} weight="bold" />
            No, Deny & Slash
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={isVoting}
          className="w-full mt-4 py-2 text-stone-500 font-bold text-sm hover:text-stone-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default VerifyModal;

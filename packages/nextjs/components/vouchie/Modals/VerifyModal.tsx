import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeft, CheckCircle, ShieldCheck, Warning, XCircle } from "@phosphor-icons/react";
import { Goal } from "~~/types/vouchie";

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onVote: (goalId: number, isValid: boolean, denyReason?: string) => void;
}

const VerifyModal = ({ isOpen, onClose, goal, onVote }: VerifyModalProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [showDenyStep, setShowDenyStep] = useState(false);
  const [denyReason, setDenyReason] = useState("");

  if (!isOpen || !goal) return null;

  const handleVerify = async () => {
    setIsVoting(true);
    try {
      await onVote(goal.id, true);
      onClose();
    } catch (err) {
      console.error("Voting failed", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDeny = async () => {
    if (!denyReason.trim()) return;
    setIsVoting(true);
    try {
      await onVote(goal.id, false, denyReason);
      onClose();
    } catch (err) {
      console.error("Voting failed", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleClose = () => {
    setShowDenyStep(false);
    setDenyReason("");
    onClose();
  };

  // Get creator info
  const creatorName = goal.creatorUsername || goal.creator?.slice(0, 6) + "..." || "Someone";
  const creatorAvatar = goal.creatorAvatar;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-sm rounded-3xl p-7 animate-in zoom-in-95 duration-300 shadow-2xl border-2 border-stone-300 dark:border-stone-600">
        {!showDenyStep ? (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 mb-4">
                <ShieldCheck size={28} weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-1">Verify Proof</h3>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Did they complete this goal?</p>
            </div>

            {/* Creator Info */}
            <div className="flex items-center gap-3 mb-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border-2 border-stone-200 dark:border-stone-700">
              {creatorAvatar ? (
                <Image
                  src={creatorAvatar}
                  alt={creatorName}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B5A2B] to-[#FFA726] flex items-center justify-center text-white font-bold text-lg">
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <p className="font-bold text-stone-800 dark:text-white text-sm">@{creatorName}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">is asking for verification</p>
              </div>
            </div>

            {/* Goal Info */}
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 mb-6 border-2 border-stone-200 dark:border-stone-700">
              <h4 className="font-bold text-stone-800 dark:text-white text-lg mb-2 leading-tight">
                &ldquo;{goal.title}&rdquo;
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Stake at Risk
                </span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">${goal.stake} USDC</span>
              </div>
            </div>

            {/* What happens section */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-800 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                  If Verified
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 leading-tight">
                  They get ${goal.stake} back 🎉
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                  If Denied
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 leading-tight">You get a share 💸</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleVerify}
                disabled={isVoting}
                className="w-full py-4 bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/20"
              >
                <CheckCircle size={20} weight="fill" />
                Yes, Verify ✓
              </button>

              <button
                onClick={() => setShowDenyStep(true)}
                disabled={isVoting}
                className="w-full py-4 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 active:bg-red-200 dark:active:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-500 dark:text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-red-200 dark:border-red-500/20"
              >
                <XCircle size={20} weight="bold" />
                No, Deny
              </button>
            </div>

            <button
              onClick={handleClose}
              disabled={isVoting}
              className="w-full mt-4 py-2 text-stone-400 font-bold text-sm hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {/* Deny Step */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 mb-4">
                <Warning size={28} weight="fill" />
              </div>
              <h3 className="text-xl font-bold text-stone-800 dark:text-white mb-1">Deny Proof</h3>
              <p className="text-stone-500 dark:text-stone-400 text-sm">Please explain why you&apos;re denying</p>
            </div>

            {/* Goal reminder */}
            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4 mb-4 border-2 border-stone-200 dark:border-stone-700">
              <p className="text-sm text-stone-600 dark:text-stone-300 font-semibold">&ldquo;{goal.title}&rdquo;</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">${goal.stake} USDC will be slashed</p>
            </div>

            {/* Reason textarea */}
            <textarea
              rows={3}
              placeholder="Enter your reason for denying this proof..."
              className="w-full bg-stone-100 dark:bg-stone-800 p-4 rounded-xl outline-none font-medium text-sm text-stone-800 dark:text-stone-200 resize-none mb-4 placeholder:text-stone-400 dark:placeholder:text-stone-500 border border-stone-200 dark:border-stone-700 focus:border-red-400 dark:focus:border-red-500 transition-colors"
              value={denyReason}
              onChange={e => setDenyReason(e.target.value)}
              autoFocus
            />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDenyStep(false);
                  setDenyReason("");
                }}
                disabled={isVoting}
                className="flex-1 py-3 rounded-xl font-bold text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} weight="bold" />
                Back
              </button>
              <button
                onClick={handleDeny}
                disabled={isVoting || !denyReason.trim()}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-500/20 text-sm flex items-center justify-center gap-2"
              >
                <XCircle size={16} weight="bold" />
                Confirm Deny
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyModal;

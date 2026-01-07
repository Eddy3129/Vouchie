import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeft, CheckCircle, Warning, XCircle } from "@phosphor-icons/react";
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
      <div className="bg-[#FDFBF7] dark:bg-stone-900 w-full max-w-sm rounded-3xl p-7 animate-in zoom-in-95 duration-300 shadow-2xl border border-stone-200 dark:border-stone-800">
        {!showDenyStep ? (
          <>
            {/* Compact Header: Goal + Creator */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  Verification Required
                </span>
                <span className="text-[10px] font-bold text-stone-400 ml-auto">${goal.stake} USDC</span>
              </div>

              <h3 className="text-xl font-bold text-stone-800 dark:text-white leading-tight mb-3">{goal.title}</h3>

              <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-stone-100 dark:border-stone-700">
                {creatorAvatar ? (
                  <Image
                    src={creatorAvatar}
                    alt={creatorName}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#8B5A2B] to-[#FFA726] flex items-center justify-center text-white text-[10px] font-bold">
                    {creatorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300">@{creatorName}</span>
                <span className="text-[10px] text-stone-400 ml-auto italic">Requested verification</span>
              </div>
            </div>

            {/* Proof Text Section */}
            {goal.proofText && (
              <div className="mb-5">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1.5 px-1">
                  Submitted Proof
                </p>
                <div className="bg-white dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 italic text-sm text-stone-700 dark:text-stone-200 leading-relaxed shadow-sm">
                  &ldquo;{goal.proofText}&rdquo;
                </div>
              </div>
            )}

            {/* Action Grid (Horizontal for compactness) */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={handleVerify}
                disabled={isVoting}
                className="flex flex-col items-center justify-center p-3 py-4 bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl hover:border-green-400 dark:hover:border-green-500 group transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mb-2 group-hover:scale-110 transition-transform">
                  <CheckCircle size={24} weight="fill" />
                </div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Approve</span>
                <span className="text-xs font-bold text-stone-800 dark:text-white">Yes, Verified</span>
              </button>

              <button
                onClick={() => setShowDenyStep(true)}
                disabled={isVoting}
                className="flex flex-col items-center justify-center p-3 py-4 bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl hover:border-red-400 dark:hover:border-red-500 group transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mb-2 group-hover:scale-110 transition-transform">
                  <XCircle size={24} weight="fill" />
                </div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Reject</span>
                <span className="text-xs font-bold text-stone-800 dark:text-white">Deny Proof</span>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="w-full text-stone-400 font-bold text-xs py-2 hover:text-stone-600 dark:hover:text-stone-300"
            >
              Not now, skip
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

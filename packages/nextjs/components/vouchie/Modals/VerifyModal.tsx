import React, { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowSquareOut, CheckCircle, Warning, XCircle } from "@phosphor-icons/react";
import { Goal } from "~~/types/vouchie";

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onVote: (goalId: number, isValid: boolean, denyReason?: string) => void;
  onSettle: (goalId: number) => void;
}

const VerifyModal = ({ isOpen, onClose, goal, onVote, onSettle }: VerifyModalProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [showDenyStep, setShowDenyStep] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  /** Selected vote: null = no selection, true = approve, false = reject */
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

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
    setSelectedVote(null);
    setShowConfirmation(false);
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
                <span className="text-[10px] font-bold text-stone-400 ml-auto">
                  ${goal.stake.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                </span>
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
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Submitted Proof</p>
                  {goal.proofCastHash && (
                    <a
                      href={`https://warpcast.com/~/conversations/${goal.proofCastHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-purple-500 hover:text-purple-600 transition-colors"
                    >
                      <ArrowSquareOut size={12} weight="bold" />
                      View on Farcaster
                    </a>
                  )}
                </div>
                <div className="bg-white dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 italic text-sm text-stone-700 dark:text-stone-200 leading-relaxed shadow-sm">
                  &ldquo;{goal.proofText}&rdquo;
                </div>
              </div>
            )}

            {/* Action Grid (Horizontal for compactness) */}
            {!showConfirmation ? (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => {
                    setSelectedVote(true);
                    setShowConfirmation(true);
                  }}
                  disabled={isVoting}
                  className={`flex flex-col items-center justify-center p-3 py-4 rounded-2xl transition-all ${
                    selectedVote === true
                      ? "bg-green-500 border-2 border-green-600"
                      : "bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 border border-stone-200 dark:border-stone-700 hover:border-green-400 dark:hover:border-green-500"
                  } group`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${
                      selectedVote === true
                        ? "bg-white/20 text-white"
                        : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                    }`}
                  >
                    <CheckCircle size={24} weight="fill" />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                      selectedVote === true ? "text-green-100" : "text-stone-400"
                    }`}
                  >
                    Approve
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      selectedVote === true ? "text-white" : "text-stone-800 dark:text-white"
                    }`}
                  >
                    Yes, Verified
                  </span>
                </button>

                <button
                  onClick={() => {
                    setSelectedVote(false);
                    setShowDenyStep(true);
                  }}
                  disabled={isVoting}
                  className={`flex flex-col items-center justify-center p-3 py-4 rounded-2xl transition-all ${
                    selectedVote === false
                      ? "bg-red-500 border-2 border-red-600"
                      : "bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 border border-stone-200 dark:border-stone-700 hover:border-red-400 dark:hover:border-red-500"
                  } group`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform ${
                      selectedVote === false
                        ? "bg-white/20 text-white"
                        : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                    }`}
                  >
                    <XCircle size={24} weight="fill" />
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${
                      selectedVote === false ? "text-red-100" : "text-stone-400"
                    }`}
                  >
                    Reject
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      selectedVote === false ? "text-white" : "text-stone-800 dark:text-white"
                    }`}
                  >
                    Deny Proof
                  </span>
                </button>
              </div>
            ) : (
              /* Confirmation Step */
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl mb-4 border-2 border-green-200 dark:border-green-800 animate-in fade-in zoom-in-95 duration-200">
                <p className="text-sm font-bold text-green-800 dark:text-green-300 text-center mb-3">
                  Confirm your vote: <span className="text-green-600 dark:text-green-400">Approve</span>
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 text-center mb-4">
                  This will be recorded on-chain and cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowConfirmation(false);
                      setSelectedVote(null);
                    }}
                    className="flex-1 py-2.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={isVoting}
                    className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {isVoting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={16} weight="fill" />
                        Confirm
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {goal.deadline < Date.now() && (
              <div className="mb-4 pt-2 border-t border-stone-100 dark:border-stone-800">
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest text-center mb-2">
                  Deadline Passed
                </p>
                <button
                  onClick={() => {
                    onSettle(goal.id);
                    onClose();
                  }}
                  className="w-full py-3 bg-stone-800 dark:bg-white text-white dark:text-stone-900 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Settle with Current Votes
                </button>
              </div>
            )}

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
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                ${goal.stake.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                will be slashed
              </p>
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

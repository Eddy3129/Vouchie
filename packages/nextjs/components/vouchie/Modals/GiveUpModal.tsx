import React, { useEffect, useState } from "react";
import { Goal } from "../../../types/vouchie";
import { ArrowCounterClockwise, Lightning, SmileySad, Spinner, X } from "@phosphor-icons/react";
import { usePublicClient } from "wagmi";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

interface GiveUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: Goal | null;
  onConfirmGiveUp: (goalId: number) => void;
  onExtend: (goalId: number) => void;
}

const GiveUpModal = ({ isOpen, onClose, goal, onConfirmGiveUp, onExtend }: GiveUpModalProps) => {
  const publicClient = usePublicClient();
  const { data: vaultInfo } = useDeployedContractInfo({ contractName: "VouchieVault" });

  const [graceStatus, setGraceStatus] = useState({
    inGracePeriod: false,
    remainingSeconds: 0,
    loading: true,
  });

  // Fetch grace period status from contract (blockchain time is source of truth)
  useEffect(() => {
    if (!isOpen || !goal || !vaultInfo?.address || !publicClient) {
      setGraceStatus({ inGracePeriod: false, remainingSeconds: 0, loading: false });
      return;
    }

    const fetchGraceStatus = async () => {
      try {
        const [inGracePeriod, remainingTime] = (await publicClient.readContract({
          address: vaultInfo.address,
          abi: [
            {
              name: "getGracePeriodStatus",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "_goalId", type: "uint256" }],
              outputs: [
                { name: "inGracePeriod", type: "bool" },
                { name: "remainingTime", type: "uint256" },
              ],
            },
          ],
          functionName: "getGracePeriodStatus",
          args: [BigInt(goal.id)],
        })) as [boolean, bigint];

        setGraceStatus({
          inGracePeriod,
          remainingSeconds: Number(remainingTime),
          loading: false,
        });
      } catch (e) {
        console.error("Error fetching grace status:", e);
        setGraceStatus({ inGracePeriod: false, remainingSeconds: 0, loading: false });
      }
    };

    fetchGraceStatus();
    // Refetch every 5 seconds to stay in sync with blockchain
    const interval = setInterval(fetchGraceStatus, 5000);
    return () => clearInterval(interval);
  }, [isOpen, goal, vaultInfo?.address, publicClient]);

  if (!isOpen || !goal) return null;

  // Calculate display minutes/seconds from remainingSeconds
  const remainingMinutes = Math.floor(graceStatus.remainingSeconds / 60);
  const remainingSecs = graceStatus.remainingSeconds % 60;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 w-full max-w-xs animate-in zoom-in-95 duration-200 shadow-2xl border border-stone-100 dark:border-stone-800 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        >
          <X size={16} weight="bold" />
        </button>

        {/* Loading state */}
        {graceStatus.loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner size={32} className="animate-spin text-stone-400 mb-2" />
            <p className="text-sm text-stone-400">Checking status...</p>
          </div>
        ) : (
          <>
            {/* Icon - different for grace period vs forfeit */}
            <div className="flex justify-center mb-3">
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  graceStatus.inGracePeriod ? "bg-blue-100 dark:bg-blue-900/30" : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                <span className="text-3xl">{graceStatus.inGracePeriod ? "🔄" : "😢"}</span>
              </div>
            </div>

            {/* Title - changes based on grace period */}
            <h4 className="text-center text-lg font-bold text-stone-800 dark:text-stone-100 mb-1">
              {graceStatus.inGracePeriod ? "Cancel Goal?" : "Forfeit Goal?"}
            </h4>

            {/* Goal Title */}
            <p className="text-center text-sm font-semibold text-stone-500 dark:text-stone-400 mb-2 line-clamp-2">
              &quot;{goal.title}&quot;
            </p>

            {/* Grace Period Countdown or Warning */}
            {graceStatus.inGracePeriod ? (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold">
                  <ArrowCounterClockwise size={14} weight="bold" />
                  Free cancel: {remainingMinutes}m {remainingSecs}s left
                </div>
                <p className="text-xs text-stone-400 mt-2">You can cancel and get your full ${goal.stake} USDC back</p>
              </div>
            ) : (
              <p className="text-center text-xs font-bold text-red-500 dark:text-red-400 mb-4">
                ⚠️ You will lose your ${goal.stake} USDC stake
              </p>
            )}

            {/* Premium Option - Extend (only show after grace period) */}
            {!graceStatus.inGracePeriod && (
              <>
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 mb-3 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                      <Lightning size={14} weight="fill" className="text-white" />
                    </div>
                    <span className="text-sm font-bold text-orange-700 dark:text-orange-300">Need More Time?</span>
                    <span className="ml-auto text-[10px] font-bold bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-200 px-1.5 py-0.5 rounded-full">
                      PREMIUM
                    </span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mb-3">
                    Extend deadline by 12 hours for 5 USDC
                  </p>
                  <button
                    onClick={() => onExtend(goal.id)}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-xl font-bold text-sm hover:from-orange-500 hover:to-amber-500 transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Lightning size={16} weight="fill" /> Extend +12h
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                  <span className="text-[10px] font-bold text-stone-400">OR</span>
                  <div className="flex-1 h-px bg-stone-200 dark:bg-stone-700" />
                </div>
              </>
            )}

            {/* Confirm Button - different styling for grace period */}
            <button
              onClick={() => onConfirmGiveUp(goal.id)}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${
                graceStatus.inGracePeriod
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {graceStatus.inGracePeriod ? (
                <>
                  <ArrowCounterClockwise size={18} weight="bold" /> Cancel & Get Refund
                </>
              ) : (
                <>
                  <SmileySad size={18} weight="bold" /> Forfeit ${goal.stake} USDC
                </>
              )}
            </button>

            {/* Cancel */}
            <button
              onClick={onClose}
              className="w-full py-2 mt-2 text-stone-400 font-semibold text-sm hover:text-stone-600"
            >
              Keep Going
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GiveUpModal;

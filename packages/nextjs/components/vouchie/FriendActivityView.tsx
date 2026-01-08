import Image from "next/image";
import { ArrowSquareOut, Check, CheckCircle, HandCoins, Plus, ShieldCheck, X } from "@phosphor-icons/react";
import { useAccount } from "wagmi";
import { usePersonalActivities } from "~~/hooks/vouchie/usePersonalActivities";
import { Goal } from "~~/types/vouchie";

interface FriendActivityViewProps {
  creatorGoals?: Goal[];
  vouchieGoals?: Goal[];
  onVerify?: (goal: Goal) => void;
  onClaim?: (goalId: number, vouchieIndex: number) => void;
}

const FriendActivityView = ({ creatorGoals = [], vouchieGoals = [], onVerify, onClaim }: FriendActivityViewProps) => {
  const { address: userAddress } = useAccount();

  // Personal activities only
  const { notifications } = usePersonalActivities({
    creatorGoals,
    vouchieGoals,
    userAddress,
  });

  return (
    <div className="space-y-4 pb-24 px-6 pt-6">
      <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4">Activity</h2>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-stone-400 font-bold border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-800/50">
            <div className="text-4xl mb-3">✨</div>
            <p>No pending actions!</p>
            <p className="text-sm font-normal mt-1">You&apos;re all caught up.</p>
          </div>
        ) : (
          notifications.map(notification => {
            // Determine styles based on type
            let icon, iconBg, borderClass;

            const isVerify = notification.type === "verify_request";
            const isSlashed =
              notification.goal.status === "failed" &&
              notification.goal.creator?.toLowerCase() !== userAddress?.toLowerCase();

            // Override for Avatar (Verify Request OR Slashed)
            if (
              isVerify ||
              (isSlashed && (notification.type === "claim_available" || notification.type === "history_success"))
            ) {
              icon = (
                <div className="w-full h-full relative">
                  {notification.goal.creatorAvatar ? (
                    <Image src={notification.goal.creatorAvatar} fill className="object-cover" alt="Creator" />
                  ) : (
                    <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                      {(notification.goal.creatorUsername || "??").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              );
              iconBg = "bg-stone-100 dark:bg-stone-800 p-0 overflow-hidden ring-2 ring-white dark:ring-stone-700";

              // Border colors
              if (isVerify) borderClass = "border-l-4 border-l-purple-500";
              else borderClass = "border-l-4 border-l-transparent"; // Slashed usually transparent/red?
              if (isSlashed && notification.type === "claim_available") borderClass = "border-l-4 border-l-green-500";
            } else {
              // Default Icons
              switch (notification.type) {
                case "claim_available":
                  icon = <HandCoins size={20} weight="fill" />;
                  iconBg = "bg-green-100 dark:bg-green-900/30 text-green-600";
                  borderClass = "border-l-4 border-l-green-500";
                  break;
                case "history_success":
                case "view": // verified
                case "goal_resolved":
                  icon = <CheckCircle size={20} weight="fill" />;
                  iconBg = "bg-green-100 dark:bg-green-900/30 text-green-600";
                  borderClass = "border-l-4 border-l-transparent hover:border-l-green-400";
                  break;
                case "history_failure":
                  icon = <X size={20} weight="bold" />;
                  iconBg = "bg-red-100 dark:bg-red-900/30 text-red-600";
                  borderClass = "border-l-4 border-l-transparent hover:border-l-red-400";
                  break;
                case "vouchie_invite":
                  icon = <ShieldCheck size={20} weight="fill" />;
                  iconBg = "bg-blue-100 dark:bg-blue-900/30 text-blue-600";
                  borderClass = "border-l-4 border-l-blue-500";
                  break;
                default:
                  icon = <Plus size={20} weight="bold" />;
                  iconBg = "bg-blue-100 dark:bg-blue-900/30 text-blue-600";
                  borderClass = "border-l-4 border-l-transparent";
              }
            }

            return (
              <div
                key={notification.id}
                className={`card-base p-4 relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] ${borderClass}`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                    {icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-stone-900 dark:text-white text-sm">{notification.title}</span>
                      {notification.amount && notification.amount > 0 && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            notification.type === "claim_available" || notification.type === "history_success"
                              ? "bg-green-100 text-green-600 dark:bg-green-900/30"
                              : notification.type === "history_failure"
                                ? "bg-red-100 text-red-600 dark:bg-red-900/30"
                                : "bg-stone-100 text-stone-600 dark:bg-stone-800"
                          }`}
                        >
                          ${notification.amount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 mb-2">
                      {notification.description}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {notification.action === "verify" && onVerify && (
                        <button onClick={() => onVerify(notification.goal)} className="btn-action-verify">
                          <ShieldCheck size={14} weight="bold" />
                          Verify Now
                        </button>
                      )}
                      {notification.action === "claim" && onClaim && (
                        <button
                          onClick={() => onClaim(notification.goalId, notification.goal.currentUserVouchieIndex || 0)}
                          className="btn-action-claim"
                        >
                          <HandCoins size={14} weight="bold" />
                          Claim ${notification.amount?.toFixed(2)}
                        </button>
                      )}

                      {/* History Status / Disabled Claim */}
                      {notification.type === "history_success" && (
                        <div className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 rounded-lg text-xs font-bold text-stone-500 flex items-center gap-2">
                          <Check size={14} weight="bold" /> Claimed
                        </div>
                      )}

                      {notification.castHash && (
                        <a
                          href={
                            notification.castHash.startsWith("0x")
                              ? `https://warpcast.com/~/conversations/${notification.castHash}`
                              : notification.castHash
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-stone-400 hover:text-purple-500 transition-colors ml-auto"
                        >
                          <ArrowSquareOut size={16} weight="bold" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FriendActivityView;

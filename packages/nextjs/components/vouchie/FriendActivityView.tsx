import React, { useEffect, useState } from "react";
import Image from "next/image";
import SlidingTabs from "./SlidingTabs";
import {
  ArrowRight,
  ArrowSquareOut,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Coins,
  Fire,
  HandCoins,
  Medal,
  Plus,
  ShieldCheck,
  Spinner,
  Trophy,
  X,
} from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { FarcasterUser, useFarcasterUser } from "~~/hooks/vouchie/useFarcasterUser";
import { usePersonalActivities } from "~~/hooks/vouchie/usePersonalActivities";
import { Activity, useActivities } from "~~/hooks/vouchie/usePonderData";
import { Goal } from "~~/types/vouchie";

// Helper to format address
const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Precise date formatter (e.g. "14:00, 30 Dec")
const formatPreciseDate = (timestamp: string | number) => {
  const date = new Date(Number(timestamp) * 1000);
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateStr = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${timeStr}, ${dateStr}`;
};

// Get activity icon and style based on type
const getActivityStyle = (activity: Activity) => {
  switch (activity.type) {
    case "goal_created":
      return {
        icon: <Plus size={14} weight="bold" className="text-white" />,
        iconBg: "bg-blue-500",
        accent: "text-blue-600 dark:text-blue-400",
        action: "staked",
      };
    case "goal_resolved":
      if (activity.successful) {
        return {
          icon: <Trophy size={14} weight="fill" className="text-white" />,
          iconBg: "bg-green-500",
          accent: "text-green-600 dark:text-green-400",
          action: "completed",
        };
      }
      return {
        icon: <X size={14} weight="bold" className="text-white" />,
        iconBg: "bg-red-500",
        accent: "text-red-600 dark:text-red-400",
        action: "failed",
      };
    case "vote_cast":
      return {
        icon: <Check size={14} weight="bold" className="text-white" />,
        iconBg: activity.isValid ? "bg-purple-500" : "bg-orange-500",
        accent: activity.isValid ? "text-purple-600 dark:text-purple-400" : "text-orange-600 dark:text-orange-400",
        action: activity.isValid ? "verified" : "rejected",
      };
    case "funds_claimed":
      return {
        icon: <Coins size={14} weight="fill" className="text-white" />,
        iconBg: "bg-green-500",
        accent: "text-green-600 dark:text-green-400",
        action: "claimed funds from",
      };
    case "streak_frozen":
      return {
        icon: <Clock size={14} weight="fill" className="text-white" />,
        iconBg: "bg-cyan-500",
        accent: "text-cyan-600 dark:text-cyan-400",
        action: "extended",
      };
    case "badge_claimed":
      return {
        icon: <Medal size={14} weight="fill" className="text-white" />,
        iconBg: "bg-yellow-500",
        accent: "text-yellow-600 dark:text-yellow-400",
        action: "earned badge for",
      };
    case "goal_canceled":
      return {
        icon: <ArrowRight size={14} weight="bold" className="text-white" />,
        iconBg: "bg-orange-500",
        accent: "text-orange-600 dark:text-orange-400",
        action: "canceled",
      };
    default:
      return {
        icon: <Fire size={14} weight="fill" className="text-white" />,
        iconBg: "bg-stone-500",
        accent: "text-stone-600 dark:text-stone-400",
        action: "updated",
      };
  }
};

// Generate avatar URL from address
const getAvatarUrl = (address: string) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
};

const truncateTitle = (title: string | null, maxLength: number = 40) => {
  if (!title) return "Unnamed Goal";
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + "...";
};

interface FriendActivityViewProps {
  creatorGoals?: Goal[];
  vouchieGoals?: Goal[];
  onVerify?: (goal: Goal) => void;
  onClaim?: (goalId: number, vouchieIndex: number) => void;
}

const FriendActivityView = ({ creatorGoals = [], vouchieGoals = [], onVerify, onClaim }: FriendActivityViewProps) => {
  const { data: activities, isLoading, error } = useActivities(50);
  const { address: userAddress } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const { openProfile } = useMiniapp();
  const { lookupBatch } = useFarcasterUser();
  const [farcasterUsers, setFarcasterUsers] = useState<Map<string, FarcasterUser | null>>(new Map());
  const [activeTab, setActiveTab] = useState<"personal" | "global">("personal");
  const decimals = targetNetwork.id === 31337 ? 18 : 6;

  // Personal activities from goals
  const { notifications, unreadCount } = usePersonalActivities({
    creatorGoals,
    vouchieGoals,
    userAddress,
  });

  // Lookup Farcaster users for activity addresses
  useEffect(() => {
    if (!activities || activities.length === 0) return;

    const addresses = [...new Set(activities.map((a: Activity) => a.user))];
    lookupBatch(addresses).then(results => {
      setFarcasterUsers(results);
    });
  }, [activities, lookupBatch]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
        </header>
        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
          <Spinner size={32} className="animate-spin mb-3" />
          <p className="font-medium">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <header className="mb-4">
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
        </header>
        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
          <p className="font-medium text-red-500">Failed to load activities</p>
          <p className="text-sm mt-1">Make sure Ponder is running: yarn ponder:dev</p>
        </div>
      </div>
    );
  }

  // Filter activities based on tab
  const allActivities = activities?.filter(a => a.type !== "funds_claimed") || [];
  const filteredActivities =
    activeTab === "global"
      ? allActivities
      : allActivities.filter(a => a.user.toLowerCase() === userAddress?.toLowerCase());

  const tabs = [
    {
      id: "personal",
      label: (
        <>
          Personal
          {unreadCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white min-w-[18px] text-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </>
      ),
    },
    { id: "global", label: "Global" },
  ];

  return (
    <div className="space-y-6 pb-24 px-6 pt-6">
      {/* Sliding Tabs */}
      <SlidingTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={id => setActiveTab(id as "personal" | "global")}
        className="mb-6"
      />

      {/* Personal Tab - Actionable Notifications */}
      {activeTab === "personal" && (
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

              switch (notification.type) {
                case "verify_request":
                  icon = <ShieldCheck size={20} weight="fill" />;
                  iconBg = "bg-purple-100 dark:bg-purple-900/30 text-purple-600";
                  borderClass = "border-l-4 border-l-purple-500";
                  break;
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
                default:
                  icon = <Plus size={20} weight="bold" />;
                  iconBg = "bg-blue-100 dark:bg-blue-900/30 text-blue-600";
                  borderClass = "border-l-4 border-l-transparent";
              }

              // Override for Slashed goals (Vouchie viewing Creator's failure)
              const isSlashed =
                notification.goal.status === "failed" &&
                notification.goal.creator?.toLowerCase() !== userAddress?.toLowerCase();

              if (isSlashed && (notification.type === "claim_available" || notification.type === "history_success")) {
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
              }

              return (
                <div
                  key={notification.id}
                  className={`card-vouchie relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99] ${borderClass}`}
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
                          <button
                            onClick={() => onVerify(notification.goal)}
                            className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <ShieldCheck size={14} weight="bold" />
                            Verify Now
                          </button>
                        )}
                        {notification.action === "claim" && onClaim && (
                          <button
                            onClick={() => onClaim(notification.goalId, notification.goal.currentUserVouchieIndex || 0)}
                            className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
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
      )}

      {/* Global Tab - All Activities */}
      {activeTab === "global" && (
        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center text-stone-400 font-bold border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-800/50">
              No activities yet.
            </div>
          ) : (
            filteredActivities.map(activity => {
              const style = getActivityStyle(activity);
              const goalTitle = truncateTitle(activity.goalTitle);

              // Get Farcaster user data if available
              const fcUser = farcasterUsers.get(activity.user.toLowerCase());
              const displayName = fcUser?.displayName || fcUser?.username || formatAddress(activity.user);
              const avatarUrl = fcUser?.pfpUrl || getAvatarUrl(activity.user);

              // Amount Formatting - formatUnits already converts from wei/base units
              const rawAmount = Number(formatUnits(BigInt(activity.stakeAmount || 0), decimals)).toFixed(2);
              let amountDisplay = "";
              let amountClass = "";

              if (activity.type === "goal_created") {
                amountDisplay = `-$${rawAmount}`;
                amountClass = "text-red-600 bg-red-50 dark:bg-red-900/20";
              } else if (activity.type === "goal_resolved") {
                if (activity.successful) {
                  amountDisplay = `+$${rawAmount}`;
                  amountClass = "text-green-600 bg-green-50 dark:bg-green-900/20";
                } else {
                  amountDisplay = `-$${rawAmount}`;
                  amountClass = "text-red-600 bg-red-50 dark:bg-red-900/20";
                }
              }

              // Timestamp Logic
              const timeAgo = formatPreciseDate(activity.timestamp);

              return (
                <div
                  key={activity.id}
                  className="card-vouchie relative overflow-hidden transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <div className="flex gap-3 relative z-10">
                    {/* Avatar */}
                    <div
                      className="relative flex-shrink-0 w-11 h-11 cursor-pointer"
                      onClick={() => fcUser?.fid && openProfile({ fid: fcUser.fid })}
                    >
                      <div className="w-11 h-11 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-700 ring-2 ring-white dark:ring-stone-800">
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          width={44}
                          height={44}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Small Action Icon Overlay */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${style.iconBg} ring-2 ring-white dark:ring-stone-800 shadow-sm`}
                      >
                        {React.cloneElement(style.icon as React.ReactElement, { size: 12 } as any)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                      {/* Top Row: Name + Time */}
                      <div className="flex justify-between items-center">
                        <span
                          className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate cursor-pointer hover:underline"
                          onClick={() => fcUser?.fid && openProfile({ fid: fcUser.fid })}
                        >
                          {displayName} <span className="text-stone-400 font-normal mx-1">•</span>{" "}
                          <span className="text-stone-400 font-normal text-xs">{timeAgo}</span>
                        </span>

                        {/* Valid Action Pill (Created/Completed) */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                            activity.type === "goal_created"
                              ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/30"
                              : activity.type === "vote_cast"
                                ? activity.isValid
                                  ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:border-purple-900/30"
                                  : "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:border-orange-900/30"
                                : activity.successful
                                  ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:border-green-900/30"
                                  : "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-900/30"
                          }`}
                        >
                          {style.action}
                        </span>
                      </div>

                      {/* Goal Title */}
                      <div className="text-sm font-bold text-stone-800 dark:text-stone-100 leading-tight line-clamp-2">
                        {goalTitle}
                      </div>

                      {/* Footer Row: Details */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          {/* Amount - Only show for resolved goals */}
                          {activity.type === "goal_resolved" && amountDisplay && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${amountClass}`}>
                              {amountDisplay}
                            </span>
                          )}

                          {/* Deadline Pill (Only if active and exists) */}
                          {activity.type === "goal_created" && activity.deadline && Number(activity.deadline) > 0 && (
                            <span className="text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-lg flex items-center gap-1">
                              <Calendar size={12} weight="fill" />
                              Due {formatPreciseDate(activity.deadline)}
                            </span>
                          )}
                        </div>

                        {/* BaseScan Link */}
                        {activity.transactionHash && (
                          <a
                            href={`${targetNetwork.blockExplorers?.default.url}/tx/${activity.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-300 hover:text-purple-500 transition-colors"
                            onClick={e => e.stopPropagation()}
                            title="View on Explorer"
                          >
                            <ArrowSquareOut size={14} weight="bold" />
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
      )}
    </div>
  );
};

export default FriendActivityView;

import React from "react";
import Image from "next/image";
import { ArrowRight, Check, Clock, Coins, Fire, Medal, Plus, Spinner, Trophy, X } from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { Activity, useActivities } from "~~/hooks/vouchie/usePonderData";

// Helper to format address
const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper to format relative time
const formatRelativeTime = (timestamp: string) => {
  const now = Date.now();
  const eventTime = Number(timestamp) * 1000;
  const diff = now - eventTime;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
};

// Helper to format deadline
const formatDeadline = (deadline: string) => {
  const deadlineTime = Number(deadline) * 1000;
  const now = Date.now();
  const diff = deadlineTime - now;

  if (diff <= 0) return "expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return "< 1h";
};

// Get activity icon and style based on type
const getActivityStyle = (activity: Activity) => {
  switch (activity.type) {
    case "goal_created":
      return {
        icon: <Plus size={14} weight="bold" className="text-white" />,
        iconBg: "bg-blue-500",
        accent: "text-blue-600 dark:text-blue-400",
        action: "created",
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

// Get the subtitle/detail text
const getDetailText = (activity: Activity, decimals: number) => {
  const stakeFormatted = activity.stakeAmount
    ? Number(formatUnits(BigInt(activity.stakeAmount), decimals)).toFixed(0)
    : "0";
  const claimFormatted = activity.claimAmount
    ? Number(formatUnits(BigInt(activity.claimAmount), decimals)).toFixed(0)
    : "0";

  switch (activity.type) {
    case "goal_created":
      const deadline = activity.deadline ? formatDeadline(activity.deadline) : "soon";
      return { text: `$${stakeFormatted} staked`, subtext: `Due in ${deadline}` };
    case "goal_resolved":
      return activity.successful
        ? { text: `+$${stakeFormatted} saved`, subtext: null, isPositive: true }
        : { text: `-$${stakeFormatted} lost`, subtext: null, isNegative: true };
    case "vote_cast":
      return { text: activity.isValid ? "Approved" : "Rejected", subtext: null };
    case "funds_claimed":
      return { text: `+$${claimFormatted} received`, subtext: null, isPositive: true };
    case "streak_frozen":
      return { text: "+12 hours", subtext: null };
    case "badge_claimed":
      return { text: "Achievement unlocked!", subtext: null };
    case "goal_canceled":
      return { text: `+$${claimFormatted} refunded`, subtext: null };
    default:
      return { text: "", subtext: null };
  }
};

// Truncate goal title if too long
const truncateTitle = (title: string | null, maxLength: number = 40) => {
  if (!title) return "Unnamed Goal";
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + "...";
};

const FriendActivityView = () => {
  const { data: activities, isLoading, error } = useActivities(20);
  const { targetNetwork } = useTargetNetwork();
  const decimals = targetNetwork.id === 31337 ? 18 : 6;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <header className="mb-4">
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
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
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
        </header>
        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
          <p className="font-medium text-red-500">Failed to load activities</p>
          <p className="text-sm mt-1">Make sure Ponder is running: yarn ponder:dev</p>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <header className="mb-4">
          <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
        </header>
        <div className="p-8 text-center text-stone-400 font-bold border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-2xl bg-white/50 dark:bg-stone-800/50">
          No activities yet. Create a goal to get started!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <header className="mb-2">
        <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
      </header>

      <div className="space-y-3">
        {activities.map(activity => {
          const style = getActivityStyle(activity);
          const detail = getDetailText(activity, decimals);
          const goalTitle = truncateTitle(activity.goalTitle);
          const isCompact = activity.type === "goal_resolved";

          return (
            <div
              key={activity.id}
              className="bg-white dark:bg-stone-800 rounded-2xl p-4 shadow-sm border border-stone-100 dark:border-stone-700 transition-all hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                {/* Avatar with action icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-700 ring-2 ring-white dark:ring-stone-800">
                    <Image
                      src={getAvatarUrl(activity.user)}
                      alt={formatAddress(activity.user)}
                      width={44}
                      height={44}
                    />
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${style.iconBg} ring-2 ring-white dark:ring-stone-800`}
                  >
                    {style.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header row: user + action + time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-stone-800 dark:text-stone-100 text-sm">
                        {formatAddress(activity.user)}
                      </span>
                      <span className={`text-sm font-medium ${style.accent}`}>{style.action}</span>
                      {isCompact && detail.text && (
                        <span
                          className={`text-sm font-medium ${
                            (detail as any).isPositive
                              ? "text-green-600 dark:text-green-400"
                              : (detail as any).isNegative
                                ? "text-red-600 dark:text-red-400"
                                : "text-stone-600 dark:text-stone-400"
                          }`}
                        >
                          {activity.successful ? "and saved" : "and lost"}{" "}
                          {detail.text.split(" ")[0].replace(/[+-]/g, "")}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-stone-400 whitespace-nowrap flex-shrink-0">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>

                  {/* Goal title */}
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 line-clamp-1">{goalTitle}</p>
                    {activity.isSolo !== null && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                          activity.isSolo
                            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                        }`}
                      >
                        {activity.isSolo ? "Solo" : "Squad"}
                      </span>
                    )}
                  </div>

                  {/* Detail/amount row - Only show if not compact */}
                  {detail.text && !isCompact && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span
                        className={`font-bold px-2 py-1 rounded-lg ${
                          (detail as any).isPositive
                            ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                            : (detail as any).isNegative
                              ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                              : "bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300"
                        }`}
                      >
                        {detail.text}
                      </span>
                      {detail.subtext && <span className="text-stone-400">{detail.subtext}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FriendActivityView;

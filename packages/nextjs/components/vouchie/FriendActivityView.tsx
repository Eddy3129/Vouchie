import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, Check, Clock, Coins, Fire, Medal, Plus, Spinner, Trophy, X } from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { useMiniapp } from "~~/components/MiniappProvider";
import { useTargetNetwork } from "~~/hooks/scaffold-eth";
import { FarcasterUser, useFarcasterUser } from "~~/hooks/vouchie/useFarcasterUser";
import { Activity, useActivities } from "~~/hooks/vouchie/usePonderData";

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
        action: "created & staked",
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

const FriendActivityView = () => {
  const { data: activities, isLoading, error } = useActivities(20);
  const { targetNetwork } = useTargetNetwork();
  const { openProfile } = useMiniapp();
  const { lookupBatch } = useFarcasterUser();
  const [farcasterUsers, setFarcasterUsers] = useState<Map<string, FarcasterUser | null>>(new Map());
  const decimals = targetNetwork.id === 31337 ? 18 : 6;

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

  // Filter out unwanted activity types (like funds_claimed)
  const filteredActivities = activities?.filter(a => a.type !== "funds_claimed") || [];

  if (filteredActivities.length === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
        <header className="mb-4">
          <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
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
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
      </header>

      <div className="space-y-3">
        {filteredActivities.map(activity => {
          const style = getActivityStyle(activity);
          const goalTitle = truncateTitle(activity.goalTitle);

          // Get Farcaster user data if available
          const fcUser = farcasterUsers.get(activity.user.toLowerCase());
          const displayName = fcUser?.displayName || fcUser?.username || formatAddress(activity.user);
          const avatarUrl = fcUser?.pfpUrl || getAvatarUrl(activity.user);

          // Amount Formatting
          const rawAmount = Number(formatUnits(BigInt(activity.stakeAmount || 0), decimals)).toFixed(0);
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

          return (
            <div
              key={activity.id}
              className="bg-white dark:bg-stone-800 rounded-xl p-3 shadow-sm border border-stone-100 dark:border-stone-700 transition-all"
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div
                  className={`relative flex-shrink-0 w-10 h-10 ${fcUser?.fid ? "cursor-pointer" : ""}`}
                  onClick={() => fcUser?.fid && openProfile({ fid: fcUser.fid })}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-700 ring-2 ring-white dark:ring-stone-800">
                    <Image
                      src={avatarUrl}
                      alt={displayName}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Small Action Icon Overlay */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${style.iconBg} ring-2 ring-white dark:ring-stone-800`}
                  >
                    {React.cloneElement(style.icon as React.ReactElement, { size: 10 } as any)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  {/* Top Row: Name + Action + Date */}
                  <div className="flex justify-between items-baseline mb-0.5">
                    <div className="flex items-center gap-1.5 overflow-hidden text-xs">
                      <span
                        className={`font-bold text-stone-900 dark:text-stone-100 truncate ${fcUser?.fid ? "cursor-pointer hover:underline" : ""}`}
                        onClick={() => fcUser?.fid && openProfile({ fid: fcUser.fid })}
                      >
                        {displayName}
                      </span>
                      <span className="text-stone-500 dark:text-stone-400 flex-shrink-0">{style.action}</span>
                    </div>
                    {/* Timestamp of the event itself (not deadline) */}
                    <span className="text-[10px] text-stone-400 font-medium whitespace-nowrap ml-2">
                      {formatPreciseDate(activity.timestamp)}
                    </span>
                  </div>

                  {/* Goal Title */}
                  <div className="text-sm font-bold text-stone-800 dark:text-stone-100 leading-tight mb-1.5 line-clamp-1">
                    {goalTitle}
                  </div>

                  {/* Metadata Row: Amount + Deadline (if applicable) */}
                  <div className="flex items-center gap-2">
                    {amountDisplay && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${amountClass}`}>
                        {amountDisplay}
                      </span>
                    )}

                    {activity.deadline && Number(activity.deadline) > 0 && (
                      <span className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                        Due {formatPreciseDate(activity.deadline)}
                      </span>
                    )}
                  </div>
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

import React, { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { CaretDown, CaretUp, Fire, Spinner, Wallet } from "@phosphor-icons/react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import { FarcasterUser, useFarcasterUser } from "~~/hooks/vouchie/useFarcasterUser";
import { UserStats, useLeaderboard, useUserStats } from "~~/hooks/vouchie/usePonderData";

// Helper to format address
const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Generate avatar URL from address
const getAvatarUrl = (address: string) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address}`;
};

const ProfileView = () => {
  const { address } = useAccount();
  const { openProfile, context } = useMiniapp();
  const { lookupBatch } = useFarcasterUser();
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [farcasterUsers, setFarcasterUsers] = useState<Map<string, FarcasterUser | null>>(new Map());

  // Fetch user stats from Ponder
  const { data: userStats, isLoading: statsLoading } = useUserStats(address);

  // Fetch leaderboard from Ponder (Always sort by streak)
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard("streak", 10);

  // Lookup Farcaster users for leaderboard addresses
  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return;

    const addresses = leaderboard.map((u: UserStats) => u.id);
    lookupBatch(addresses).then(results => {
      setFarcasterUsers(results);
    });
  }, [leaderboard, lookupBatch]);

  // Compute display stats
  const stats = {
    tasksCompleted: userStats?.goalsCompleted ?? 0,
    usdcSaved: userStats?.totalSaved ? Number(formatEther(BigInt(userStats.totalSaved))) : 0,
    streak: userStats?.currentStreak ?? 0,
    active: (userStats?.goalsCreated ?? 0) - (userStats?.goalsCompleted ?? 0) - (userStats?.goalsFailed ?? 0),
  };

  // Build leaderboard entries with current user and Farcaster data
  const leaderboardEntries = React.useMemo(() => {
    if (!leaderboard) return [];

    // Map leaderboard to display format with Farcaster data
    const entries = leaderboard.map((user: UserStats) => {
      const fcUser = farcasterUsers.get(user.id.toLowerCase());
      const isCurrentUser = user.id === address?.toLowerCase();

      return {
        id: user.id,
        address: user.id,
        name: isCurrentUser ? "You" : fcUser?.displayName || fcUser?.username || formatAddress(user.id),
        avatar: fcUser?.pfpUrl || getAvatarUrl(user.id),
        streak: user.currentStreak,
        isCurrentUser,
        fid: fcUser?.fid || (isCurrentUser ? context?.user?.fid : undefined),
      };
    });

    // Sort by streak descending
    return entries.sort((a, b) => b.streak - a.streak);
  }, [leaderboard, address, farcasterUsers, context?.user?.fid]);

  const displayedLeaderboard = showAllLeaderboard ? leaderboardEntries : leaderboardEntries.slice(0, 3);

  if (statsLoading && leaderboardLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-24">
        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
          <Spinner size={32} className="animate-spin mb-3" />
          <p className="font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      {/* Profile Header - Only show if connected */}
      {address && (
        <div className="relative overflow-hidden bg-stone-900 rounded-3xl p-6 shadow-xl border border-stone-800">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#8B5A2B]/20 to-transparent rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-4 relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#8B5A2B] to-[#FFA726] rounded-full blur opacity-75"></div>
              <Avatar src={getAvatarUrl(address)} name="You" size="xl" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">{formatAddress(address)}</h1>
            <p className="text-xs font-bold text-[#FFA726] uppercase tracking-widest mb-6">
              {stats.streak >= 30
                ? "Legendary Achiever"
                : stats.streak >= 10
                  ? "Productivity Wizard"
                  : stats.streak >= 5
                    ? "Rising Star"
                    : "Getting Started"}
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
              {/* Streak */}
              <div className="bg-stone-800/50 rounded-2xl p-3 border border-stone-700/50 flex flex-col items-center">
                <div className="mb-1 text-orange-500">
                  <Fire size={24} weight="fill" />
                </div>
                <span className="text-xl font-bold text-white">{stats.streak}</span>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Streak</span>
              </div>

              {/* Completed */}
              <div className="bg-stone-800/50 rounded-2xl p-3 border border-stone-700/50 flex flex-col items-center">
                <div className="mb-1 text-green-500">
                  <Wallet size={24} weight="fill" />
                </div>
                <span className="text-xl font-bold text-white">{stats.tasksCompleted}</span>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Done</span>
              </div>

              {/* Current Active */}
              <div className="bg-stone-800/50 rounded-2xl p-3 border border-stone-700/50 flex flex-col items-center">
                <div className="mb-1 text-blue-500">
                  <Spinner size={24} weight="bold" />
                </div>
                <span className="text-xl font-bold text-white">{Math.max(0, stats.active)}</span>
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Section */}
      <div className="bg-white dark:bg-stone-800 rounded-3xl p-6 shadow-sm border border-stone-100 dark:border-stone-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <Fire size={28} weight="fill" className="text-orange-500" />
            Streaks Leaderboard
          </h2>
        </div>

        {leaderboardLoading ? (
          <div className="flex items-center justify-center py-8 text-stone-400">
            <Spinner size={24} className="animate-spin" />
          </div>
        ) : displayedLeaderboard.length === 0 ? (
          <div className="text-center py-8 text-stone-400 font-medium">No users on leaderboard yet. Be the first!</div>
        ) : (
          <div className="space-y-3">
            {displayedLeaderboard.map((friend, index) => (
              <div
                key={friend.id}
                className={`flex items-center gap-4 py-3 px-4 rounded-2xl transition-all border border-transparent ${
                  friend.isCurrentUser
                    ? "bg-gradient-to-r from-[#8B5A2B]/10 to-[#FFA726]/10 border-[#FFA726]/20"
                    : "bg-stone-50 dark:bg-stone-700/30 hover:bg-stone-100 dark:hover:bg-stone-700/50"
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm ${
                    index === 0
                      ? "bg-yellow-400 text-yellow-900 ring-2 ring-yellow-200 dark:ring-yellow-900"
                      : index === 1
                        ? "bg-stone-300 text-stone-800 ring-2 ring-stone-200 dark:ring-stone-600"
                        : index === 2
                          ? "bg-orange-300 text-orange-900 ring-2 ring-orange-200 dark:ring-orange-800"
                          : "bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Avatar + Name */}
                <div
                  className={`flex items-center gap-3 flex-1 min-w-0 ${friend.fid ? "cursor-pointer group" : ""}`}
                  onClick={() => friend.fid && openProfile({ fid: friend.fid })}
                >
                  <Avatar src={friend.avatar} name={friend.name} size="md" />
                  <p
                    className={`font-bold text-base truncate ${
                      friend.isCurrentUser ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-700 dark:text-stone-200"
                    } ${friend.fid ? "group-hover:underline" : ""}`}
                  >
                    {friend.name}
                  </p>
                </div>

                {/* Streak Score */}
                <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-xl">
                  <Fire size={18} weight="fill" className="text-orange-500" />
                  <span className="text-lg font-black text-orange-600 dark:text-orange-400">{friend.streak}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* See More/Less Button */}
        {leaderboardEntries.length > 3 && (
          <button
            onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
            className="w-full mt-4 py-3 text-sm font-bold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {showAllLeaderboard ? (
              <>
                Show less <CaretUp size={14} weight="bold" />
              </>
            ) : (
              <>
                View all {leaderboardEntries.length} users <CaretDown size={14} weight="bold" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileView;

import React, { useState } from "react";
import Avatar from "./Avatar";
import { CaretDown, CaretUp, Fire, Spinner, Wallet } from "@phosphor-icons/react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
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
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [sortBy, setSortBy] = useState<"streak" | "saved">("streak");

  // Fetch user stats from Ponder
  const { data: userStats, isLoading: statsLoading } = useUserStats(address);

  // Fetch leaderboard from Ponder
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(sortBy, 10);

  // Compute display stats
  const stats = {
    tasksCompleted: userStats?.goalsCompleted ?? 0,
    usdcSaved: userStats?.totalSaved ? Number(formatEther(BigInt(userStats.totalSaved))) : 0,
    streak: userStats?.currentStreak ?? 0,
    active: (userStats?.goalsCreated ?? 0) - (userStats?.goalsCompleted ?? 0) - (userStats?.goalsFailed ?? 0),
  };

  // Build leaderboard entries with current user
  const leaderboardEntries = React.useMemo(() => {
    if (!leaderboard) return [];

    // Map leaderboard to display format
    const entries = leaderboard.map((user: UserStats) => ({
      id: user.id,
      address: user.id,
      name: user.id === address?.toLowerCase() ? "You" : formatAddress(user.id),
      avatar: getAvatarUrl(user.id),
      streak: user.currentStreak,
      saved: Number(formatEther(BigInt(user.totalSaved))),
      isCurrentUser: user.id === address?.toLowerCase(),
    }));

    // Sort based on current sort mode
    return entries.sort((a, b) => {
      if (sortBy === "streak") return b.streak - a.streak;
      return b.saved - a.saved;
    });
  }, [leaderboard, address, sortBy]);

  const displayedLeaderboard = showAllLeaderboard ? leaderboardEntries : leaderboardEntries.slice(0, 3);

  if (statsLoading && leaderboardLoading) {
    return (
      <div className="space-y-3 animate-in fade-in duration-500">
        <div className="flex flex-col items-center justify-center py-12 text-stone-400">
          <Spinner size={32} className="animate-spin mb-3" />
          <p className="font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* Profile Header with Stats - Compact Horizontal */}
      <div className="bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-100 dark:border-stone-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar src={address ? getAvatarUrl(address) : ""} name="You" size="lg" showBorder />

            <div>
              <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                {address ? formatAddress(address) : "Not connected"}
              </h1>
              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
                {stats.streak >= 30
                  ? "Legendary Achiever"
                  : stats.streak >= 10
                    ? "Productivity Wizard"
                    : stats.streak >= 5
                      ? "Rising Star"
                      : "Getting Started"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 ml-auto sm:ml-0">
            {/* Done */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 flex items-center justify-center">
                <span className="text-xs font-bold text-green-600 dark:text-green-400">{stats.tasksCompleted}</span>
              </div>
              <span className="text-[8px] text-stone-400 font-bold uppercase">Done</span>
            </div>

            {/* Ongoing */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{Math.max(0, stats.active)}</span>
              </div>
              <span className="text-[8px] text-stone-400 font-bold uppercase">Active</span>
            </div>

            {/* Streak */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-100 dark:border-orange-800 flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{stats.streak}</span>
              </div>
              <span className="text-[8px] text-stone-400 font-bold uppercase">Streak</span>
            </div>
          </div>
        </div>

        {/* Total Saved Badge */}
        {stats.usdcSaved > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
              <Wallet size={14} weight="fill" className="text-green-500" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                ${stats.usdcSaved.toFixed(0)} saved
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Compact Leaderboard */}
      <div className="bg-white dark:bg-stone-800 rounded-xl p-3 shadow-sm border border-stone-100 dark:border-stone-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Leaderboard</span>

          <div className="flex bg-stone-100 dark:bg-stone-700/50 rounded-lg p-0.5">
            <button
              onClick={() => setSortBy("streak")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                sortBy === "streak"
                  ? "bg-white dark:bg-stone-600 shadow-sm text-orange-500"
                  : "text-stone-400 hover:text-stone-500"
              }`}
            >
              <Fire size={10} weight="fill" className="inline mr-0.5" /> Streak
            </button>

            <button
              onClick={() => setSortBy("saved")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                sortBy === "saved"
                  ? "bg-white dark:bg-stone-600 shadow-sm text-green-500"
                  : "text-stone-400 hover:text-stone-500"
              }`}
            >
              <Wallet size={10} weight="fill" className="inline mr-0.5" /> Saved
            </button>
          </div>
        </div>

        {leaderboardLoading ? (
          <div className="flex items-center justify-center py-4 text-stone-400">
            <Spinner size={20} className="animate-spin" />
          </div>
        ) : displayedLeaderboard.length === 0 ? (
          <div className="text-center py-4 text-stone-400 text-sm">No users on leaderboard yet. Be the first!</div>
        ) : (
          <div className="space-y-1.5">
            {displayedLeaderboard.map((friend, index) => (
              <div
                key={friend.id}
                className={`flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors ${
                  friend.isCurrentUser
                    ? "bg-[#8B5A2B]/10 dark:bg-[#FFA726]/10"
                    : "hover:bg-stone-50 dark:hover:bg-stone-700/50"
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0 ${
                    index === 0
                      ? "bg-yellow-400"
                      : index === 1
                        ? "bg-gray-400"
                        : index === 2
                          ? "bg-orange-400"
                          : "bg-stone-300 dark:bg-stone-600"
                  }`}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                <Avatar src={friend.avatar} name={friend.name} size="sm" />

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-bold text-xs truncate ${
                      friend.isCurrentUser ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-700 dark:text-stone-200"
                    }`}
                  >
                    {friend.name}
                  </p>
                </div>

                {/* Score */}
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                  {sortBy === "streak" ? (
                    <span className="text-orange-500 flex items-center gap-1">
                      <Fire size={10} weight="fill" /> {friend.streak}
                    </span>
                  ) : (
                    <span className="text-green-500 flex items-center gap-1">
                      <Wallet size={10} weight="fill" /> ${friend.saved.toFixed(0)}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* See More/Less Button */}
        {leaderboardEntries.length > 3 && (
          <button
            onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
            className="w-full mt-2 py-1.5 text-[10px] font-bold text-[#8B5A2B] dark:text-[#FFA726] hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {showAllLeaderboard ? (
              <>
                Show less <CaretUp size={10} weight="bold" />
              </>
            ) : (
              <>
                See all {leaderboardEntries.length} users <CaretDown size={10} weight="bold" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileView;

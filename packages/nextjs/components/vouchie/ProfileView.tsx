import React, { useEffect, useState } from "react";
import Image from "next/image";
import Avatar from "./Avatar";
import SlidingTabs from "./SlidingTabs";
import { CaretDown, CaretUp, CurrencyDollar, Fire, Spinner, Target, Trophy } from "@phosphor-icons/react";
import { Quotes } from "@phosphor-icons/react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useMiniapp } from "~~/components/MiniappProvider";
import { useFamousQuotes } from "~~/hooks/vouchie/useFamousQuotes";
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
  const [activeTab, setActiveTab] = useState<"streak" | "wealth">("streak");
  const [farcasterUsers, setFarcasterUsers] = useState<Map<string, FarcasterUser | null>>(new Map());
  const [currentUserFc, setCurrentUserFc] = useState<FarcasterUser | null>(null);
  const { dailyQuote } = useFamousQuotes();

  // Fetch user stats from Ponder
  const { data: userStats, isLoading: statsLoading } = useUserStats(address);

  // Fetch leaderboard from Ponder (Dynamic sort)
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(
    activeTab === "streak" ? "streak" : "saved",
    20,
  );

  // Lookup Farcaster users for leaderboard addresses + current user
  useEffect(() => {
    const addressesToLookup = new Set<string>();

    if (address) addressesToLookup.add(address);
    leaderboard?.forEach((u: UserStats) => addressesToLookup.add(u.id));

    if (addressesToLookup.size === 0) return;

    lookupBatch(Array.from(addressesToLookup)).then(results => {
      setFarcasterUsers(results);
      if (address) {
        setCurrentUserFc(results.get(address.toLowerCase()) || null);
      }
    });
  }, [leaderboard, lookupBatch, address]);

  // Compute display stats
  const totalCreated = userStats?.goalsCreated ?? 0;
  const successRate = totalCreated > 0 ? Math.round(((userStats?.goalsCompleted ?? 0) / totalCreated) * 100) : 0;

  // Find rank in leaderboard
  const userRank = leaderboard?.findIndex(u => u.id.toLowerCase() === address?.toLowerCase()) ?? -1;
  const displayRank = userRank !== -1 ? `#${userRank + 1}` : null;

  const stats = {
    tasksCompleted: userStats?.goalsCompleted ?? 0,
    usdcSaved: userStats?.totalSaved ? Number(formatUnits(BigInt(userStats.totalSaved), 6)) : 0,
    streak: userStats?.currentStreak ?? 0,
    active: (userStats?.goalsCreated ?? 0) - (userStats?.goalsCompleted ?? 0) - (userStats?.goalsFailed ?? 0),
    successRate,
    displayRank,
  };

  // Build leaderboard entries with current user and Farcaster data
  const leaderboardEntries = React.useMemo(() => {
    if (!leaderboard) return [];

    // Map leaderboard to display format with Farcaster data
    const entries = leaderboard.map((user: UserStats) => {
      const fcUser = farcasterUsers.get(user.id.toLowerCase());
      const isCurrentUser = user.id === address?.toLowerCase();
      const savedAmount = user.totalSaved ? Number(formatUnits(BigInt(user.totalSaved), 6)) : 0;

      return {
        id: user.id,
        address: user.id,
        name: isCurrentUser ? "You" : fcUser?.displayName || fcUser?.username || formatAddress(user.id),
        avatar: fcUser?.pfpUrl || getAvatarUrl(user.id),
        streak: user.currentStreak,
        wealth: savedAmount.toFixed(2),
        isCurrentUser,
        fid: fcUser?.fid || (isCurrentUser ? context?.user?.fid : undefined),
      };
    });

    // Sort is handled by backend query, but double check client side if needed
    // Ponder returns sorted data so we just map it.
    return entries;
  }, [leaderboard, address, farcasterUsers, context?.user?.fid]);

  const displayedLeaderboard = showAllLeaderboard ? leaderboardEntries : leaderboardEntries.slice(0, 3);

  // Determine author image
  const getAuthorImage = (author: string) => {
    const slug = author
      .toLowerCase()
      .replace(/[\s.]+/g, "-")
      .replace(/[^a-z-]/g, "");
    if (slug.includes("aristotle")) return "/quotes/aristotle.webp";
    if (slug.includes("benjamin")) return "/quotes/benjamin-franklin.webp";
    if (slug.includes("bruce")) return "/quotes/bruce.webp";
    if (slug.includes("gandhi")) return "/quotes/gandhi.webp";
    if (slug.includes("jim")) return "/quotes/jim-rohn.webp";
    if (slug.includes("marcus")) return "/quotes/marcus-aurelis.webp";
    if (slug.includes("twain")) return "/quotes/mark-twain.webp";
    if (slug.includes("nietzsche")) return "/quotes/nietzshce.webp";
    if (slug.includes("collier")) return "/quotes/robert-collier.webp";
    if (slug.includes("roosevelt")) return "/quotes/theodore-roosevelt.webp";
    return "";
  };

  const quoteBg = getAuthorImage(dailyQuote.author);

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
    <div className="space-y-4 pb-8 px-6 pt-6">
      {/* Profile Header - Only show if connected */}
      {address && (
        <div className="relative overflow-hidden bg-white dark:bg-stone-900 rounded-2xl p-5 shadow-lg border border-stone-200 dark:border-stone-700">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#8B5A2B]/20 to-transparent rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="relative z-10">
            {/* Rank Badge */}
            {stats.displayRank && (
              <div className="absolute top-0 right-0 z-20">
                <div className="bg-stone-800 dark:bg-stone-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-stone-600 dark:border-stone-500">
                  GLOBAL RANK {stats.displayRank}
                </div>
              </div>
            )}

            {/* Top Container: PFP Left, Info Right */}
            <div className="flex items-center gap-4 mb-5">
              {/* Profile Picture */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#8B5A2B] to-[#FFA726] rounded-full blur opacity-75"></div>
                <Avatar
                  src={currentUserFc?.pfpUrl || getAvatarUrl(address)}
                  name={currentUserFc?.displayName || "You"}
                  size="lg"
                />
              </div>

              {/* Identity & Streak Container */}
              <div className="flex flex-col items-start gap-1">
                <h1 className="text-lg font-bold text-stone-800 dark:text-white leading-none">
                  {currentUserFc?.displayName || currentUserFc?.username || formatAddress(address)}
                </h1>

                {/* Streak Component */}
                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-orange-50 dark:bg-orange-900/30 rounded-full border border-orange-200 dark:border-orange-800/50">
                  <Fire size={14} weight="fill" className="text-orange-500" />
                  <span className="text-xs font-bold text-orange-700 dark:text-orange-300">{stats.streak} Streak</span>
                </div>
              </div>
            </div>

            {/* Bottom Container: Horizontal display of stats */}
            <div className="grid grid-cols-2 gap-2">
              {/* Active commitments */}
              <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-2.5 border border-stone-200 dark:border-stone-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-blue-500 bg-blue-100 dark:bg-blue-900/30 p-1 rounded-lg">
                    <Target size={16} weight="bold" />
                  </div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Active</span>
                </div>
                <span className="text-base font-bold text-stone-800 dark:text-white">{Math.max(0, stats.active)}</span>
              </div>

              {/* Success Rate */}
              <div className="bg-stone-50 dark:bg-stone-800/50 rounded-xl p-2.5 border border-stone-200 dark:border-stone-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-amber-500 bg-amber-100 dark:bg-amber-900/30 p-1 rounded-lg">
                    <Trophy size={16} weight="fill" />
                  </div>
                  <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Success</span>
                </div>
                <span className="text-base font-bold text-stone-800 dark:text-white">{stats.successRate}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Motivation Quote - Compact */}
      <div className="relative rounded-xl overflow-hidden bg-white dark:bg-stone-900 shadow-sm border border-[#8B5A2B]/20 dark:border-[#FFA726]/20">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B5A2B]/5 via-transparent to-[#8B5A2B]/5" />

        <div className="relative p-4 flex items-start gap-3 z-10 pr-16">
          <Quotes className="text-[#FFA726] opacity-40 flex-shrink-0" size={24} weight="fill" />
          <div className="flex-1 min-w-0">
            <p
              className="text-stone-700 dark:text-stone-300 text-xs leading-snug italic mb-1.5 font-medium"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              {dailyQuote.text}
            </p>
            <p
              className="text-[#8B5A2B] dark:text-[#FFA726] text-[10px] font-bold tracking-wide uppercase"
              style={{ fontFamily: "Playfair Display, serif" }}
            >
              — {dailyQuote.author}
            </p>
          </div>
        </div>
        {/* Famous Person Image - Stuck to the right border */}
        {quoteBg && (
          <div className="absolute right-0 top-0 bottom-0 w-32 opacity-20 grayscale pointer-events-none">
            <Image src={quoteBg} alt={dailyQuote.author} fill className="object-contain object-right" />
          </div>
        )}
      </div>

      {/* Leaderboard Section */}
      <div className="space-y-3">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              {activeTab === "streak" ? (
                <Fire size={20} weight="fill" className="text-orange-500" />
              ) : (
                <CurrencyDollar size={20} weight="fill" className="text-green-500" />
              )}
              Leaderboard
            </h2>
          </div>

          {/* Sliding Tabs */}
          <SlidingTabs
            tabs={[
              {
                id: "streak",
                label: (
                  <>
                    <Fire size={16} weight={activeTab === "streak" ? "fill" : "bold"} /> Longest Streak
                  </>
                ),
              },
              {
                id: "wealth",
                label: (
                  <>
                    <CurrencyDollar size={16} weight={activeTab === "wealth" ? "fill" : "bold"} /> Risk Staker
                  </>
                ),
              },
            ]}
            activeTab={activeTab}
            onChange={id => setActiveTab(id as "streak" | "wealth")}
          />
        </header>

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
                className={`card-vouchie flex items-center gap-4 transition-all ${
                  friend.isCurrentUser ? "ring-2 ring-[#FFA726]/60 dark:ring-[#FFA726]/40" : "hover:scale-[1.01]"
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
                    className={`font-bold text-sm truncate ${
                      friend.isCurrentUser ? "text-[#8B5A2B] dark:text-[#FFA726]" : "text-stone-700 dark:text-stone-200"
                    } ${friend.fid ? "group-hover:underline" : ""}`}
                  >
                    {friend.name}
                  </p>
                </div>

                {/* Score */}
                {activeTab === "streak" ? (
                  <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-xl">
                    <Fire size={16} weight="fill" className="text-orange-500" />
                    <span className="text-base font-black text-orange-600 dark:text-orange-400">{friend.streak}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-xl">
                    <span className="text-base font-black text-green-600 dark:text-green-400">${friend.wealth}</span>
                  </div>
                )}
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

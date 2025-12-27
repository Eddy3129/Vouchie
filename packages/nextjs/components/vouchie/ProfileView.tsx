import React, { useState } from "react";
import { Stats, UserProfile } from "../../types/vouchie";
import Avatar from "./Avatar";
import { CaretDown, CaretUp, Fire, Wallet } from "@phosphor-icons/react";

interface ProfileViewProps {
  user: UserProfile;
  stats: Stats;
  leaderboard: UserProfile[];
}

const ProfileView = ({ user, stats, leaderboard }: ProfileViewProps) => {
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

  const [sortBy, setSortBy] = useState<"streak" | "saved">("streak");

  const displayedLeaderboard = showAllLeaderboard ? leaderboard : leaderboard.slice(0, 3);

  const sortedLeaderboard = [...displayedLeaderboard].sort((a, b) => {
    if (sortBy === "streak") return (b.streak || 0) - (a.streak || 0);

    return (b.saved || 0) - (a.saved || 0);
  });

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* Profile Header with Stats - Compact Horizontal */}

      <div className="bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-100 dark:border-stone-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar} name={user.name} size="lg" showBorder />

            <div>
              <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100">{user.name}</h1>

              <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Productivity Wizard</p>
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
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">2</span>
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
              🔥 Streak
            </button>

            <button
              onClick={() => setSortBy("saved")}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                sortBy === "saved"
                  ? "bg-white dark:bg-stone-600 shadow-sm text-green-500"
                  : "text-stone-400 hover:text-stone-500"
              }`}
            >
              💰 Saved
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {sortedLeaderboard.map((friend, index) => (
            <div
              key={friend.id}
              className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors"
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
                <p className="font-bold text-stone-700 dark:text-stone-200 text-xs truncate">{friend.name}</p>
              </div>

              {/* Score */}

              <span className="text-xs font-bold text-stone-500 dark:text-stone-400">
                {sortBy === "streak" ? (
                  <span className="text-orange-500 flex items-center gap-1">
                    <Fire size={10} weight="fill" /> {friend.streak || 0}
                  </span>
                ) : (
                  <span className="text-green-500 flex items-center gap-1">
                    <Wallet size={10} weight="fill" /> ${friend.saved || 0}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* See More/Less Button */}

        {leaderboard.length > 3 && (
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
                See all {leaderboard.length} friends <CaretDown size={10} weight="bold" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileView;

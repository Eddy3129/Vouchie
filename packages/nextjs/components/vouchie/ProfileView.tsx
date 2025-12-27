import React, { useState } from "react";
import { Stats, UserProfile } from "../../types/vouchie";
import Avatar from "./Avatar";
import { CaretDown, CaretUp, CheckCircle, Fire, Star, Trophy, Wallet } from "@phosphor-icons/react";

interface ProfileViewProps {
  user: UserProfile;
  stats: Stats;
  leaderboard: UserProfile[];
}

// Mini streak chart - compact visualization
const MiniStreakChart = () => {
  const data = [0, 2, 1, 4, 3, 5, 7];
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const max = Math.max(...data);

  return (
    <div className="bg-white dark:bg-stone-800 rounded-xl p-3 shadow-sm border border-stone-100 dark:border-stone-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">This Week</span>
        <div className="flex items-center gap-1 text-orange-500">
          <Fire weight="fill" size={12} />
          <span className="text-xs font-bold">7</span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-8">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full rounded-sm transition-all ${value > 0 ? "bg-[#8B5A2B] dark:bg-[#FFA726]" : "bg-stone-100 dark:bg-stone-700"}`}
              style={{ height: `${Math.max(2, (value / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {days.map((day, i) => (
          <span key={i} className="flex-1 text-center text-[8px] font-bold text-stone-400">
            {day}
          </span>
        ))}
      </div>
    </div>
  );
};

const ProfileView = ({ user, stats, leaderboard }: ProfileViewProps) => {
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const displayedLeaderboard = showAllLeaderboard ? leaderboard : leaderboard.slice(0, 3);

  return (
    <div className="space-y-3 animate-in fade-in duration-500">
      {/* Compact Profile Header */}
      <div className="bg-white dark:bg-stone-800 rounded-xl p-4 shadow-sm border border-stone-100 dark:border-stone-700">
        <div className="flex items-center gap-3">
          <Avatar src={user.avatar} name={user.name} size="lg" showBorder />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-stone-800 dark:text-stone-100 truncate">{user.name}</h1>
            <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Productivity Wizard</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="bg-[#FFA726] text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
              <Star weight="fill" size={10} /> Lvl 5
            </div>
            <div className="bg-[#8B5A2B] text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
              <Trophy weight="fill" size={10} /> {user.score}
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Stat Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        <div className="flex-shrink-0 bg-white dark:bg-stone-800 rounded-full px-3 py-2 shadow-sm border border-stone-100 dark:border-stone-700 flex items-center gap-2">
          <CheckCircle weight="fill" className="text-green-500" size={14} />
          <span className="font-bold text-stone-800 dark:text-stone-100 text-sm">{stats.tasksCompleted}</span>
          <span className="text-[10px] text-stone-400">Done</span>
        </div>
        <div className="flex-shrink-0 bg-white dark:bg-stone-800 rounded-full px-3 py-2 shadow-sm border border-stone-100 dark:border-stone-700 flex items-center gap-2">
          <Wallet weight="fill" className="text-[#8B5A2B] dark:text-[#FFA726]" size={14} />
          <span className="font-bold text-stone-800 dark:text-stone-100 text-sm">${stats.usdcSaved}</span>
          <span className="text-[10px] text-stone-400">Saved</span>
        </div>
        <div className="flex-shrink-0 bg-white dark:bg-stone-800 rounded-full px-3 py-2 shadow-sm border border-stone-100 dark:border-stone-700 flex items-center gap-2">
          <Fire weight="fill" className="text-orange-500" size={14} />
          <span className="font-bold text-stone-800 dark:text-stone-100 text-sm">{stats.streak}</span>
          <span className="text-[10px] text-stone-400">Streak</span>
        </div>
      </div>

      {/* Mini Streak Chart */}
      <MiniStreakChart />

      {/* Compact Leaderboard */}
      <div className="bg-white dark:bg-stone-800 rounded-xl p-3 shadow-sm border border-stone-100 dark:border-stone-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Leaderboard</span>
          <Trophy weight="fill" className="text-yellow-500" size={12} />
        </div>

        <div className="space-y-1.5">
          {displayedLeaderboard
            .sort((a, b) => b.score - a.score)
            .map((friend, index) => (
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
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400">{friend.score}</span>
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

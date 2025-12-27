import React from "react";
import { Stats, UserProfile } from "../../types/vouchie";
import CuteCard from "./Helper/CuteCard";
import { CheckCircle2, Heart, Wallet, Zap } from "lucide-react";

interface ProfileViewProps {
  user: UserProfile;
  stats: Stats;
  leaderboard: UserProfile[];
}

const ProfileView = ({ user, stats, leaderboard }: ProfileViewProps) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* Header Profile Card */}
    <div className="bg-white rounded-[32px] p-8 soft-shadow flex flex-col items-center text-center relative overflow-hidden">
      {/* Decorative BG */}
      <div className="absolute top-0 w-full h-32 bg-gradient-to-r from-indigo-200 to-pink-200 opacity-50" />

      <div className="relative mt-12 mb-4">
        <div
          className={`w-24 h-24 rounded-full ${user.color} flex items-center justify-center text-5xl border-4 border-white shadow-md`}
        >
          {user.avatar}
        </div>
        <div className="absolute bottom-0 right-0 bg-indigo-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white">
          Lvl 5
        </div>
      </div>

      <h2 className="text-3xl chubby-text text-stone-800">{user.name}</h2>
      <p className="text-stone-400 font-bold mb-6">Productivity Wizard 🧙‍♂️</p>

      <div className="flex gap-2">
        <span className="bg-stone-100 text-stone-500 px-3 py-1 rounded-full text-xs font-bold">#Solidify</span>
        <span className="bg-stone-100 text-stone-500 px-3 py-1 rounded-full text-xs font-bold">#Fitness</span>
      </div>
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-2 gap-4">
      <CuteCard className="flex flex-col items-center justify-center gap-2 bg-indigo-50">
        <CheckCircle2 className="text-indigo-400" size={32} />
        <span className="text-2xl chubby-text text-stone-700">{stats.tasksCompleted}</span>
        <span className="text-xs font-bold text-stone-400 uppercase">Tasks Done</span>
      </CuteCard>
      <CuteCard className="flex flex-col items-center justify-center gap-2 bg-green-50">
        <Wallet className="text-green-400" size={32} />
        <span className="text-2xl chubby-text text-stone-700">${stats.usdcSaved}</span>
        <span className="text-xs font-bold text-stone-400 uppercase">Saved</span>
      </CuteCard>
      <CuteCard className="flex flex-col items-center justify-center gap-2 bg-orange-50">
        <Zap className="text-orange-400" size={32} />
        <span className="text-2xl chubby-text text-stone-700">{stats.streak}</span>
        <span className="text-xs font-bold text-stone-400 uppercase">Day Streak</span>
      </CuteCard>
      <CuteCard className="flex flex-col items-center justify-center gap-2 bg-pink-50">
        <Heart className="text-pink-400" size={32} />
        <span className="text-2xl chubby-text text-stone-700">{stats.reputation}</span>
        <span className="text-xs font-bold text-stone-400 uppercase">Reputation</span>
      </CuteCard>
    </div>

    {/* Leaderboard */}
    <div className="space-y-4">
      <h3 className="text-xl chubby-text text-stone-800 px-2">Friend Leaderboard</h3>
      {leaderboard
        .sort((a, b) => b.score - a.score)
        .map((friend, index) => (
          <CuteCard key={friend.id} className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-4">
              <span
                className={`font-black text-xl w-6 ${index === 0 ? "text-yellow-500" : index === 1 ? "text-stone-400" : index === 2 ? "text-orange-400" : "text-stone-300"}`}
              >
                {index + 1}
              </span>
              <div className={`w-10 h-10 rounded-full ${friend.color} flex items-center justify-center text-lg`}>
                {friend.avatar}
              </div>
              <span className="font-bold text-stone-700">{friend.name}</span>
            </div>
            <div className="text-sm font-bold text-stone-500">{friend.score} pts</div>
          </CuteCard>
        ))}
    </div>
  </div>
);

export default ProfileView;

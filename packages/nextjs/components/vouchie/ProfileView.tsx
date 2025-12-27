import React from "react";
import { Stats, UserProfile } from "../../types/vouchie";
import Avatar from "./Avatar";
import { CheckCircle, Fire, Heart, Star, Trophy, Wallet } from "@phosphor-icons/react";

interface ProfileViewProps {
  user: UserProfile;
  stats: Stats;
  leaderboard: UserProfile[];
}

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) => (
  <div className="bg-white rounded-2xl p-5 shadow-md border border-stone-100 flex flex-col items-center gap-4">
    <div className="text-3xl">{icon}</div>
    <div className="flex-1 text-center">
      <p className="text-3xl font-bold text-stone-800">{value}</p>
      <p className="text-sm font-semibold text-stone-500">{label}</p>
    </div>
  </div>
);

const WeeklyChart = () => {
  const data = [4, 6, 5, 7, 8, 6, 5, 4];
  const max = Math.max(...data);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-100">
      <h3 className="text-lg font-bold text-stone-800 mb-4">Weekly Goals</h3>
      <div className="flex items-end gap-2 h-32 relative">
        {/* Simple visualization */}
        {[...data].map((value, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end h-full">
            <div
              className="w-full bg-[#F5F1EA] rounded-t-lg transition-all hover:bg-[#E8E1D5]"
              style={{ height: `${(value / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const StreakChart = () => {
  const data = [
    { day: "M", value: 0 },
    { day: "T", value: 2 },
    { day: "W", value: 1 },
    { day: "T", value: 4 },
    { day: "F", value: 3 },
    { day: "S", value: 5 },
    { day: "S", value: 7 },
    { day: "S", value: 4 },
  ];
  const max = Math.max(...data.map(d => d.value));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-100">
      <h3 className="text-lg font-bold text-stone-800 mb-4">7-Day Streak</h3>
      <div className="flex items-end gap-2 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end h-full">
            <div
              className={`w-full rounded-t-md transition-all ${d.value > 0 ? "bg-[#8B5A2B]" : "bg-stone-100"}`}
              style={{ height: `${(d.value / max) * 100}%` }}
            />
            <span className="text-xs font-bold text-stone-400 mt-2 text-center block">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileView = ({ user, stats, leaderboard }: ProfileViewProps) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-8 shadow-md border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-[#FAF7F2] to-white" />
        <div className="relative flex flex-col items-center mb-2">
          <Avatar src={user.avatar} name={user.name} size="xl" showBorder />
          <div className="text-center mt-4">
            <h1 className="text-3xl font-bold text-stone-800">{user.name}</h1>
            <p className="text-stone-500 font-semibold">Productivity Wizard</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="bg-[#FFA726] text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                <Star weight="fill" /> Lvl 5
              </div>
              <div className="bg-[#8B5A2B] text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
                <Trophy weight="fill" /> {user.score} XP
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <WeeklyChart />
        </div>
        <div className="md:col-span-1">
          <StreakChart />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<CheckCircle weight="fill" className="text-green-600" />}
          value={stats.tasksCompleted}
          label="Tasks Done"
        />
        <StatCard
          icon={<Wallet weight="fill" className="text-[#8B5A2B]" />}
          value={`USDC ${stats.usdcSaved}`}
          label="USDC Saved"
        />
        <StatCard
          icon={<Fire weight="fill" className="text-orange-500" />}
          value={`${stats.streak} days`}
          label="Day Streak"
        />
        <StatCard
          icon={<Heart weight="fill" className="text-[#A67B5B]" />}
          value={stats.reputation}
          label="Reputation"
        />
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-stone-100">
        <h3 className="text-xl font-bold text-stone-800 mb-4">Vouchie Leaderboard</h3>
        <div className="space-y-3">
          {leaderboard
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map((friend, index) => (
              <div
                key={friend.id}
                className="flex items-center justify-between py-3 px-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar src={friend.avatar} name={friend.name} size="md" showBorder />
                    <div
                      className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-white ${index === 0 ? "bg-yellow-400" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : "bg-stone-300"}`}
                    >
                      {index + 1}
                    </div>
                  </div>
                  <div>
                    <p className="font-bold text-stone-700 text-sm">{friend.name}</p>
                    <p className="text-xs text-stone-400">Reputation: {friend.score}</p>
                  </div>
                </div>
                <div className="text-xl font-bold font-black text-stone-800">#{index + 1}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;

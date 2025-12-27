import React from "react";
import CuteCard from "./Helper/CuteCard";
import { Trophy } from "lucide-react";

const MOCK_PROFILES = [
  { id: 1, name: "Mochi", color: "bg-pink-200", avatar: "🐱", score: 2450, status: "online" },
  { id: 2, name: "Pudding", color: "bg-blue-200", avatar: "🐶", score: 2100, status: "offline" },
  { id: 3, name: "Bunny", color: "bg-green-200", avatar: "🐰", score: 1850, status: "online" },
  { id: 4, name: "Froggy", color: "bg-teal-200", avatar: "🐸", score: 1200, status: "offline" },
];

const SquadView = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <header className="text-center mb-8">
      <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-500">
        <Trophy size={32} />
      </div>
      <h2 className="text-3xl chubby-text text-stone-800">Squad Board</h2>
      <p className="text-stone-500 font-bold">Keep each other accountable!</p>
    </header>

    <div className="space-y-4">
      {MOCK_PROFILES.map((profile, i) => (
        <CuteCard
          key={profile.id}
          className="flex items-center justify-between group hover:bg-indigo-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div
                className={`w-14 h-14 rounded-full ${profile.color} flex items-center justify-center text-2xl border-4 border-white shadow-sm`}
              >
                {profile.avatar}
              </div>
              <div
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${profile.status === "online" ? "bg-green-400" : "bg-stone-300"}`}
              />
            </div>
            <div>
              <h3 className="font-bold text-stone-700 text-lg flex items-center gap-2">
                {profile.name}
                {i === 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">MVP</span>}
              </h3>
              <p className="text-xs text-stone-400 font-bold">{profile.score} Reputation Pts</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white rounded-xl text-stone-600 font-bold text-sm shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-500 hover:text-white transform translate-x-2 group-hover:translate-x-0">
            Nudge 👋
          </button>
        </CuteCard>
      ))}
      <button className="w-full py-4 border-2 border-dashed border-stone-200 rounded-[28px] text-stone-400 font-bold hover:bg-white/50 hover:text-indigo-400 hover:border-indigo-200 transition-all">
        + Invite Friend
      </button>
    </div>
  </div>
);

export default SquadView;

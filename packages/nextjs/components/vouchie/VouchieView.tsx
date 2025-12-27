import React from "react";
import Avatar from "./Avatar";
import Card from "./Helper/Card";
import { Trophy } from "@phosphor-icons/react";

const MOCK_PROFILES = [
  {
    id: 1,
    name: "Mochi",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mochi",
    score: 2450,
    status: "online" as const,
  },
  {
    id: 2,
    name: "Pudding",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pudding",
    score: 2100,
    status: "offline" as const,
  },
  {
    id: 3,
    name: "Bunny",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bunny",
    score: 1850,
    status: "online" as const,
  },
  {
    id: 4,
    name: "Froggy",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Froggy",
    score: 1200,
    status: "offline" as const,
  },
];

const VouchieView = () => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <header className="text-center mb-8">
      <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
        <Trophy size={32} weight="fill" />
      </div>
      <h2 className="text-3xl font-bold text-stone-800">Vouchie Board</h2>
      <p className="text-stone-500 font-bold">Keep each other accountable!</p>
    </header>

    <div className="space-y-4">
      {MOCK_PROFILES.map((profile, i) => (
        <Card
          key={profile.id}
          className="flex items-center justify-between group hover:bg-stone-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <Avatar src={profile.avatar} name={profile.name} size="lg" status={profile.status} showBorder />
            <div>
              <h3 className="font-bold text-stone-700 text-lg flex items-center gap-2">
                {profile.name}
                {i === 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                    MVP
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-400 font-bold">{profile.score} Reputation Pts</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white rounded-xl text-stone-600 font-bold text-sm shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-orange-500 hover:text-white transform translate-x-2 group-hover:translate-x-0 min-h-[44px]">
            Nudge <span className="text-xs ml-1 opacity-80">👋</span>
          </button>
        </Card>
      ))}
      <button className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl text-stone-400 font-bold hover:bg-white/50 hover:text-orange-500 hover:border-orange-200 transition-all min-h-[48px]">
        + Invite Vouchie
      </button>
    </div>
  </div>
);

export default VouchieView;

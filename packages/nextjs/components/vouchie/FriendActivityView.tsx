import React from "react";
import Image from "next/image";
import { Check, Fire, Pizza } from "@phosphor-icons/react";

const MOCK_ACTIVITIES = [
  {
    id: 1,
    type: "verify",
    user: "Eddy",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eddy",
    task: "Morning Run 5km",
    time: "2m ago",
    content: "Just finished my run! Can someone verify?",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
    streak: 12,
    amount: 10,
  },
  {
    id: 2,
    type: "fail",
    user: "Pudding",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Pudding",
    task: "No Sugar Week",
    time: "1h ago",
    content: "I caved... donuts were too strong. 🍩",
    penalty: "Buying pizza for the squad! 🍕",
    streak: 5,
    amount: 25,
  },
  {
    id: 3,
    type: "streak",
    user: "Bunny",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bunny",
    task: "Code Daily",
    time: "3h ago",
    content: "Hit a 30-day streak! 🔥 Can't stop won't stop.",
    streak: 30,
    amount: 0,
  },
];

const FriendActivityView = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="mb-4">
        <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">Activity</h2>
      </header>

      <div className="space-y-4">
        {MOCK_ACTIVITIES.map(activity => (
          <div
            key={activity.id}
            className="bg-white dark:bg-stone-800 rounded-2xl p-4 shadow-sm border border-stone-100 dark:border-stone-700"
          >
            <div className="flex items-start gap-3">
              {/* Avatar Section */}
              <div className="flex flex-col items-center">
                <div className="relative p-[2px] rounded-full bg-gradient-to-tr from-orange-500 via-red-500 to-yellow-500">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-stone-100 dark:bg-stone-700 border-2 border-white dark:border-stone-800">
                    <Image src={activity.avatar} alt={activity.user} width={40} height={40} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-stone-800 rounded-full p-0.5 shadow-sm border border-stone-100 dark:border-stone-700 z-10">
                    {activity.type === "verify" && <Check size={12} weight="bold" className="text-blue-500" />}
                    {activity.type === "fail" && <Pizza size={12} weight="fill" className="text-orange-500" />}
                    {activity.type === "streak" && <Fire size={12} weight="fill" className="text-red-500" />}
                  </div>
                </div>
                {/* Streak Badge */}
                <div className="bg-stone-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm -mt-2 z-20 border border-stone-700 relative">
                  <Fire size={10} weight="fill" className="text-orange-500" />
                  {activity.streak}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-stone-800 dark:text-stone-100">{activity.user}</span>
                    <span className="text-stone-400 text-sm ml-1">
                      {activity.type === "verify" && (
                        <>
                          completed a task and{" "}
                          <span className="text-green-500 font-bold">saved ${activity.amount}</span>
                        </>
                      )}
                      {activity.type === "fail" && (
                        <>
                          failed a task and <span className="text-red-500 font-bold">lost ${activity.amount}</span>
                        </>
                      )}
                      {activity.type === "streak" && "is on fire!"}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap">{activity.time}</span>
                </div>

                <div className="mt-1 bg-stone-50 dark:bg-stone-900/50 rounded-xl p-3 border border-stone-100 dark:border-stone-800">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-1 h-4 rounded-full ${activity.type === "fail" ? "bg-red-500" : activity.type === "streak" ? "bg-orange-500" : "bg-blue-500"}`}
                    />
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300 uppercase tracking-wide">
                      {activity.task}
                    </span>
                  </div>
                  <p className="text-sm text-stone-700 dark:text-stone-200">{activity.content}</p>

                  {/* Penalty for Fail */}
                  {activity.type === "fail" && (
                    <div className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                      <Pizza size={14} weight="fill" />
                      {activity.penalty}
                    </div>
                  )}

                  {/* Verify Action */}
                  {activity.type === "verify" && (
                    <div className="mt-3">
                      {activity.image && (
                        <div className="mb-3 rounded-lg overflow-hidden h-32 relative">
                          <Image src={activity.image} alt="Proof" fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button className="flex-1 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 py-2 rounded-lg text-sm font-bold transition-colors">
                          Deny
                        </button>
                        <button className="flex-1 bg-[#8B5A2B] dark:bg-[#FFA726] hover:bg-[#6B4423] dark:hover:bg-[#FF9800] text-white dark:text-stone-900 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-1">
                          <Check size={16} weight="bold" /> Verify
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendActivityView;

import React from "react";
import { LongTermGoal } from "../../types/vouchie";
import Card from "./Helper/Card";
import ProgressBar from "./Helper/ProgressBar";
import { Calendar, CheckCircle, Compass, Plus, Repeat, Target } from "@phosphor-icons/react";

interface DirectionViewProps {
  longTermGoals: LongTermGoal[];
  setLongTermGoals: (goals: LongTermGoal[]) => void;
}

const DirectionView = ({ longTermGoals, setLongTermGoals }: DirectionViewProps) => {
  const toggleRoutine = (goalId: number, routineId: number) => {
    setLongTermGoals(
      longTermGoals.map(goal => {
        if (goal.id === goalId) {
          const newRoutines = goal.routines.map(r => (r.id === routineId ? { ...r, done: !r.done } : r));
          return { ...goal, routines: newRoutines };
        }
        return goal;
      }),
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="text-center mb-8">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
          <Compass size={32} />
        </div>
        <h2 className="text-3xl font-bold text-stone-800">Your Vision</h2>
        <p className="text-stone-500 font-bold">Small routines, big dreams</p>
      </header>

      <div className="grid gap-6">
        {longTermGoals.map(goal => {
          const progress = Math.round((goal.routines.filter(r => r.done).length / goal.routines.length) * 100) || 0;
          return (
            <Card key={goal.id} className="relative overflow-hidden group">
              <div
                className={`absolute top-0 right-0 w-32 h-32 ${goal.color} opacity-20 rounded-full -mr-10 -mt-10 blur-xl`}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-sm border border-stone-100`}
                    >
                      <span className="text-xs">{goal.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-stone-800">{goal.title}</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                        <span className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-md border border-stone-100">
                          <Calendar size={12} weight="bold" />{" "}
                          {new Date(goal.deadline).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "2-digit",
                          })}
                        </span>
                        <span className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-md border border-stone-100">
                          <Target size={12} weight="bold" /> {progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <ProgressBar progress={progress} color="bg-orange-500" />
                </div>

                <div className="space-y-2">
                  {goal.routines.map(routine => (
                    <div
                      key={routine.id}
                      onClick={() => toggleRoutine(goal.id, routine.id)}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/50 hover:bg-stone-50 transition-colors cursor-pointer border border-transparent hover:border-stone-100"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${routine.done ? "bg-green-400 border-green-400" : "border-stone-300"}`}
                        >
                          {routine.done && <CheckCircle size={12} weight="fill" className="text-white" />}
                        </div>
                        <span
                          className={`text-sm font-bold transition-all ${routine.done ? "text-stone-400 line-through" : "text-stone-600"}`}
                        >
                          {routine.text}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-1 rounded-full flex items-center gap-1">
                        <Repeat size={10} weight="bold" /> {routine.frequency}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}

        <button className="w-full py-4 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-300 hover:text-orange-500 hover:border-orange-200 hover:bg-white transition-all min-h-[64px]">
          <Plus size={32} weight="bold" />
          <span className="font-bold">Add Dream</span>
        </button>
      </div>
    </div>
  );
};

export default DirectionView;

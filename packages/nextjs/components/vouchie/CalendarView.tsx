import React from "react";
import { Goal } from "../../types/vouchie";
import Card from "./Helper/Card";
import { CalendarPlus, CaretLeft, CaretRight } from "@phosphor-icons/react";

interface CalendarViewProps {
  tasks: Goal[];
}

const CalendarView = ({ tasks }: CalendarViewProps) => {
  const days = Array.from({ length: 35 }, (_, i) => {
    const day = i - 2;
    return day > 0 && day <= 31 ? day : null;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-stone-800">October</h2>
        <div className="flex gap-2">
          <button className="p-2 bg-white rounded-xl shadow-sm hover:bg-stone-100 transition-colors">
            <CaretLeft size={20} weight="bold" />
          </button>
          <button className="p-2 bg-[#8B5A2B] text-white rounded-xl shadow-sm hover:bg-[#6B4423] transition-colors">
            <CalendarPlus size={20} weight="fill" />
          </button>
          <button className="p-2 bg-white rounded-xl shadow-sm hover:bg-stone-100 transition-colors">
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      </header>

      <Card className="p-4">
        <div className="grid grid-cols-7 mb-4">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center font-bold text-stone-400 text-xs">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => (
            <div
              key={i}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center relative
                ${!day ? "" : "hover:bg-stone-50 cursor-pointer"}
                ${day === 24 ? "bg-orange-50 text-orange-700" : "text-stone-600"}
              `}
            >
              <span className="font-bold text-sm">{day}</span>
              {day === 24 && <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1" />}
              {day === 26 && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1" />}
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-bold text-stone-700">Upcoming</h3>
        <div className="bg-white/50 p-4 rounded-2xl border border-stone-200 mb-3">
          <div className="flex items-center gap-3 text-stone-500">
            <CalendarPlus size={18} weight="bold" />
            <p className="text-sm font-semibold">Write calendar feature coming soon</p>
          </div>
        </div>
        {tasks.map(task => (
          <div
            key={task.id}
            className="bg-white p-3 rounded-2xl flex items-center gap-3 shadow-sm border border-stone-100"
          >
            <div className={`w-2 h-10 rounded-full ${task.color}`} />
            <div>
              <p className="font-bold text-stone-700">{task.title}</p>
              <p className="text-xs text-stone-400 font-bold">
                {new Date(task.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;

import React, { useState } from "react";
import { Goal } from "../../types/vouchie";
import Card from "./Helper/Card";
import { CalendarPlus, CaretLeft, CaretRight, CheckCircle, Clock, XCircle } from "@phosphor-icons/react";

interface CalendarViewProps {
  tasks: Goal[];
}

const CalendarView = ({ tasks }: CalendarViewProps) => {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const days = Array.from({ length: 35 }, (_, i) => {
    const day = i - 2;
    return day > 0 && day <= 31 ? day : null;
  });

  const upcomingTasks = tasks.filter(t => t.status !== "done" && t.status !== "failed");
  const pastTasks = tasks.filter(t => t.status === "done" || t.status === "failed");

  const getDurationLeft = (deadline: number) => {
    const now = new Date().getTime();
    const diff = deadline - now;
    if (diff <= 0) return "Overdue";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const displayedTasks = activeTab === "upcoming" ? upcomingTasks : pastTasks;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold text-stone-800 dark:text-stone-100">October</h2>
        <div className="flex gap-2">
          <button className="p-2 bg-white dark:bg-stone-800 rounded-xl shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300">
            <CaretLeft size={20} weight="bold" />
          </button>
          <button className="p-2 bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900 rounded-xl shadow-sm hover:bg-[#6B4423] dark:hover:bg-[#FF9800] transition-colors">
            <CalendarPlus size={20} weight="fill" />
          </button>
          <button className="p-2 bg-white dark:bg-stone-800 rounded-xl shadow-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300">
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
                ${!day ? "" : "hover:bg-stone-50 dark:hover:bg-stone-700 cursor-pointer"}
                ${day === 24 ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300" : "text-stone-600 dark:text-stone-300"}
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
        {/* Tabs */}
        <div className="flex gap-6 border-b border-stone-200 dark:border-stone-700 mb-4 px-2">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`pb-2 text-sm font-bold transition-colors relative ${
              activeTab === "upcoming"
                ? "text-[#8B5A2B] dark:text-[#FFA726]"
                : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            }`}
          >
            Upcoming
            {activeTab === "upcoming" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5A2B] dark:bg-[#FFA726] rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`pb-2 text-sm font-bold transition-colors relative ${
              activeTab === "past"
                ? "text-[#8B5A2B] dark:text-[#FFA726]"
                : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            }`}
          >
            Past
            {activeTab === "past" && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5A2B] dark:bg-[#FFA726] rounded-full" />
            )}
          </button>
        </div>

        {/* Task List */}
        {displayedTasks.length === 0 ? (
          <div className="text-center py-8 text-stone-400 font-bold text-sm">
            {activeTab === "upcoming" ? "No upcoming tasks!" : "No past tasks yet."}
          </div>
        ) : (
          displayedTasks.map(task => (
            <div
              key={task.id}
              className="relative bg-white dark:bg-stone-800 py-1 pr-2 pl-4 rounded-lg flex items-center justify-between shadow-sm border border-stone-100 dark:border-stone-700"
            >
              <div
                className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full ${
                  task.status === "done"
                    ? "bg-green-500"
                    : task.status === "failed"
                      ? "bg-red-500"
                      : "bg-[#8B5A2B] dark:bg-[#FFA726]"
                }`}
              />
              <div className="flex flex-col min-w-0 flex-1 mr-2 pl-2 justify-center">
                <p className="font-bold text-sm text-stone-800 dark:text-stone-100 truncate leading-none mb-1">
                  {task.title}
                </p>
                <p className="text-[10px] text-stone-400 font-bold flex items-center gap-1 leading-none">
                  {activeTab === "upcoming" ? (
                    <>
                      <Clock size={10} weight="bold" />
                      {getDurationLeft(task.deadline)}
                    </>
                  ) : (
                    <>
                      {task.status === "done" ? (
                        <span className="text-green-500 flex items-center gap-1">
                          <CheckCircle size={10} weight="fill" /> Completed at {formatDateTime(task.deadline)}
                        </span>
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <XCircle size={10} weight="fill" /> Failed at {formatDateTime(task.deadline)}
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>
              <div className="flex-shrink-0">
                <span
                  className={`text-sm font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
                    task.status === "failed"
                      ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                      : "bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400"
                  }`}
                >
                  {task.status === "failed" && <span>💸</span>}${task.stake}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CalendarView;

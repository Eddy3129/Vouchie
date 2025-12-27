import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface MobileTimePickerProps {
  startTime: Date;
  onChange: (date: Date) => void;
  onClose?: () => void;
}

const durationPresets = [
  { label: "+15m", minutes: 15 },
  { label: "+30m", minutes: 30 },
  { label: "+1h", minutes: 60 },
  { label: "+2h", minutes: 120 },
  { label: "+4h", minutes: 240 },
];

const timePresets = [
  { label: "Tonight", hours: 23, minutes: 59 },
  { label: "Tomorrow", hours: 9, minutes: 0 },
  { label: "Monday", hours: 9, minutes: 0 },
  { label: "Next Week", hours: 9, minutes: 0 },
];

const MobileTimePicker = ({ startTime, onChange, onClose }: MobileTimePickerProps) => {
  const [selectedDate, setSelectedDate] = useState(new Date(startTime));
  const [mode, setMode] = useState<"duration" | "custom">("duration");

  const handleDurationClick = (minutes: number) => {
    const newDate = new Date();
    newDate.setMinutes(newDate.getMinutes() + minutes);
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const handleTimePreset = (hours: number, minutes: number) => {
    const newDate = new Date();
    if (hours === 9) {
      newDate.setDate(newDate.getDate() + 1);
    }
    newDate.setHours(hours, minutes, 0, 0);
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const handleCustomTime = (field: "hours" | "minutes", value: number) => {
    const newDate = new Date(selectedDate);
    if (field === "hours") {
      newDate.setHours(value);
    } else {
      newDate.setMinutes(value);
    }
    setSelectedDate(newDate);
    onChange(newDate);
  };

  const formatTimeFromNow = (): string => {
    const now = new Date();
    const diff = selectedDate.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0 && minutes === 0) return "Now";
    if (hours === 0) return `${minutes}m from now`;
    if (minutes === 0) return `${hours}h from now`;
    return `${hours}h ${minutes}m from now`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-stone-800">Set Deadline</h3>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            ×
          </button>
        )}
      </div>

      {/* Time Preview */}
      <div className="text-center p-4 bg-gradient-to-r from-[#8B5A2B]/5 to-[#A67B5B]/5 rounded-2xl border border-[#8B5A2B]/10">
        <p className="text-xs font-semibold text-stone-500 mb-1">Deadline will be</p>
        <p className="text-2xl font-bold text-[#8B5A2B]">{formatTimeFromNow()}</p>
        <p className="text-sm font-semibold text-stone-600 mt-1">
          {selectedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-stone-100 rounded-xl p-1">
        <button
          onClick={() => setMode("duration")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "duration" ? "bg-white text-[#8B5A2B] shadow-sm" : "text-stone-500"
          }`}
        >
          Quick Add
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            mode === "custom" ? "bg-white text-[#8B5A2B] shadow-sm" : "text-stone-500"
          }`}
        >
          Custom Time
        </button>
      </div>

      {/* Duration Mode */}
      {mode === "duration" && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Duration</p>
          <div className="grid grid-cols-5 gap-2">
            {durationPresets.map(preset => (
              <button
                key={preset.label}
                onClick={() => handleDurationClick(preset.minutes)}
                className="py-3 rounded-xl font-semibold text-sm bg-stone-50 text-stone-700 border border-stone-200 hover:border-[#8B5A2B] hover:bg-[#8B5A2B]/5 transition-all active:scale-95 min-h-[48px]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mt-4">Presets</p>
          <div className="grid grid-cols-2 gap-2">
            {timePresets.map(preset => (
              <button
                key={preset.label}
                onClick={() => handleTimePreset(preset.hours, preset.minutes)}
                className="py-3 rounded-xl font-semibold text-sm bg-white text-stone-700 border border-stone-200 hover:border-[#8B5A2B] hover:bg-[#8B5A2B]/5 transition-all active:scale-95 min-h-[48px] flex items-center justify-center gap-2"
              >
                <Clock size={16} />
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Time Mode */}
      {mode === "custom" && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Custom Time</p>
          <div className="flex items-center justify-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-stone-500">Hours</label>
              <div className="flex items-center bg-stone-50 rounded-xl border border-stone-200">
                <button
                  onClick={() => handleCustomTime("hours", Math.max(0, selectedDate.getHours() - 1))}
                  className="px-3 py-4 hover:bg-stone-100 transition-colors active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="flex-1 text-center text-2xl font-bold text-stone-800">
                  {selectedDate.getHours().toString().padStart(2, "0")}
                </span>
                <button
                  onClick={() => handleCustomTime("hours", Math.min(23, selectedDate.getHours() + 1))}
                  className="px-3 py-4 hover:bg-stone-100 transition-colors active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <span className="text-3xl font-bold text-stone-400">:</span>

            <div className="flex-1 space-y-2">
              <label className="text-xs font-semibold text-stone-500">Minutes</label>
              <div className="flex items-center bg-stone-50 rounded-xl border border-stone-200">
                <button
                  onClick={() => handleCustomTime("minutes", Math.max(0, selectedDate.getMinutes() - 15))}
                  className="px-3 py-4 hover:bg-stone-100 transition-colors active:scale-95"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="flex-1 text-center text-2xl font-bold text-stone-800">
                  {(() => {
                    const minutes = Math.floor(selectedDate.getMinutes() / 15) * 15;
                    return minutes.toString().padStart(2, "0");
                  })()}
                </span>
                <button
                  onClick={() => handleCustomTime("minutes", Math.min(45, selectedDate.getMinutes() + 15))}
                  className="px-3 py-4 hover:bg-stone-100 transition-colors active:scale-95"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              const now = new Date();
              now.setHours(now.getHours() + 1, 0, 0, 0);
              setSelectedDate(now);
              onChange(now);
            }}
            className="w-full py-3 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors min-h-[48px]"
          >
            Reset to +1h
          </button>
        </div>
      )}
    </div>
  );
};

export default MobileTimePicker;

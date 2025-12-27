import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle, Plus, Users, Wallet, X } from "@phosphor-icons/react";
import { toast } from "react-hot-toast";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (formData: any) => void;
}

const AddModal = ({ isOpen, onClose, onAdd }: AddModalProps) => {
  // Default deadline is now + 1 hour
  const getDefaultDeadline = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d;
  };

  const [formData, setFormData] = useState({
    title: "",
    stake: 10,
    mode: "Solo",
    type: "task",
    vouchies: [] as string[],
    startTime: new Date(),
    deadline: getDefaultDeadline(),
  });

  const [sliderValue, setSliderValue] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [shake, setShake] = useState(false);

  // Track active chip for highlighting
  const [activeChip, setActiveChip] = useState<string | null>("+1h");

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSliderValue(0);
      setShowConfirm(false);
      setActiveChip("+1h");
      setFormData(prev => ({
        ...prev,
        startTime: new Date(),
        deadline: getDefaultDeadline(),
        title: "",
        stake: 10,
        vouchies: [],
      }));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Slider Logic ---
  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !sliderRef.current) return;

    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;

    setSliderValue(percent);

    if (percent > 90) {
      setIsDragging(false);
      validateAndConfirm();
    }
  };

  const validateAndConfirm = () => {
    if (!formData.title.trim()) {
      triggerError("Please give your goal a title!");
      return;
    }
    if (formData.stake <= 0) {
      triggerError("Stake amount must be greater than 0!");
      return;
    }
    if (formData.deadline <= formData.startTime) {
      triggerError("Deadline must be after start time!");
      return;
    }

    setSliderValue(100);
    setShowConfirm(true);
  };

  const triggerError = (msg: string) => {
    setSliderValue(0);
    setShake(true);
    toast.error(msg, { position: "top-center", duration: 3000 });
    setTimeout(() => setShake(false), 500);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (sliderValue < 90) {
      setSliderValue(0);
    }
  };

  // --- Time Helpers ---
  const setDuration = (label: string, minutes: number) => {
    const d = new Date(formData.startTime);
    d.setMinutes(d.getMinutes() + minutes);
    setFormData(prev => ({ ...prev, deadline: d }));
    setActiveChip(label);
  };

  const setTimeToEndOfDay = () => {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    setFormData(prev => ({ ...prev, deadline: d }));
    setActiveChip("Tonight");
  };

  const setTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    setFormData(prev => ({ ...prev, deadline: d }));
    setActiveChip("Tomorrow");
  };

  const confirmAdd = () => {
    const now = new Date();
    // Use start time if it's in the future, otherwise now
    const effectiveStart = formData.startTime > now ? formData.startTime : now;
    const diffSeconds = Math.max(0, Math.floor((formData.deadline.getTime() - effectiveStart.getTime()) / 1000));

    onAdd({
      ...formData,
      durationSeconds: diffSeconds,
      deadlineDisplay: formData.deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    onClose();
  };

  const MOCK_VOUCHIES = [
    { id: "v1", name: "Pudding", avatar: "🐶", isFav: true },
    { id: "v2", name: "Bunny", avatar: "🐰", isFav: true },
    { id: "v3", name: "Cat", avatar: "🐱", isFav: false },
    { id: "v4", name: "Bear", avatar: "🐻", isFav: false },
  ];

  const toggleVouchie = (id: string) => {
    setFormData(prev => ({
      ...prev,
      vouchies: prev.vouchies.includes(id) ? prev.vouchies.filter(v => v !== id) : [...prev.vouchies, id],
    }));
  };

  // Format Date for Input
  const dateToInputString = (d: Date) => {
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleDateChange = (field: "startTime" | "deadline", e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setFormData(prev => ({ ...prev, [field]: new Date(e.target.value) }));
      setActiveChip(null); // Clear chip selection on manual edit
    }
  };

  const isSolo = formData.vouchies.length === 0;

  // Format time display
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isNow =
    formData.startTime.toDateString() === new Date().toDateString() &&
    Math.abs(formData.startTime.getTime() - new Date().getTime()) < 60000;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
      onMouseUp={handleDragEnd}
      onTouchEnd={handleDragEnd}
    >
      <div
        className={`bg-[#FDFBF7] dark:bg-stone-900 w-full max-w-md rounded-[28px] p-5 soft-shadow animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto overflow-x-hidden ${shake ? "animate-shake" : ""}`}
        onMouseMove={handleDragMove}
        onTouchMove={handleDragMove}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">New Goal</h3>
          <button
            onClick={onClose}
            className="p-1.5 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Form Content */}
        <div className="space-y-4">
          {/* Title */}
          <input
            autoFocus
            placeholder="What's the goal?"
            className="w-full bg-transparent border-b-2 border-stone-200 dark:border-stone-700 py-2 text-2xl font-bold text-stone-800 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none focus:border-[#A67B5B] dark:focus:border-[#FFA726] transition-colors"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
          />

          {/* Inline Time Picker - Start & End side by side */}
          <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3 border border-stone-100 dark:border-stone-700">
            <div className="flex items-center gap-2">
              {/* Start Time */}
              <div className="flex-1 relative">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Start</span>
                <div className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  {isNow ? "Now" : formatTime(formData.startTime)}
                </div>
                <input
                  type="datetime-local"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={dateToInputString(formData.startTime)}
                  onChange={e => handleDateChange("startTime", e)}
                  onClick={e => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {}
                  }}
                />
              </div>

              {/* Arrow */}
              <ArrowRight size={16} weight="bold" className="text-stone-300 dark:text-stone-600 flex-shrink-0" />

              {/* End Time */}
              <div className="flex-1 relative text-right">
                <span className="text-[10px] font-bold text-amber-600 dark:text-orange-400 uppercase tracking-wider">
                  End
                </span>
                <div className="text-lg font-bold text-stone-800 dark:text-orange-100">
                  {formatTime(formData.deadline)}
                </div>
                <div className="text-[9px] font-bold text-amber-600 dark:text-orange-300">
                  {formData.deadline.toDateString() === new Date().toDateString()
                    ? "Today"
                    : formData.deadline.toLocaleDateString([], { month: "short", day: "numeric" })}
                </div>
                <input
                  type="datetime-local"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={dateToInputString(formData.deadline)}
                  onChange={e => handleDateChange("deadline", e)}
                  onClick={e => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {}
                  }}
                />
              </div>
            </div>

            {/* Duration Chips - Single Row */}
            <div className="flex gap-1.5 mt-3">
              {[
                { label: "+30m", action: () => setDuration("+30m", 30) },
                { label: "+1h", action: () => setDuration("+1h", 60) },
                { label: "+2h", action: () => setDuration("+2h", 120) },
                { label: "Tonight", action: () => setTimeToEndOfDay() },
                { label: "Tmrw", action: () => setTomorrowMorning() },
              ].map(chip => (
                <button
                  key={chip.label}
                  onClick={chip.action}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] transition-all active:scale-95 ${
                    activeChip === chip.label
                      ? "bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900"
                      : "bg-white dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:text-[#8B5A2B] dark:hover:text-orange-300"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vouchies - Compact */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={14} weight="fill" className="text-stone-400" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Squad</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button className="flex-shrink-0 w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center border-2 border-dashed border-stone-200 dark:border-stone-700 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                <Plus size={16} weight="bold" />
              </button>
              {MOCK_VOUCHIES.map(v => (
                <button
                  key={v.id}
                  onClick={() => toggleVouchie(v.id)}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg border-b-3 transition-all relative ${
                    formData.vouchies.includes(v.id)
                      ? "bg-amber-100 dark:bg-orange-900/30 border-[#8B5A2B] dark:border-[#FFA726] translate-y-[1px] border-b-2"
                      : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700"
                  }`}
                >
                  {v.avatar}
                  {v.isFav && <div className="absolute -top-1 -right-1 text-[8px]">⭐</div>}
                  {formData.vouchies.includes(v.id) && (
                    <div className="absolute -bottom-1 -right-1 bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900 rounded-full p-0.5 border border-[#FDFBF7] dark:border-stone-900">
                      <Check size={6} weight="bold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stake - Simple inline */}
          <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800 rounded-xl p-3 border border-stone-100 dark:border-stone-700">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Wallet size={18} weight="fill" className="text-[#8B5A2B] dark:text-[#FFA726]" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Lock</span>
            </div>
            <div className="flex-1 flex items-center gap-1">
              <span className="text-lg font-bold text-stone-400">$</span>
              <input
                type="number"
                placeholder="10"
                className="bg-transparent text-xl font-bold w-full outline-none text-stone-800 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                value={formData.stake}
                onChange={e => setFormData({ ...formData, stake: Number(e.target.value) })}
              />
            </div>
            <span className="text-xs font-bold text-stone-400 bg-white dark:bg-stone-700 px-2 py-1 rounded-lg">
              USDC
            </span>
          </div>

          {/* Slide to Confirm - Smaller */}
          <div
            ref={sliderRef}
            className="relative h-14 bg-white dark:bg-stone-800 rounded-full p-1 shadow-inner overflow-hidden cursor-pointer select-none border border-stone-100 dark:border-stone-700"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            {/* Background Text */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <span className="text-stone-300 dark:text-stone-600 font-bold text-xs uppercase tracking-[0.15em]">
                Slide to Pledge
              </span>
            </div>

            {/* Progress Fill */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#A67B5B] to-[#8B5A2B] dark:from-[#FFA726] dark:to-[#FF9800] z-0 transition-all duration-75 ease-linear opacity-30"
              style={{ width: `${sliderValue}%` }}
            />

            {/* Thumb */}
            <div
              className="absolute top-1 bottom-1 w-12 bg-stone-900 dark:bg-stone-100 rounded-full shadow-lg flex items-center justify-center z-10 transition-transform duration-75 ease-linear"
              style={{
                transform: `translateX(${(sliderValue / 100) * (sliderRef.current ? sliderRef.current.clientWidth - 56 : 220)}px)`,
              }}
            >
              <ArrowRight className="text-white dark:text-stone-900" size={20} weight="bold" />
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 w-full max-w-xs animate-in zoom-in-95 duration-200 shadow-2xl border border-stone-100 dark:border-stone-800">
            {/* Lock Icon */}
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-[#8B5A2B]/10 dark:bg-[#FFA726]/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
            </div>

            {/* Title */}
            <h4 className="text-center text-lg font-bold text-stone-800 dark:text-stone-100 mb-1">Begin Challenge?</h4>

            {/* Goal Title */}
            <p className="text-center text-sm font-bold text-[#8B5A2B] dark:text-[#FFA726] mb-3 line-clamp-2">
              &quot;{formData.title}&quot;
            </p>

            {/* Lock Amount - Prominent */}
            <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-3 mb-4 text-center">
              <p className="text-xs text-stone-400 mb-1">You&apos;re locking</p>
              <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">
                ${formData.stake} <span className="text-sm font-semibold text-stone-400">USDC</span>
              </p>
            </div>

            {/* Warning - Single line if solo */}
            {isSolo && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                <span className="text-amber-500 text-sm">⚠</span>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                  Complete on time to get your stake back!
                </p>
              </div>
            )}

            {/* Buttons - Side by side */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#8B5A2B] dark:bg-[#FFA726] dark:text-stone-900 hover:bg-[#6B4423] dark:hover:bg-[#FF9800] transition-colors shadow-lg text-sm flex items-center justify-center gap-1"
              >
                <CheckCircle size={16} weight="fill" /> Lock In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddModal;

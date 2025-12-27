import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle, PencilSimple, Plus, Users, Wallet, X } from "@phosphor-icons/react";
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-200"
      onMouseUp={handleDragEnd}
      onTouchEnd={handleDragEnd}
    >
      <div
        className={`bg-[#FDFBF7] dark:bg-stone-900 w-full max-w-md rounded-[32px] p-6 soft-shadow animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto overflow-x-hidden ${shake ? "animate-shake" : ""}`}
        onMouseMove={handleDragMove}
        onTouchMove={handleDragMove}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl chubby-text text-stone-800 dark:text-stone-100">New Goal</h3>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 dark:bg-stone-800 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Form Content */}
        <div className="space-y-6">
          {/* Title */}
          <div>
            <input
              autoFocus
              placeholder="What's the goal?"
              className="w-full bg-transparent border-b-2 border-stone-100 dark:border-stone-800 p-2 text-3xl font-bold text-stone-800 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 outline-none focus:border-indigo-300 transition-colors"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Redesigned Time Picker */}
          <div className="space-y-4">
            {/* Start Time (Big & Bold) */}
            <div className="flex items-center justify-between bg-stone-50 dark:bg-stone-800 rounded-2xl p-4 border border-stone-100 dark:border-stone-700 relative group">
              <div>
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-0.5">Start</span>
                <div className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
                  {formData.startTime.toDateString() === new Date().toDateString() &&
                  Math.abs(formData.startTime.getTime() - new Date().getTime()) < 60000
                    ? "Now"
                    : formData.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  <PencilSimple size={12} weight="fill" className="text-stone-300 opacity-50" />
                </div>
              </div>
              <input
                type="datetime-local"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                value={dateToInputString(formData.startTime)}
                onChange={e => handleDateChange("startTime", e)}
                onClick={e => {
                  try {
                    e.currentTarget.showPicker();
                  } catch {}
                }}
              />
            </div>

            {/* Deadline Section */}
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-2 ml-1">
                Deadline
              </span>

              {/* Deadline Display (Large Card) */}
              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800 relative group mb-3">
                <div>
                  <span className="text-xs font-bold text-indigo-300 dark:text-indigo-400 uppercase tracking-wider block mb-0.5">
                    End
                  </span>
                  <div className="text-xl font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    {formData.deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    <PencilSimple size={12} weight="fill" className="text-indigo-300 opacity-50" />
                  </div>
                  <div className="text-[10px] font-bold text-indigo-400 mt-0.5">
                    {formData.deadline.toDateString() === new Date().toDateString()
                      ? "Today"
                      : formData.deadline.toLocaleDateString([], { month: "short", day: "numeric" })}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  value={dateToInputString(formData.deadline)}
                  onChange={e => handleDateChange("deadline", e)}
                  onClick={e => {
                    try {
                      e.currentTarget.showPicker();
                    } catch {}
                  }}
                />
              </div>

              {/* Helper Chips */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "+30m", minutes: 30, action: () => setDuration("+30m", 30) },
                  { label: "+1h", minutes: 60, action: () => setDuration("+1h", 60) },
                  { label: "Tonight", action: () => setTimeToEndOfDay() },
                  { label: "Tmrw", action: () => setTomorrowMorning() },
                ].map(chip => (
                  <button
                    key={chip.label}
                    onClick={chip.action}
                    className={`py-2 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                      activeChip === chip.label
                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
                        : "bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-100 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-300"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Vouchies */}
          <div>
            <div className="flex items-center gap-2 mb-2 ml-1">
              <Users size={16} weight="fill" className="text-stone-400" />
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Squad (Vouchies)</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide -mx-1">
              <button className="flex-shrink-0 w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center border-2 border-dashed border-stone-200 dark:border-stone-700 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                <Plus size={20} weight="bold" />
              </button>
              {MOCK_VOUCHIES.map(v => (
                <button
                  key={v.id}
                  onClick={() => toggleVouchie(v.id)}
                  className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-b-4 transition-all relative ${
                    formData.vouchies.includes(v.id)
                      ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 dark:border-indigo-600 translate-y-[2px] border-b-2"
                      : "bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:-translate-y-1 hover:border-b-[6px]"
                  }`}
                >
                  {v.avatar}
                  {v.isFav && <div className="absolute -top-2 -right-2 text-[10px] animate-pulse">⭐</div>}
                  {formData.vouchies.includes(v.id) && (
                    <div className="absolute -bottom-2 -right-2 bg-indigo-500 text-white rounded-full p-0.5 border-2 border-[#FDFBF7] dark:border-stone-900">
                      <Check size={8} weight="bold" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stake */}
          <div className="bg-stone-900 dark:bg-black rounded-3xl p-5 text-white shadow-xl shadow-stone-200 dark:shadow-none relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center mb-2 relative z-10">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Stake Amount</span>
              <span className="text-xs font-bold text-stone-500 bg-stone-800 px-2 py-1 rounded-lg">USDC</span>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <Wallet size={24} weight="fill" className="text-yellow-400" />
              <input
                type="number"
                placeholder="0.00"
                className="bg-transparent text-4xl font-bold w-full outline-none placeholder:text-stone-700 font-mono"
                value={formData.stake}
                onChange={e => setFormData({ ...formData, stake: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Custom Slide to Confirm */}
          <div className="pt-2 pb-2">
            <div
              ref={sliderRef}
              className="relative h-16 bg-white dark:bg-stone-800 rounded-full p-1 shadow-inner overflow-hidden cursor-pointer select-none border border-stone-100 dark:border-stone-700"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              {/* Background Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <span className="text-stone-300 dark:text-stone-600 font-bold text-sm uppercase tracking-[0.2em] animate-pulse">
                  Slide to Pledge
                </span>
              </div>

              {/* Progress Fill */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-400 to-indigo-600 z-0 transition-all duration-75 ease-linear opacity-20"
                style={{ width: `${sliderValue}%` }}
              />

              {/* Thumb */}
              <div
                className="absolute top-1 bottom-1 w-14 bg-stone-900 dark:bg-stone-100 rounded-full shadow-lg flex items-center justify-center z-10 transition-transform duration-75 ease-linear active:scale-95 hover:scale-105"
                style={{
                  transform: `translateX(${(sliderValue / 100) * (sliderRef.current ? sliderRef.current.clientWidth - 64 : 250)}px)`,
                }}
              >
                <ArrowRight className="text-white dark:text-stone-900" size={24} weight="bold" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {showConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 w-full max-w-sm text-center animate-in zoom-in-95 duration-200 shadow-2xl relative overflow-hidden border border-stone-100 dark:border-stone-800">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-500">
                <div className="text-2xl">🔒</div>
              </div>
              <h4 className="text-2xl font-bold text-stone-800 dark:text-stone-100">Confirm Goal</h4>
            </div>

            <div className="mb-6">
              <p className="text-stone-600 dark:text-stone-400 font-semibold mb-2">
                You are about to stake{" "}
                <span className="font-bold text-stone-900 dark:text-stone-200 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800">
                  USDC {formData.stake}
                </span>
              </p>
              <p className="text-lg font-bold text-[#8B5A2B] dark:text-[#FFA726] leading-relaxed">
                &quot;{formData.title}&quot;
              </p>
            </div>

            {isSolo && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-lg">⚠</span>
                  <div className="text-left">
                    <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase mb-1">Important</p>
                    <p className="text-sm text-red-600 dark:text-red-300 font-semibold leading-snug">
                      In Solo mode, you will lose your stake if you fail to complete the goal on time.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={confirmAdd}
                className="w-full py-4 rounded-xl font-bold text-white bg-[#8B5A2B] dark:bg-[#FFA726] dark:text-stone-900 hover:bg-[#6B4423] dark:hover:bg-[#FF9800] transition-colors shadow-lg text-lg flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} weight="fill" /> Confirm Goal
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                }}
                className="w-full py-3 rounded-xl font-semibold text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddModal;

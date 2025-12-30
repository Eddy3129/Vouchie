import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  CheckCircle,
  MagnifyingGlass,
  Plus,
  Spinner,
  Users,
  Wallet,
  X,
} from "@phosphor-icons/react";
import { toast } from "react-hot-toast";
import { Vouchie } from "~~/types/vouchie";

// Animation states for smooth transitions
type AnimationState = "entering" | "entered" | "exiting" | "exited";

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (formData: any) => void;
}

const ANIMATION_DURATION_IN = 400; // ms for smooth slow slide in
const ANIMATION_DURATION_OUT = 100; // ms for quick slide out

const AddModal = ({ isOpen, onClose, onAdd }: AddModalProps) => {
  // Default deadline is now + 1 hour
  const getDefaultDeadline = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d;
  };

  const [formData, setFormData] = useState<{
    title: string;
    stake: number;
    deadline: Date;
    startTime: Date;
    vouchies: Vouchie[];
  }>({
    title: "",
    stake: 10,
    vouchies: [] as Vouchie[],
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

  // Username search state
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [usernameSearch, setUsernameSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Animation state management
  const [animationState, setAnimationState] = useState<AnimationState>("exited");
  const [shouldRender, setShouldRender] = useState(false);

  // Handle open/close animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready before starting animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState("entering");
          setTimeout(() => setAnimationState("entered"), ANIMATION_DURATION_IN);
        });
      });
    } else if (shouldRender) {
      setAnimationState("exiting");
      setTimeout(() => {
        setAnimationState("exited");
        setShouldRender(false);
      }, ANIMATION_DURATION_OUT);
    }
  }, [isOpen, shouldRender]);

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

  // Handle close with animation
  const handleClose = () => {
    setAnimationState("exiting");
    setTimeout(() => {
      onClose();
    }, ANIMATION_DURATION_OUT);
  };

  // Lookup user by username using free Neynar API
  const lookupUsername = useCallback(async () => {
    const query = usernameSearch.trim().toLowerCase().replace("@", "");
    if (!query) return;

    setSearchLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_NEYNAR_API_KEY;
      if (!apiKey) {
        toast.error("API key not configured");
        return;
      }

      // Use free /v2/farcaster/user/by_username endpoint
      const res = await fetch(`https://api.neynar.com/v2/farcaster/user/by_username?username=${query}`, {
        headers: { accept: "application/json", "x-api-key": apiKey },
      });

      if (!res.ok) {
        if (res.status === 404) {
          toast.error(`User @${query} not found`);
        } else {
          toast.error("Failed to lookup user");
        }
        return;
      }

      const data = await res.json();
      const user = data.user;

      if (!user) {
        toast.error(`User @${query} not found`);
        return;
      }

      // Check if already added
      if (formData.vouchies.some(v => v.fid === user.fid)) {
        toast.error(`@${user.username} already added`);
        return;
      }

      // Random cute animal for fallback
      const animals = ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯"];
      const randomAnimal = animals[Math.floor(Math.random() * animals.length)];

      // Add to vouchies
      const newVouchie: Vouchie = {
        name: user.display_name || user.username,
        avatar: user.pfp_url || randomAnimal, // Use animal emoji if no PFP
        fid: user.fid,
        username: user.username,
        address: user.verified_addresses?.eth_addresses?.[0] || user.custody_address || "",
      };

      setFormData(prev => ({
        ...prev,
        vouchies: [...prev.vouchies, newVouchie],
      }));

      toast.success(`Added @${user.username}`);
      setUsernameSearch("");
      setShowUsernameInput(false);
    } catch (err) {
      console.error("Username lookup error:", err);
      toast.error("Failed to lookup user");
    } finally {
      setSearchLoading(false);
    }
  }, [usernameSearch, formData.vouchies]);

  if (!shouldRender) return null;

  // Animation classes
  const backdropClasses = `
    fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4
    transition-all ease-out
    ${animationState === "entering" || animationState === "entered" ? "bg-black/40 backdrop-blur-md" : "bg-black/0 backdrop-blur-none"}
  `;

  const modalClasses = `
    bg-[#FDFBF7] dark:bg-stone-900 w-full max-w-md rounded-[28px] p-5 soft-shadow
    max-h-[90vh] overflow-y-auto overflow-x-hidden
    transition-all ease-out
    ${shake ? "animate-shake" : ""}
    ${
      animationState === "entering" || animationState === "entered"
        ? "opacity-100 translate-y-0 scale-100"
        : "opacity-0 translate-y-8 scale-95"
    }
  `;

  const isExiting = animationState === "exiting";
  const transitionStyle = {
    transitionDuration: `${isExiting ? ANIMATION_DURATION_OUT : ANIMATION_DURATION_IN}ms`,
  };

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
    <div className={backdropClasses} style={transitionStyle} onMouseUp={handleDragEnd} onTouchEnd={handleDragEnd}>
      <div className={modalClasses} style={transitionStyle} onMouseMove={handleDragMove} onTouchMove={handleDragMove}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">New Goal</h3>
          <button
            onClick={handleClose}
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
                  className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all active:scale-95 ${
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
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Vouchies</span>
              {searchLoading && <Spinner size={12} className="animate-spin text-stone-400" />}
            </div>

            {/* Username search input */}
            {showUsernameInput ? (
              <div className="flex gap-2 mb-2">
                <div className="flex-1 flex items-center gap-2 bg-white dark:bg-stone-800 rounded-xl px-3 py-2 border border-stone-200 dark:border-stone-700">
                  <MagnifyingGlass size={16} className="text-stone-400 flex-shrink-0" />
                  <input
                    ref={usernameInputRef}
                    type="text"
                    placeholder="@username"
                    value={usernameSearch}
                    onChange={e => setUsernameSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && lookupUsername()}
                    className="flex-1 bg-transparent text-sm outline-none text-stone-800 dark:text-stone-100 placeholder:text-stone-400"
                    autoFocus
                  />
                  {searchLoading ? (
                    <Spinner size={16} className="animate-spin text-stone-400" />
                  ) : (
                    <button
                      onClick={lookupUsername}
                      disabled={!usernameSearch.trim()}
                      className="text-[#8B5A2B] dark:text-[#FFA726] font-bold text-xs disabled:opacity-50"
                    >
                      Add
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowUsernameInput(false);
                    setUsernameSearch("");
                  }}
                  className="p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-400"
                >
                  <X size={16} />
                </button>
              </div>
            ) : null}

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {/* Add button */}
              <button
                onClick={() => {
                  setShowUsernameInput(true);
                  setTimeout(() => usernameInputRef.current?.focus(), 100);
                }}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center border-2 border-dashed border-stone-200 dark:border-stone-700 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
              >
                <Plus size={16} weight="bold" />
              </button>

              {/* Selected vouchies */}
              {formData.vouchies.map(vouchie => (
                <button
                  key={vouchie.fid}
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      vouchies: prev.vouchies.filter(v => v.fid !== vouchie.fid),
                    }))
                  }
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden border-b-2 transition-all relative bg-amber-100 dark:bg-orange-900/30 border-[#8B5A2B] dark:border-[#FFA726] ring-2 ring-[#8B5A2B] dark:ring-[#FFA726]"
                  title={`@${vouchie.username} (click to remove)`}
                >
                  {vouchie.avatar && vouchie.avatar.startsWith("http") ? (
                    <Image
                      src={vouchie.avatar}
                      alt={vouchie.name}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl flex items-center justify-center w-full h-full bg-stone-100 dark:bg-stone-700">
                      {vouchie.avatar || "👤"}
                    </span>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-[#8B5A2B] dark:bg-[#FFA726] text-white dark:text-stone-900 rounded-full p-0.5 border border-[#FDFBF7] dark:border-stone-900">
                    <Check size={6} weight="bold" />
                  </div>
                </button>
              ))}

              {formData.vouchies.length === 0 && !showUsernameInput && (
                <span className="text-xs text-stone-400 py-2">Tap + to add by @username</span>
              )}
            </div>
          </div>

          {/* Stake - Simple inline */}
          <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800 rounded-xl p-3 border border-stone-100 dark:border-stone-700">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Wallet size={18} weight="fill" className="text-[#8B5A2B] dark:text-[#FFA726]" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Lock</span>
            </div>
            <div className="flex-1 flex items-center justify-end gap-1">
              <input
                type="number"
                placeholder="10"
                className="bg-transparent text-xl font-bold w-24 outline-none text-right text-stone-800 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600"
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
          <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 w-full max-w-sm animate-in zoom-in-95 duration-200 shadow-2xl border border-stone-100 dark:border-stone-800">
            {/* Header */}
            <div className="text-center mb-4">
              <h4 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-1">Confirm Challenge</h4>
              <p className="text-lg font-bold text-[#8B5A2B] dark:text-[#FFA726] line-clamp-2">
                &quot;{formData.title}&quot;
              </p>
            </div>

            {/* Timeline Details */}
            <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4 mb-4 space-y-3">
              {/* Start Time */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Starts</span>
                <span className="text-sm font-bold text-stone-700 dark:text-stone-200">
                  {isNow
                    ? "Now"
                    : formData.startTime.toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                </span>
              </div>

              {/* Deadline */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Deadline</span>
                <span className="text-sm font-bold text-red-500 dark:text-red-400">
                  {formData.deadline.toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-stone-200 dark:border-stone-700" />

              {/* Stake Amount */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Your Stake</span>
                <span className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  ${formData.stake} <span className="text-xs font-semibold text-stone-400">USDC</span>
                </span>
              </div>
            </div>

            {/* What happens if you fail */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                If you fail...
              </p>
              {isSolo ? (
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  You lose your ${formData.stake} USDC stake to the treasury.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    ${formData.stake} USDC will be split among:
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {formData.vouchies.map(vouchie => (
                      <div
                        key={vouchie.fid || vouchie.name}
                        className="flex items-center gap-1.5 bg-white dark:bg-stone-800 px-2 py-1 rounded-lg"
                      >
                        {vouchie.avatar && vouchie.avatar.startsWith("http") ? (
                          <Image
                            src={vouchie.avatar}
                            alt={vouchie.name}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-base">{vouchie.avatar || "👤"}</span>
                        )}
                        <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
                          {vouchie.username ? `@${vouchie.username}` : vouchie.name}
                        </span>
                      </div>
                    ))}
                    <span className="text-xs font-bold text-red-500">
                      (${(formData.stake / formData.vouchies.length).toFixed(2)} each)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Success message */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-xl p-3 mb-4">
              <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-1">
                If you succeed...
              </p>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                You get your ${formData.stake} USDC back!
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdd}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-[#8B5A2B] dark:bg-[#FFA726] dark:text-stone-900 hover:bg-[#6B4423] dark:hover:bg-[#FF9800] transition-colors shadow-lg text-sm flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={18} weight="fill" /> Begin Challenge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddModal;

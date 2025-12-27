import React from "react";

const Timeline = () => {
  const times = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];
  const currentTimeTop = "58%";

  return (
    <div className="flex flex-col w-12 items-center relative py-2 mr-4 flex-shrink-0">
      <div className="absolute top-0 bottom-0 w-0.5 bg-stone-200 rounded-full" />
      {times.map((time, i) => (
        <div key={i} className="relative z-10 bg-[#FAF7F2] py-1 mb-[35px] last:mb-0">
          <span className="text-[10px] font-bold text-stone-400">{time}</span>
        </div>
      ))}
      <div className="absolute w-16 h-0.5 bg-orange-400 z-20 flex items-center" style={{ top: currentTimeTop }}>
        <div className="w-2 h-2 rounded-full bg-orange-400 -ml-1" />
        <span className="absolute left-3 text-[9px] font-bold text-orange-400 bg-orange-50 px-1 rounded-sm">NOW</span>
      </div>
    </div>
  );
};

export default Timeline;

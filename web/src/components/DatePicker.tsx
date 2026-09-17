import React from "react";
import dayjs from "dayjs";
import { T } from "@/lib/theme";
import { dateLabel } from "@/lib/format";

export default function DatePicker({
  selected,
  onSelect,
}: {
  selected: dayjs.Dayjs;
  onSelect: (d: dayjs.Dayjs) => void;
}) {
  const days: dayjs.Dayjs[] = [];
  for (let i = -3; i <= 7; i++) days.push(dayjs().startOf("day").add(i, "day"));

  return (
    <div className="flex overflow-x-auto gap-3 px-4 py-3 scrollbar-hide">
      {days.map((d) => {
        const active = d.isSame(selected, "day");
        return (
          <button
            key={d.format("DDMMYYYY")}
            onClick={() => onSelect(d)}
            className={`flex-shrink-0 min-w-[72px] flex flex-col items-center py-2.5 px-3 rounded-2xl transition-all duration-300 ${
              active 
                ? "bg-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-105" 
                : "bg-white/5 hover:bg-white/10 border border-white/5"
            }`}
          >
            <span
              className={`text-xs font-bold capitalize mb-0.5 ${
                active ? "text-white" : "text-gray-400"
              }`}
            >
              {dateLabel(d)}
            </span>
            <span
              className={`text-base font-black ${
                active ? "text-white" : "text-gray-200"
              }`}
            >
              {d.format("DD/MM")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

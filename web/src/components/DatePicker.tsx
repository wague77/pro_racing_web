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
    <div className="flex overflow-x-auto gap-2 px-4 py-2 scrollbar-hide">
      {days.map((d) => {
        const active = d.isSame(selected, "day");
        return (
          <button
            key={d.format("DDMMYYYY")}
            onClick={() => onSelect(d)}
            className={`flex-shrink-0 min-w-[62px] flex flex-col items-center py-2 px-3 rounded-xl transition-colors ${
              active ? "bg-[#0A7A42]" : "bg-[#EBEBEF] hover:bg-[#E5E5EA]"
            }`}
          >
            <span
              className={`text-[12px] font-semibold capitalize ${
                active ? "text-white" : "text-[#3A3A3C]"
              }`}
            >
              {dateLabel(d)}
            </span>
            <span
              className={`text-[14px] font-extrabold mt-0.5 ${
                active ? "text-white" : "text-[#1C1C1E]"
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

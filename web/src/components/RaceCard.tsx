import React from "react";
import Link from "next/link";
import { fmtHeure, fmtDistance, disciplineLabel, isQuintePlus } from "@/lib/format";
import { Tag } from "@/components/ui";

export default function RaceCard({
  course,
  hippoLabel,
  isFav,
  onToggleFav,
  date,
  r,
  href,
}: {
  course: any;
  hippoLabel?: string;
  isFav?: boolean;
  onToggleFav?: (e: React.MouseEvent) => void;
  date?: string;
  r?: number;
  href?: string;
}) {
  const num = course.numExterne || course.numOrdre;
  const quinte = isQuintePlus(course);

  const linkHref = href || {
    pathname: "/course",
    query: {
      date,
      r,
      c: num,
      libelle: course.libelle || course.libelleCourt,
      hippodrome: hippoLabel || "",
      discipline: course.discipline,
      distance: course.distance || "",
      heureDepart: course.heureDepart || "",
    },
  };

  return (
    <Link
      href={linkHref as any}
      className={`flex flex-row items-center gap-4 bg-white rounded-xl p-4 shadow-sm border ${
        quinte ? "border-[#F5C518] border-[1.5px]" : "border-transparent"
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center w-14 py-2 rounded-xl ${
          quinte ? "bg-[#FFF7DC]" : "bg-[#F1F1F3]"
        }`}
      >
        <span className="text-lg font-extrabold text-[#1C1C1E]">C{num}</span>
        {course.heureDepart && (
          <span className="text-xs font-semibold text-[#10B981] mt-0.5">{fmtHeure(course.heureDepart)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {hippoLabel && <div className="text-xs font-semibold text-[#8E8E93] mb-1">{hippoLabel}</div>}
        {quinte && (
          <div className="flex flex-row items-center self-start gap-1 bg-[#FDE68A] px-2 py-0.5 rounded text-[10px] font-black text-[#7A5200] tracking-wide mb-1 max-w-max">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            QUINTÉ+
          </div>
        )}
        <h3 className="text-lg font-bold text-[#1C1C1E] truncate">
          {course.libelle || course.libelleCourt}
        </h3>
        <div className="flex flex-row flex-wrap gap-2 mt-2">
          <Tag text={disciplineLabel(course.discipline, course.specialite)} tone="brand" />
          {course.distance && <Tag text={fmtDistance(course.distance)} />}
          {course.nombreDeclaresPartants && <Tag text={`${course.nombreDeclaresPartants} partants`} />}
          {course.arriveeDefinitive && <Tag text="Arrivée" tone="warn" />}
        </div>
      </div>

      {onToggleFav ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFav(e);
          }}
          className="p-2"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill={isFav ? "#FF3B30" : "none"}
            stroke={isFav ? "#FF3B30" : "#8E8E93"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
        </button>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8E8E93"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      )}
    </Link>
  );
}

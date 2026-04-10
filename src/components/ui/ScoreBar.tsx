"use client";
import { useState } from "react";
import { cn, scoreBarColor } from "@/lib/utils";
import { ScoreDetail } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ScoreBarProps {
  label: string;
  score: number;
  max?: number;
}

export function ScoreBar({ label, score, max = 10 }: ScoreBarProps) {
  const pct = (score / max) * 100;
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-800">{score}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", scoreBarColor(score))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "lg";
}

export function ScoreCircle({ score, size = "sm" }: ScoreBadgeProps) {
  const color =
    score >= 75 ? "bg-brand-pale text-brand-navy" :
    score >= 60 ? "bg-amber-50 text-amber-800" :
    "bg-red-50 text-red-700";

  return (
    <div className={cn(
      "rounded-full flex flex-col items-center justify-center font-semibold",
      color,
      size === "lg" ? "w-24 h-24 text-3xl" : "w-10 h-10 text-base"
    )}>
      {score}
    </div>
  );
}

interface ScoreDetailBarProps {
  detail: ScoreDetail;
}

export function ScoreDetailBar({ detail }: ScoreDetailBarProps) {
  const [open, setOpen] = useState(false);
  const pct = (detail.score / detail.max) * 100;
  const barColor =
    pct >= 70 ? "bg-brand-sky" :
    pct >= 50 ? "bg-amber-400" :
    "bg-red-400";

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-700 font-medium">{detail.category}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">
            {detail.score}
            <span className="text-gray-400 font-normal">/{detail.max}</span>
          </span>
          <button
            onClick={() => setOpen(!open)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={open ? "閉じる" : "詳細を見る"}
          >
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {open && (
        <div className="mt-2.5 space-y-2 pl-3 border-l-2 border-gray-100">
          {detail.basis.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">採点根拠</p>
              <ul className="space-y-0.5">
                {detail.basis.map((b, i) => (
                  <li key={i} className="text-xs text-gray-600 leading-relaxed">・{b}</li>
                ))}
              </ul>
            </div>
          )}
          {detail.improvements.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">改善ポイント</p>
              <ul className="space-y-1">
                {detail.improvements.map((imp, i) => (
                  <li key={i} className="text-xs text-amber-800 bg-amber-50 rounded-md px-2.5 py-1.5 leading-relaxed">
                    → {imp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

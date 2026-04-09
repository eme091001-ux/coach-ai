import { cn, scoreBarColor } from "@/lib/utils";

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
    score >= 75 ? "bg-emerald-50 text-emerald-800" :
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

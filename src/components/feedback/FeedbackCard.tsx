import Link from "next/link";
import { FeedbackSession } from "@/types";
import { scoreBadge, scoreColor, formatDate } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<FeedbackSession["status"], string> = {
  未確認: "bg-red-100 text-red-700",
  確認済: "bg-blue-100 text-blue-700",
  "1on1済": "bg-purple-100 text-purple-700",
  改善中: "bg-amber-100 text-amber-700",
};

const AVATAR_COLOR: Record<string, string> = {
  "田中 美咲": "bg-teal-100 text-teal-800",
  "鈴木 健太": "bg-blue-100 text-blue-800",
  "佐藤 優": "bg-amber-100 text-amber-800",
  "松本 大輝": "bg-orange-100 text-orange-800",
};

function initials(name: string) {
  return name.replace(" ", "").slice(0, 2);
}

export function FeedbackCard({ session }: { session: FeedbackSession }) {
  const badge = scoreBadge(session.totalScore);
  const avatarClass = AVATAR_COLOR[session.staffName] ?? "bg-gray-100 text-gray-700";

  return (
    <Link href={`/feedback/${session.id}`}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0", avatarClass)}>
          {initials(session.staffName)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{session.staffName}</span>
            <span className="text-xs text-gray-400">—</span>
            <span className="text-xs text-gray-500">{session.meetingType}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {formatDate(session.meetingDate)} ・ {session.candidateName} ・ {session.id}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs px-2 py-0.5 rounded-full", badge.className)}>{badge.label}</span>
          <span className={cn("text-xl font-semibold w-10 text-right", scoreColor(session.totalScore))}>
            {session.totalScore}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full", STATUS_STYLE[session.status])}>
            {session.status}
          </span>
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </div>
    </Link>
  );
}

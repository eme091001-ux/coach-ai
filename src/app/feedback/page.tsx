"use client";
import { useState, useEffect } from "react";
import { FeedbackCard } from "@/components/feedback/FeedbackCard";
import { FeedbackSession, Staff } from "@/types";
import { fetchFeedbackSessions, fetchStaff } from "@/lib/db";
import { Download } from "lucide-react";

const MEETING_TYPES = ["すべて", "初回面談", "求人提案", "面接対策", "内定承諾", "法人営業", "商談"];
const STATUSES = ["すべて", "未確認", "確認済", "1on1済", "改善中"];

function exportCsv(sessions: FeedbackSession[]) {
  const header = ["作成日", "面談日", "担当者名", "面談種別", "求職者名", "総合スコア", "次回テーマ", "ステータス"];
  const rows = sessions.map((s) => [
    s.createdAt.slice(0, 10),
    s.meetingDate,
    s.staffName,
    s.meetingType,
    s.candidateName,
    String(s.totalScore),
    s.nextTheme,
    s.status,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `feedback_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FeedbackListPage() {
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [staffList, setStaffList] = useState<string[]>([]);
  const [staff, setStaff] = useState("すべて");
  const [type, setType] = useState("すべて");
  const [status, setStatus] = useState("すべて");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbackSessions()
      .then(setSessions)
      .finally(() => setLoading(false));

    fetchStaff().then((list: Staff[]) =>
      setStaffList(list.map((s) => s.name))
    );
  }, []);

  const filtered = sessions.filter((s) => {
    if (staff !== "すべて" && s.staffName !== staff) return false;
    if (type !== "すべて" && s.meetingType !== type) return false;
    if (status !== "すべて" && s.status !== status) return false;
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">フィードバック一覧</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{filtered.length}件</span>
          <button
            onClick={() => exportCsv(filtered)}
            className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download size={14} /> CSVエクスポート
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="flex gap-3 mb-5">
        <select
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-sky"
        >
          <option value="すべて">担当者: すべて</option>
          {staffList.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-sky"
        >
          {MEETING_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "すべて" ? "面談種別: すべて" : t}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-sky"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "すべて" ? "ステータス: すべて" : s}
            </option>
          ))}
        </select>
      </div>

      {/* リスト */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">読み込み中...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            該当するフィードバックがありません
          </div>
        ) : (
          filtered.map((s) => <FeedbackCard key={s.id} session={s} />)
        )}
      </div>
    </div>
  );
}

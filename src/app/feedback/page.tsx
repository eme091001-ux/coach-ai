"use client";
import { useState } from "react";
import { MOCK_SESSIONS, STAFF_LIST } from "@/lib/mockData";
import { FeedbackCard } from "@/components/feedback/FeedbackCard";
import { FeedbackSession } from "@/types";

const MEETING_TYPES = ["すべて", "初回面談", "求人提案", "面接対策", "内定承諾", "法人営業", "商談"];
const STATUSES: FeedbackSession["status"][] = ["未確認", "確認済", "1on1済", "改善中"];

export default function FeedbackListPage() {
  const [staff, setStaff] = useState("すべて");
  const [type, setType] = useState("すべて");
  const [status, setStatus] = useState("すべて");

  const filtered = MOCK_SESSIONS.filter((s) => {
    if (staff !== "すべて" && s.staffName !== staff) return false;
    if (type !== "すべて" && s.meetingType !== type) return false;
    if (status !== "すべて" && s.status !== status) return false;
    return true;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">フィードバック一覧</h1>
        <span className="text-sm text-gray-400">{filtered.length}件</span>
      </div>

      {/* フィルター */}
      <div className="flex gap-3 mb-5">
        <select
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="すべて">担当者: すべて</option>
          {STAFF_LIST.map((s) => <option key={s}>{s}</option>)}
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {MEETING_TYPES.map((t) => (
            <option key={t} value={t}>{t === "すべて" ? "面談種別: すべて" : t}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="すべて">ステータス: すべて</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* リスト */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">該当するフィードバックがありません</div>
        ) : (
          filtered.map((s) => <FeedbackCard key={s.id} session={s} />)
        )}
      </div>
    </div>
  );
}

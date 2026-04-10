"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Staff, FeedbackSession } from "@/types";
import { fetchStaffById, fetchFeedbackByStaffId } from "@/lib/db";
import { FeedbackCard } from "@/components/feedback/FeedbackCard";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { SCORE_LABELS, cn, formatDate, scoreBadge } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ChevronLeft,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
} from "lucide-react";

function initials(name: string) {
  return name.replace(" ", "").slice(0, 2);
}

function buildMonthlyData(sessions: FeedbackSession[]) {
  const map: Record<string, { total: number; count: number }> = {};
  for (const s of sessions) {
    const month = s.meetingDate.slice(0, 7);
    if (!map[month]) map[month] = { total: 0, count: 0 };
    map[month].total += s.totalScore;
    map[month].count++;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { total, count }]) => ({
      month: month.replace("-", "/"),
      score: Math.round(total / count),
    }));
}

function buildAvgScores(sessions: FeedbackSession[]) {
  if (sessions.length === 0) return null;
  const keys = Object.keys(sessions[0].scores) as (keyof FeedbackSession["scores"])[];
  const result = {} as FeedbackSession["scores"];
  for (const key of keys) {
    const avg =
      sessions.reduce((a, s) => a + s.scores[key], 0) / sessions.length;
    result[key] = Math.round(avg * 10) / 10;
  }
  return result;
}

function buildThemeHistory(sessions: FeedbackSession[]) {
  const map: Record<string, string> = {};
  for (const s of sessions) {
    if (!map[s.nextTheme] || s.meetingDate > map[s.nextTheme]) {
      map[s.nextTheme] = s.meetingDate;
    }
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b.localeCompare(a))
    .map(([theme, latestDate]) => ({ theme, latestDate }));
}

export default function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [staff, setStaff] = useState<Staff | null>(null);
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    experience: "",
    role: "",
    email: "",
  });

  useEffect(() => {
    Promise.all([
      fetchStaffById(id),
      fetchFeedbackByStaffId(id),
    ]).then(([s, fb]) => {
      if (!s) { router.push("/staff"); return; }
      setStaff(s);
      setEditForm({ name: s.name, experience: s.experience, role: s.role, email: s.email });
      setSessions(fb);
    }).finally(() => setLoading(false));
  }, [id, router]);

  const handleSave = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          experience: editForm.experience,
          role: editForm.role,
          email: editForm.email,
          avatarColor: staff?.avatarColor,
        }),
      });
      if (!res.ok) throw new Error("更新失敗");
      setStaff((prev) =>
        prev ? { ...prev, name: editForm.name, experience: editForm.experience, role: editForm.role, email: editForm.email } : null
      );
      setEditing(false);
    } catch {
      alert("更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`${staff?.name} を削除しますか？`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除失敗");
      router.push("/staff");
    } catch {
      alert("削除に失敗しました");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!staff) return null;

  const monthlyData = buildMonthlyData(sessions);
  const avgScores = buildAvgScores(sessions);
  const themeHistory = buildThemeHistory(sessions);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          href="/staff"
          className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-400" />
        </Link>
        <div className="flex-1 flex items-center gap-4">
          <div
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold shrink-0",
              staff.avatarColor
            )}
          >
            {initials(staff.name)}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{staff.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {staff.experience} ・ {staff.role}
              {staff.email && ` ・ ${staff.email}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil size={13} /> 編集
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}{" "}
            削除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          {/* 月別スコア推移 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">
              月別スコア推移
            </h2>
            {monthlyData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                データがありません
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      border: "1px solid #f3f4f6",
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    name="スコア"
                    stroke="#3B8FD4"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#3B8FD4" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 項目別スコア */}
          {avgScores && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                項目別スコア（平均）
              </h2>
              {(Object.keys(avgScores) as (keyof typeof avgScores)[]).map(
                (key) => (
                  <ScoreBar
                    key={key}
                    label={SCORE_LABELS[key]}
                    score={avgScores[key]}
                  />
                )
              )}
            </div>
          )}

          {/* フィードバック一覧 */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-sm font-medium text-gray-900">
                フィードバック一覧
              </p>
            </div>
            {sessions.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                まだフィードバックがありません
              </div>
            ) : (
              sessions.map((s) => <FeedbackCard key={s.id} session={s} />)
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* 統計 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">統計</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500">面談数</span>
                <span className="text-sm font-medium text-gray-800">
                  {sessions.length}件
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-500">平均スコア</span>
                <span className="text-sm font-medium text-gray-800">
                  {sessions.length > 0
                    ? Math.round(
                        sessions.reduce((a, s) => a + s.totalScore, 0) /
                          sessions.length
                      )
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-xs text-gray-500">最新スコア</span>
                <span className="text-sm font-medium text-gray-800">
                  {sessions.length > 0
                    ? sessions[0].totalScore
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* 改善テーマ履歴 */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">
              改善テーマ履歴
            </p>
            {themeHistory.length === 0 ? (
              <p className="text-xs text-gray-400">データなし</p>
            ) : (
              <div className="space-y-2">
                {themeHistory.map(({ theme, latestDate }, i) => {
                  const badge = i === 0
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600";
                  return (
                    <div
                      key={theme}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full",
                          badge
                        )}
                      >
                        {theme}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(latestDate)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 最新フィードバックのバッジ */}
          {sessions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="text-sm font-medium text-gray-900 mb-2">
                最新評価
              </p>
              {(() => {
                const latest = sessions[0];
                const badge = scoreBadge(latest.totalScore);
                return (
                  <div>
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDate(latest.meetingDate)} ・ {latest.meetingType}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {latest.summary}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">
                CA情報を編集
              </h2>
              <button
                onClick={() => setEditing(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={15} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">名前</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-sky"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  経験年数
                </label>
                <select
                  value={editForm.experience}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      experience: e.target.value,
                    }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-sky"
                >
                  {["1年未満", "1〜2年", "3〜5年", "5年以上"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">役職</label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-sky"
                >
                  {["CA", "シニアCA", "リーダー", "マネージャー"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-sky"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 text-sm border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.name.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-brand-navy text-white py-2.5 rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}{" "}
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

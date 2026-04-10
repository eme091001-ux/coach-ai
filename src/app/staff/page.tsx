"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Staff, FeedbackSession } from "@/types";
import { fetchStaff, fetchFeedbackSessions } from "@/lib/db";
import { cn, scoreColor } from "@/lib/utils";
import { Plus, Loader2, X, ChevronRight } from "lucide-react";

const AVATAR_COLORS = [
  "bg-teal-100 text-teal-800",
  "bg-blue-100 text-blue-800",
  "bg-amber-100 text-amber-800",
  "bg-orange-100 text-orange-800",
  "bg-purple-100 text-purple-800",
  "bg-rose-100 text-rose-800",
  "bg-green-100 text-green-800",
  "bg-indigo-100 text-indigo-800",
];

function initials(name: string) {
  return name.replace(" ", "").slice(0, 2);
}

interface StaffStats {
  avgScore: number;
  count: number;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [stats, setStats] = useState<Record<string, StaffStats>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    experience: "1〜2年",
    role: "CA",
    email: "",
  });

  useEffect(() => {
    Promise.all([fetchStaff(), fetchFeedbackSessions()]).then(
      ([staffs, sessions]: [Staff[], FeedbackSession[]]) => {
        setStaffList(staffs);

        // Compute stats per staff
        const statsMap: Record<string, StaffStats> = {};
        for (const staff of staffs) {
          const staffSessions = sessions.filter(
            (s) =>
              s.staffId === staff.id ||
              (!s.staffId && s.staffName === staff.name)
          );
          const count = staffSessions.length;
          const avg =
            count > 0
              ? Math.round(
                  staffSessions.reduce((a, s) => a + s.totalScore, 0) / count
                )
              : 0;
          statsMap[staff.id] = { avgScore: avg, count };
        }
        setStats(statsMap);
      }
    ).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const avatarColor =
        AVATAR_COLORS[staffList.length % AVATAR_COLORS.length];
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, avatarColor }),
      });
      if (!res.ok) throw new Error("登録失敗");
      const data = await res.json();
      const newStaff: Staff = {
        id: data.id,
        tenantId: data.tenant_id ?? "tenant_001",
        name: data.name,
        experience: data.experience,
        role: data.role,
        email: data.email ?? "",
        avatarColor: data.avatar_color ?? avatarColor,
        createdAt: data.created_at ?? new Date().toISOString(),
      };
      setStaffList((prev) => [...prev, newStaff]);
      setStats((prev) => ({ ...prev, [newStaff.id]: { avgScore: 0, count: 0 } }));
      setShowModal(false);
      setForm({ name: "", experience: "1〜2年", role: "CA", email: "" });
    } catch {
      alert("登録に失敗しました。Supabaseの設定を確認してください。");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">担当者管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm bg-brand-navy hover:bg-brand-blue text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={14} /> CAを追加
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {staffList.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              担当者が登録されていません
            </div>
          ) : (
            staffList.map((s) => {
              const st = stats[s.id] ?? { avgScore: 0, count: 0 };
              return (
                <Link key={s.id} href={`/staff/${s.id}`}>
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                        s.avatarColor
                      )}
                    >
                      {initials(s.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {s.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {s.experience} ・ {s.role}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">平均スコア</p>
                        <p
                          className={cn(
                            "text-lg font-semibold",
                            st.avgScore > 0
                              ? scoreColor(st.avgScore)
                              : "text-gray-300"
                          )}
                        >
                          {st.avgScore > 0 ? st.avgScore : "—"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">面談数</p>
                        <p className="text-lg font-semibold text-gray-700">
                          {st.count}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400 mb-0.5">担当領域</p>
                        <p className="text-xs text-gray-600 font-medium">
                          {s.role}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Add modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-gray-900">CAを追加</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={15} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="田中 美咲"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-sky"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  経験年数
                </label>
                <select
                  value={form.experience}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, experience: e.target.value }))
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
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value }))
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
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="tanaka@example.com"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-sky"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 text-sm border border-gray-200 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.name.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm bg-brand-navy text-white py-2.5 rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

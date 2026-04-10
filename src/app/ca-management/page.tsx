"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchStaff, fetchFeedbackSessions } from "@/lib/db";
import { Staff, FeedbackSession } from "@/types";
import { Plus, Loader2, X, ChevronRight } from "lucide-react";

const AVATAR_COLORS = [
  { bg: "#DBEAFE", text: "#1E40AF" }, { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FEF3C7", text: "#92400E" }, { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#EDE9FE", text: "#5B21B6" }, { bg: "#FEE2E2", text: "#991B1B" },
];

function initials(name: string) { return name.replace(/\s+/g, "").slice(0, 2); }

export default function CAManagementPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [stats, setStats] = useState<Record<string, { count: number; avg: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", experience: "1〜2年", role: "CA", email: "" });

  useEffect(() => {
    Promise.all([fetchStaff(), fetchFeedbackSessions()]).then(
      ([staffs, sessions]: [Staff[], FeedbackSession[]]) => {
        setStaffList(staffs);
        const map: Record<string, { count: number; avg: number }> = {};
        for (const s of staffs) {
          const ss = sessions.filter((f) => f.staffId === s.id || (!f.staffId && f.staffName === s.name));
          map[s.id] = { count: ss.length, avg: ss.length ? Math.round(ss.reduce((a, f) => a + f.totalScore, 0) / ss.length) : 0 };
        }
        setStats(map);
      }
    ).finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const color = AVATAR_COLORS[staffList.length % AVATAR_COLORS.length];
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, avatarColor: `bg-blue-100 text-blue-800` }),
      });
      if (!res.ok) throw new Error("登録失敗");
      const { staff } = await res.json();
      if (staff) setStaffList((prev) => [...prev, staff]);
      setForm({ name: "", experience: "1〜2年", role: "CA", email: "" });
      setShowModal(false);
    } catch { /* noop */ } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F7FC", padding: "28px 28px 60px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D2B5E" }}>CA管理</h1>
          <p style={{ fontSize: 13, color: "#4A6FA5", marginTop: 4 }}>CAメンバーを選択して詳細を確認</p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
          <Plus size={15} /> CA追加
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
          <Loader2 size={24} style={{ color: "#3B8FD4", animation: "spin 1s linear infinite" }} />
        </div>
      ) : staffList.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#9CAAB8" }}>
          <p style={{ fontSize: 14 }}>CAメンバーが登録されていません</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {staffList.map((s, idx) => {
            const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
            const st = stats[s.id] ?? { count: 0, avg: 0 };
            return (
              <Link key={s.id} href={`/ca-management/${s.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: 20, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3B8FD4"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(59,143,212,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#C8DFF5"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: color.bg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: color.text, flexShrink: 0 }}>
                      {initials(s.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}>{s.name}</p>
                      <p style={{ fontSize: 11, color: "#9CAAB8", marginTop: 1 }}>{s.experience} · {s.role}</p>
                    </div>
                    <ChevronRight size={16} color="#C8DFF5" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["面談数", `${st.count}件`],
                      ["平均スコア", st.avg > 0 ? `${st.avg}点` : "—"],
                    ].map(([label, val]) => (
                      <div key={label} style={{ background: "#F7FAFF", borderRadius: 8, padding: "8px 12px" }}>
                        <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Add CA Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, width: 420, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: "#0D2B5E" }}>CAを追加</p>
              <button onClick={() => setShowModal(false)} style={{ color: "#9CAAB8" }}><X size={18} /></button>
            </div>
            {[
              { label: "氏名 *", key: "name", placeholder: "山田 花子" },
              { label: "メールアドレス", key: "email", placeholder: "hanako@example.com" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>{label}</label>
                <input value={form[key as keyof typeof form]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 13, color: "#0D2B5E", outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>経験年数</label>
                <select value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 13, color: "#0D2B5E" }}>
                  {["1年未満", "1〜2年", "3〜5年", "6年以上"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>ロール</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 13, color: "#0D2B5E" }}>
                  {["CA", "シニアCA", "マネージャー"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleAdd} disabled={!form.name.trim() || saving}
              style={{ width: "100%", padding: "11px 0", borderRadius: 8, fontSize: 14, fontWeight: 700, background: form.name.trim() ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0", color: form.name.trim() ? "#fff" : "#9CAAB8", border: "none", cursor: form.name.trim() ? "pointer" : "not-allowed" }}>
              {saving ? "追加中..." : "追加する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

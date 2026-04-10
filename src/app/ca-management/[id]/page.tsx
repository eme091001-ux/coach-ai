"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchStaffById, fetchCandidates, addCandidate, updateCandidate, deleteCandidate,
  fetchFeedbackSessionsFiltered, fetchDocuments, fetchEntryRequests, addEntryRequest,
  fetchDailyReports, addDailyReport, fetchMonthlyForecast, upsertMonthlyForecast,
  Candidate, CandidateDocument, EntryRequest, DailyReport, MonthlyForecast,
} from "@/lib/db";
import { Staff, FeedbackSession } from "@/types";
import {
  ChevronLeft, Plus, Trash2, Edit2, X, Save, FileText, Briefcase,
  Target, FolderOpen, ClipboardList, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PHASE_OPTIONS = [
  { value: "A", label: "A 内定承諾" },
  { value: "B", label: "B 内定" },
  { value: "C", label: "C 企業面接待ち" },
  { value: "D", label: "D 企業面接日設定中" },
  { value: "E", label: "E 次回面談次第" },
  { value: "F", label: "F 長期保有" },
  { value: "G", label: "G 離脱" },
];

const READING_STYLE: Record<string, { bg: string; text: string }> = {
  A: { bg: "#FEE2E2", text: "#991B1B" },
  B: { bg: "#FEF9C3", text: "#854D0E" },
  C: { bg: "#FEF9C3", text: "#854D0E" },
  D: { bg: "#F1F0E8", text: "#5F5E5A" },
  E: { bg: "#F1F0E8", text: "#5F5E5A" },
  F: { bg: "#F1F0E8", text: "#5F5E5A" },
  G: { bg: "#F1F0E8", text: "#5F5E5A" },
};

const ENTRY_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "依頼中",          bg: "#FEF9C3", text: "#854D0E" },
  entered:   { label: "エントリー済",     bg: "#DBEAFE", text: "#1D4ED8" },
  adjusting: { label: "日程調整中",       bg: "#FED7AA", text: "#92400E" },
  confirmed: { label: "確定面接待ち",     bg: "#D1FAE5", text: "#065F46" },
  stopped:   { label: "進んでいない",     bg: "#FEE2E2", text: "#991B1B" },
};

// ── Sales calculation ─────────────────────────────────────────────────────────
function calcSales(candidates: Candidate[]) {
  let minS = 0, maxS = 0;
  for (const c of candidates) {
    const min = c.minOffer ?? 0;
    const max = c.maxOffer ?? 0;
    if (c.reading === "A") { minS += max; maxS += max; }
    else if (c.reading === "B") { minS += max * 0.9; maxS += max * 0.9; }
    else if (c.reading === "C") { minS += min * 0.7; maxS += max * 0.7; }
  }
  return { minS: Math.round(minS), maxS: Math.round(maxS) };
}

// ── Candidate Modal ───────────────────────────────────────────────────────────
interface CandidateForm {
  name: string; reading: string; phase: string;
  currentCompany: string; desiredJob: string;
  minOffer: string; maxOffer: string;
  nextAction: string; memo: string;
}
const defaultForm = (): CandidateForm => ({
  name: "", reading: "F", phase: "F 長期保有",
  currentCompany: "", desiredJob: "",
  minOffer: "", maxOffer: "",
  nextAction: "", memo: "",
});

function CandidateModal({
  caId, caName, editing, onClose, onSaved,
}: {
  caId: string; caName: string;
  editing: Candidate | null;
  onClose: () => void;
  onSaved: (c: Candidate) => void;
}) {
  const [form, setForm] = useState<CandidateForm>(() => {
    if (editing) return {
      name: editing.name, reading: editing.reading, phase: editing.phase,
      currentCompany: editing.currentCompany ?? "", desiredJob: editing.desiredJob ?? "",
      minOffer: editing.minOffer?.toString() ?? "", maxOffer: editing.maxOffer?.toString() ?? "",
      nextAction: editing.nextAction ?? "", memo: editing.memo ?? "",
    };
    return defaultForm();
  });
  const [saving, setSaving] = useState(false);

  const needsOffer = ["A", "B", "C"].includes(form.reading);

  const handlePhaseChange = (val: string) => {
    const opt = PHASE_OPTIONS.find((p) => p.value === val);
    setForm((f) => ({ ...f, reading: val, phase: opt?.label ?? val }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        caId, caName,
        name: form.name,
        reading: form.reading as Candidate["reading"],
        phase: form.phase,
        currentCompany: form.currentCompany || undefined,
        desiredJob: form.desiredJob || undefined,
        minOffer: needsOffer && form.minOffer ? parseInt(form.minOffer) : undefined,
        maxOffer: needsOffer && form.maxOffer ? parseInt(form.maxOffer) : undefined,
        nextAction: form.nextAction || undefined,
        memo: form.memo || undefined,
      };
      if (editing) {
        await updateCandidate(editing.id, payload);
        onSaved({ ...editing, ...payload });
      } else {
        const created = await addCandidate(payload);
        if (created) onSaved(created);
        else onSaved({ id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
    } finally { setSaving(false); onClose(); }
  };

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 13, color: "#0D2B5E", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 480, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#0D2B5E" }}>{editing ? "求職者を編集" : "求職者を追加"}</p>
          <button onClick={onClose} style={{ color: "#9CAAB8" }}><X size={18} /></button>
        </div>

        <F label="氏名 *">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="山田 太郎" style={inputStyle} />
        </F>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <F label="読み（フェーズ） *">
            <select value={form.reading} onChange={(e) => handlePhaseChange(e.target.value)} style={inputStyle}>
              {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </F>
          <F label="ネクストアクション">
            <select value={form.nextAction} onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))} style={inputStyle}>
              <option value="">選択...</option>
              {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.label}>{p.label}</option>)}
            </select>
          </F>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <F label="現職">
            <input value={form.currentCompany} onChange={(e) => setForm((f) => ({ ...f, currentCompany: e.target.value }))} placeholder="株式会社○○" style={inputStyle} />
          </F>
          <F label="希望職種">
            <input value={form.desiredJob} onChange={(e) => setForm((f) => ({ ...f, desiredJob: e.target.value }))} placeholder="営業 / エンジニア" style={inputStyle} />
          </F>
        </div>
        {needsOffer && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <F label="ミニマム金額（万円）">
              <input type="number" value={form.minOffer} onChange={(e) => setForm((f) => ({ ...f, minOffer: e.target.value }))} placeholder="500" style={inputStyle} />
            </F>
            <F label="マックス金額（万円）">
              <input type="number" value={form.maxOffer} onChange={(e) => setForm((f) => ({ ...f, maxOffer: e.target.value }))} placeholder="700" style={inputStyle} />
            </F>
          </div>
        )}
        <F label="メモ">
          <textarea value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} rows={3} placeholder="自由記述..." style={{ ...inputStyle, resize: "vertical" }} />
        </F>
        <button onClick={handleSave} disabled={!form.name.trim() || saving}
          style={{ width: "100%", padding: "11px 0", borderRadius: 8, fontSize: 14, fontWeight: 700, background: form.name.trim() ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0", color: form.name.trim() ? "#fff" : "#9CAAB8", border: "none", cursor: form.name.trim() ? "pointer" : "not-allowed" }}>
          {saving ? "保存中..." : <><Save size={14} style={{ display: "inline", marginRight: 6 }} />保存する</>}
        </button>
      </div>
    </div>
  );
}

// ── Tab 1: Candidates ─────────────────────────────────────────────────────────
function CandidatesTab({ caId, caName }: { caId: string; caName: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates(caId).then((cs) => { setCandidates(cs); setLoading(false); });
  }, [caId]);

  const handleSaved = (c: Candidate) => {
    setCandidates((prev) => {
      const idx = prev.findIndex((x) => x.id === c.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next.sort((a, b) => a.reading.localeCompare(b.reading)); }
      return [...prev, c].sort((a, b) => a.reading.localeCompare(b.reading));
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この求職者を削除しますか？")) return;
    setDeletingId(id);
    await deleteCandidate(id);
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
  };

  const handleNextActionChange = async (id: string, val: string) => {
    setCandidates((prev) => prev.map((c) => c.id === id ? { ...c, nextAction: val } : c));
    await updateCandidate(id, { nextAction: val });
  };

  const { minS, maxS } = calcSales(candidates);

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "保有求職者数", value: `${candidates.length}人`, icon: "👤" },
          { label: "当月ミニマム売上", value: `${minS.toLocaleString()}万円`, icon: "📉" },
          { label: "当月マックス売上", value: `${maxS.toLocaleString()}万円`, icon: "📈" },
        ].map(({ label, value, icon }) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "16px 18px" }}>
            <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 6 }}>{icon} {label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#0D2B5E" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Add button */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => { setEditing(null); setShowModal(true); }}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
          <Plus size={14} /> 求職者を追加
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>
      ) : candidates.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8", fontWeight: 600 }}>求職者が登録されていません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {candidates.map((c) => {
            const rs = READING_STYLE[c.reading] ?? READING_STYLE.G;
            const needsOffer = ["A", "B", "C"].includes(c.reading);
            return (
              <div key={c.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, transition: "box-shadow 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(59,143,212,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}>
                {/* Left */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 3 }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: "#9CAAB8" }}>
                    {c.currentCompany && `現職: ${c.currentCompany}`}
                    {c.currentCompany && c.desiredJob && " · "}
                    {c.desiredJob && `希望: ${c.desiredJob}`}
                  </p>
                </div>
                {/* Center badges */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 12, background: rs.bg, color: rs.text }}>{c.reading}読み</span>
                  <span style={{ fontSize: 10, color: "#4A6FA5", background: "#EBF5FF", borderRadius: 10, padding: "1px 8px" }}>{c.phase}</span>
                  {needsOffer && (c.minOffer || c.maxOffer) && (
                    <span style={{ fontSize: 10, color: "#166534", background: "#D1FAE5", borderRadius: 10, padding: "1px 8px" }}>
                      ¥{c.minOffer ?? "—"}〜{c.maxOffer ?? "—"}万
                    </span>
                  )}
                </div>
                {/* Right */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <select value={c.nextAction ?? ""} onChange={(e) => handleNextActionChange(c.id, e.target.value)}
                    style={{ fontSize: 11, border: "1px solid #C8DFF5", borderRadius: 6, padding: "4px 8px", color: "#0D2B5E", background: "#fff", cursor: "pointer" }}>
                    <option value="">NA未設定</option>
                    {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.label}>{p.label}</option>)}
                  </select>
                  <button onClick={() => { setEditing(c); setShowModal(true); }}
                    style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", color: "#4A6FA5" }}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                    style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FFF0F0", cursor: "pointer", color: "#991B1B" }}>
                    {deletingId === c.id ? "..." : <Trash2 size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CandidateModal caId={caId} caName={caName} editing={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved} />
      )}
    </div>
  );
}

// ── Tab 2: Feedback History ───────────────────────────────────────────────────
const PHASE_FILTERS = ["すべて", "1次面談", "2次面談", "求人提案", "内定後フォロー"];
const PHASE_BADGE: Record<string, { bg: string; text: string }> = {
  "1次面談": { bg: "#E8F2FC", text: "#1A5BA6" },
  "2次面談": { bg: "#DCFCE7", text: "#166534" },
  "求人提案": { bg: "#FEF9C3", text: "#854D0E" },
  "内定後フォロー": { bg: "#FEE2E2", text: "#991B1B" },
};

function FeedbackHistoryTab({ caId }: { caId: string }) {
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState("すべて");

  useEffect(() => {
    fetchFeedbackSessionsFiltered(caId).then((ss) => { setSessions(ss); setLoading(false); });
  }, [caId]);

  const filtered = phaseFilter === "すべて" ? sessions : sessions.filter((s) => s.interviewPhase === phaseFilter);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {PHASE_FILTERS.map((p) => (
          <button key={p} onClick={() => setPhaseFilter(p)}
            style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: phaseFilter === p ? 700 : 400, border: phaseFilter === p ? "2px solid #1A5BA6" : "1px solid #C8DFF5", background: phaseFilter === p ? "#EBF5FF" : "#fff", color: phaseFilter === p ? "#0D2B5E" : "#4A6FA5", cursor: "pointer" }}>
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>面談履歴がありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((s) => {
            const pb = s.interviewPhase ? PHASE_BADGE[s.interviewPhase] : null;
            return (
              <Link key={s.id} href={`/feedback/${s.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3B8FD4"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(59,143,212,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#C8DFF5"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 3 }}>{s.candidateName}</p>
                    <p style={{ fontSize: 11, color: "#9CAAB8" }}>{s.meetingDate} · {s.meetingType}</p>
                  </div>
                  {pb && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: pb.bg, color: pb.text }}>{s.interviewPhase}</span>}
                  <span style={{ fontSize: 18, fontWeight: 800, color: s.totalScore >= 80 ? "#166534" : s.totalScore >= 60 ? "#1A5BA6" : "#991B1B" }}>{s.totalScore}</span>
                  <span style={{ fontSize: 10, color: "#9CAAB8" }}>点</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Documents ──────────────────────────────────────────────────────────
function DocumentsTab({ caId }: { caId: string }) {
  const [docs, setDocs] = useState<CandidateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchDocuments(caId).then((d) => { setDocs(d); setLoading(false); });
  }, [caId]);

  return (
    <div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <FolderOpen size={36} style={{ color: "#C8DFF5", marginBottom: 12, display: "inline-block" }} />
          <p style={{ fontSize: 14, color: "#9CAAB8", fontWeight: 600 }}>書類が保存されていません</p>
          <button onClick={() => router.push("/documents")}
            style={{ marginTop: 14, padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
            書類作成へ
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 14 }}>
          {docs.map((doc) => (
            <div key={doc.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                {doc.documentType === "resume" ? <FileText size={18} color="#3B8FD4" /> : <Briefcase size={18} color="#3B8FD4" />}
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E" }}>{doc.candidateName}</p>
                  <p style={{ fontSize: 10, color: "#9CAAB8" }}>{doc.documentType === "resume" ? "履歴書" : "職務経歴書"} · {new Date(doc.createdAt).toLocaleDateString("ja-JP")}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => router.push(`/documents?tab=${doc.documentType}&candidate=${doc.id}`)}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #C8DFF5", background: "#fff", color: "#0D2B5E", cursor: "pointer" }}>
                  ✏️ 編集
                </button>
                <button onClick={() => { router.push(`/documents?tab=${doc.documentType}&candidate=${doc.id}`); setTimeout(() => window.print(), 800); }}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #C8DFF5", background: "#fff", color: "#0D2B5E", cursor: "pointer" }}>
                  🖨️ PDF出力
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Entry Request Modal ────────────────────────────────────────────────────────
function EntryModal({
  caId, caName, candidates, onClose, onSaved,
}: {
  caId: string; caName: string; candidates: Candidate[];
  onClose: () => void; onSaved: (e: EntryRequest) => void;
}) {
  const [form, setForm] = useState({
    candidateName: "", companyName: "", companyId: "",
    mediaInput: "", media: [] as string[],
    recommendation: "", interviewDates: ["", "", ""],
  });
  const [saving, setSaving] = useState(false);

  const addMedia = () => {
    if (form.mediaInput.trim()) {
      setForm((f) => ({ ...f, media: [...f.media, f.mediaInput.trim()], mediaInput: "" }));
    }
  };

  const handleSave = async () => {
    if (!form.candidateName.trim() || !form.companyName.trim()) return;
    setSaving(true);
    try {
      const dates = form.interviewDates.filter(Boolean);
      const id = await addEntryRequest({
        caId, caName,
        candidateName: form.candidateName,
        companyName: form.companyName,
        companyId: form.companyId || undefined,
        media: form.media,
        recommendation: form.recommendation || undefined,
        interviewDates: dates,
        status: "pending",
      });
      onSaved({
        id: id ?? crypto.randomUUID(),
        caId, caName,
        candidateName: form.candidateName,
        companyName: form.companyName,
        companyId: form.companyId || undefined,
        media: form.media,
        recommendation: form.recommendation || undefined,
        interviewDates: dates,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } finally { setSaving(false); onClose(); }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 13, color: "#0D2B5E", outline: "none", boxSizing: "border-box" };
  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 520, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#0D2B5E" }}>エントリー依頼を出す</p>
          <button onClick={onClose} style={{ color: "#9CAAB8" }}><X size={18} /></button>
        </div>

        <F label="求職者名 *">
          {candidates.length > 0 ? (
            <select value={form.candidateName} onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))} style={inputStyle}>
              <option value="">選択またはテキスト入力...</option>
              {candidates.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          ) : (
            <input value={form.candidateName} onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))} placeholder="山田 太郎" style={inputStyle} />
          )}
        </F>
        {candidates.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>または氏名を直接入力</label>
            <input value={form.candidateName} onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))} placeholder="山田 太郎" style={inputStyle} />
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <F label="エントリー企業名 *">
            <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="株式会社○○" style={inputStyle} />
          </F>
          <F label="企業ID">
            <input value={form.companyId} onChange={(e) => setForm((f) => ({ ...f, companyId: e.target.value }))} placeholder="C-001" style={inputStyle} />
          </F>
        </div>
        <F label="エントリー媒体（複数可）">
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            {form.media.map((m, i) => (
              <span key={i} style={{ fontSize: 11, background: "#EBF5FF", color: "#1A5BA6", borderRadius: 12, padding: "2px 10px", display: "flex", alignItems: "center", gap: 4 }}>
                {m}
                <button onClick={() => setForm((f) => ({ ...f, media: f.media.filter((_, j) => j !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CAAB8", padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={form.mediaInput} onChange={(e) => setForm((f) => ({ ...f, mediaInput: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addMedia()} placeholder="Indeed / LinkedIn..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addMedia} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#EBF5FF", color: "#1A5BA6", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>追加</button>
          </div>
        </F>
        <F label="推薦文">
          <textarea value={form.recommendation} onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value }))} rows={4} placeholder="推薦文を入力..." style={{ ...inputStyle, resize: "vertical" }} />
        </F>
        <F label="面接候補日（3つまで）">
          {form.interviewDates.map((d, i) => (
            <input key={i} type="datetime-local" value={d} onChange={(e) => {
              const dates = [...form.interviewDates]; dates[i] = e.target.value;
              setForm((f) => ({ ...f, interviewDates: dates }));
            }} style={{ ...inputStyle, marginBottom: 6 }} />
          ))}
        </F>
        <button onClick={handleSave} disabled={!form.candidateName.trim() || !form.companyName.trim() || saving}
          style={{ width: "100%", padding: "11px 0", borderRadius: 8, fontSize: 14, fontWeight: 700, background: (form.candidateName && form.companyName) ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0", color: (form.candidateName && form.companyName) ? "#fff" : "#9CAAB8", border: "none", cursor: "pointer" }}>
          {saving ? "送信中..." : "依頼を送信する"}
        </button>
      </div>
    </div>
  );
}

// ── Tab 4: Entry Requests ─────────────────────────────────────────────────────
function EntryRequestsTab({ caId, caName, candidates }: { caId: string; caName: string; candidates: Candidate[] }) {
  const [entries, setEntries] = useState<EntryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchEntryRequests(caId).then((es) => { setEntries(es); setLoading(false); });
  }, [caId]);

  const handleSaved = (e: EntryRequest) => setEntries((prev) => [e, ...prev]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
          <Plus size={14} /> エントリー依頼を出す
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <ClipboardList size={36} style={{ color: "#C8DFF5", marginBottom: 12, display: "inline-block" }} />
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>エントリー依頼がありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e) => {
            const st = ENTRY_STATUS[e.status] ?? ENTRY_STATUS.pending;
            return (
              <div key={e.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 3 }}>{e.candidateName} → {e.companyName}</p>
                  <p style={{ fontSize: 11, color: "#9CAAB8" }}>
                    {new Date(e.createdAt).toLocaleDateString("ja-JP")}
                    {e.media?.length ? ` · ${e.media.join(", ")}` : ""}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 12, background: st.bg, color: st.text, flexShrink: 0 }}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <EntryModal caId={caId} caName={caName} candidates={candidates}
          onClose={() => setShowModal(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}

// ── Tab 5: Daily Reports & Forecast ──────────────────────────────────────────
function DailyReportsTab({ caId, caName, candidates }: { caId: string; caName: string; candidates: Candidate[] }) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const todayStr = now.toISOString().slice(0, 10);

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [forecast, setForecast] = useState<MonthlyForecast | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [viewMonth, setViewMonth] = useState(`${curYear}-${String(curMonth).padStart(2, "0")}`);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Daily report form
  const [drForm, setDrForm] = useState({
    reportDate: todayStr,
    newInterviews: "",
    offersMade: "",
    entriesMade: "",
    revenueConfirmed: "",
    memo: "",
  });
  const [drSaving, setDrSaving] = useState(false);
  const [drSuccess, setDrSuccess] = useState(false);

  // Monthly forecast form
  const [fcForm, setFcForm] = useState({ forecastMin: "", forecastMax: "", actualRevenue: "", memo: "" });
  const [fcSaving, setFcSaving] = useState(false);
  const [fcSuccess, setFcSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchDailyReports(caId),
      fetchMonthlyForecast(caId, curYear, curMonth),
    ]).then(([rpts, fc]) => {
      setReports(rpts);
      if (fc) {
        setForecast(fc);
        setFcForm({
          forecastMin: fc.forecastMin?.toString() ?? "",
          forecastMax: fc.forecastMax?.toString() ?? "",
          actualRevenue: fc.actualRevenue?.toString() ?? "",
          memo: fc.memo ?? "",
        });
      }
      setLoadingReports(false);
    });
  }, [caId, curYear, curMonth]);

  // Monthly summary from candidates
  const { minS, maxS } = calcSales(candidates);
  const confirmedSales = candidates
    .filter((c) => c.reading === "A")
    .reduce((sum, c) => sum + (c.maxOffer ?? 0), 0);

  const handleDrSubmit = async () => {
    setDrSaving(true);
    const id = await addDailyReport({
      caId, caName,
      reportDate: drForm.reportDate,
      newInterviews: parseInt(drForm.newInterviews) || 0,
      offersMade: parseInt(drForm.offersMade) || 0,
      entriesMade: parseInt(drForm.entriesMade) || 0,
      revenueConfirmed: parseInt(drForm.revenueConfirmed) || 0,
      memo: drForm.memo || undefined,
    });
    if (id) {
      const newRpt: DailyReport = {
        id,
        caId, caName,
        reportDate: drForm.reportDate,
        newInterviews: parseInt(drForm.newInterviews) || 0,
        offersMade: parseInt(drForm.offersMade) || 0,
        entriesMade: parseInt(drForm.entriesMade) || 0,
        revenueConfirmed: parseInt(drForm.revenueConfirmed) || 0,
        memo: drForm.memo || undefined,
        createdAt: new Date().toISOString(),
      };
      setReports((prev) => [newRpt, ...prev]);
    }
    setDrForm({ reportDate: todayStr, newInterviews: "", offersMade: "", entriesMade: "", revenueConfirmed: "", memo: "" });
    setDrSaving(false);
    setDrSuccess(true);
    setTimeout(() => setDrSuccess(false), 3000);
  };

  const handleFcSave = async () => {
    setFcSaving(true);
    await upsertMonthlyForecast({
      caId, caName,
      year: curYear, month: curMonth,
      forecastMin: parseInt(fcForm.forecastMin) || 0,
      forecastMax: parseInt(fcForm.forecastMax) || 0,
      actualRevenue: parseInt(fcForm.actualRevenue) || 0,
      memo: fcForm.memo || undefined,
    });
    setFcSaving(false);
    setFcSuccess(true);
    setTimeout(() => setFcSuccess(false), 3000);
  };

  const filteredReports = reports.filter((r) => r.reportDate.startsWith(viewMonth));

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5",
    borderRadius: 6, fontSize: 13, color: "#0D2B5E", outline: "none", boxSizing: "border-box",
  };

  if (loadingReports) return <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Monthly summary cards ── */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#4A6FA5", marginBottom: 10 }}>
          当月サマリー（{curYear}年{curMonth}月）
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "当月ミニマム見込み", value: `${minS.toLocaleString()}万円`, color: "#1A5BA6" },
            { label: "当月マックス見込み", value: `${maxS.toLocaleString()}万円`, color: "#166534" },
            { label: "確定売上（A読み）",  value: `${confirmedSales.toLocaleString()}万円`, color: "#991B1B" },
            { label: "保有求職者数",        value: `${candidates.length}名`, color: "#0D2B5E" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Monthly forecast form ── */}
      <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E", marginBottom: 16 }}>
          📊 {curYear}年{curMonth}月の見込み入力
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 12 }}>
          {[
            { label: "見込みミニマム（万円）", key: "forecastMin" },
            { label: "見込みマックス（万円）", key: "forecastMax" },
            { label: "確定売上（万円）",        key: "actualRevenue" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>{label}</label>
              <input
                type="number"
                value={fcForm[key as keyof typeof fcForm]}
                onChange={(e) => setFcForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>メモ</label>
          <textarea
            value={fcForm.memo}
            onChange={(e) => setFcForm((f) => ({ ...f, memo: e.target.value }))}
            rows={2}
            placeholder="メモを入力..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleFcSave}
            disabled={fcSaving}
            style={{ padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            {fcSaving ? "保存中..." : "保存する"}
          </button>
          {fcSuccess && <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>✓ 保存しました</span>}
        </div>
      </div>

      {/* ── Daily report form ── */}
      <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E", marginBottom: 16 }}>📝 日報を入力</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          {[
            { label: "日付", key: "reportDate", type: "date" },
            { label: "新規面談件数", key: "newInterviews", type: "number" },
            { label: "内定・オファー件数", key: "offersMade", type: "number" },
            { label: "エントリー件数", key: "entriesMade", type: "number" },
            { label: "売上確定（万円）", key: "revenueConfirmed", type: "number" },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>{label}</label>
              <input
                type={type}
                value={drForm[key as keyof typeof drForm]}
                onChange={(e) => setDrForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={type === "number" ? "0" : ""}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>今日のメモ・気づき</label>
          <textarea
            value={drForm.memo}
            onChange={(e) => setDrForm((f) => ({ ...f, memo: e.target.value }))}
            rows={3}
            placeholder="今日の気づきや所感を入力..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={handleDrSubmit}
            disabled={drSaving}
            style={{ padding: "9px 24px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            {drSaving ? "送信中..." : "日報を提出"}
          </button>
          {drSuccess && <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>✓ 提出しました</span>}
        </div>
      </div>

      {/* ── Past reports ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E" }}>過去の日報</p>
          <input
            type="month"
            value={viewMonth}
            onChange={(e) => setViewMonth(e.target.value)}
            style={{ padding: "5px 8px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 12, color: "#0D2B5E" }}
          />
          <span style={{ fontSize: 11, color: "#9CAAB8" }}>{filteredReports.length}件</span>
        </div>

        {filteredReports.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
            <p style={{ fontSize: 13, color: "#9CAAB8" }}>この月の日報がありません</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredReports.map((r) => {
              const isOpen = expandedId === r.id;
              return (
                <div key={r.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, overflow: "hidden" }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", cursor: "pointer" }}
                    onClick={() => setExpandedId(isOpen ? null : r.id)}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#4A6FA5", flexShrink: 0 }}>{r.reportDate}</span>
                    <div style={{ display: "flex", gap: 16, flex: 1 }}>
                      {[
                        ["新規面談", r.newInterviews],
                        ["オファー", r.offersMade],
                        ["エントリー", r.entriesMade],
                        ["確定売上", `${r.revenueConfirmed}万円`],
                      ].map(([label, val]) => (
                        <span key={label as string} style={{ fontSize: 12, color: "#0D2B5E" }}>
                          <span style={{ color: "#9CAAB8" }}>{label}:</span> <b>{val}</b>
                        </span>
                      ))}
                    </div>
                    {r.memo
                      ? isOpen ? <ChevronUp size={14} color="#9CAAB8" /> : <ChevronDown size={14} color="#9CAAB8" />
                      : <span style={{ width: 14 }} />
                    }
                  </div>
                  {isOpen && r.memo && (
                    <div style={{ padding: "0 16px 12px", borderTop: "1px solid #EBF2FC" }}>
                      <p style={{ fontSize: 12, color: "#4A6FA5", marginTop: 8, whiteSpace: "pre-wrap" }}>{r.memo}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type TabKey = "candidates" | "feedback" | "documents" | "entries" | "reports";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "candidates", label: "👤 保有求職者リスト", icon: null },
  { key: "feedback",   label: "🗂 面談履歴",        icon: null },
  { key: "documents",  label: "📄 書類管理",         icon: null },
  { key: "entries",    label: "📋 エントリー依頼",   icon: null },
  { key: "reports",    label: "📊 日報・見込み",     icon: null },
];

export default function CADetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [ca, setCA] = useState<Staff | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("candidates");
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  useEffect(() => {
    fetchStaffById(id).then(setCA);
    fetchCandidates(id).then(setCandidates);
  }, [id]);

  const avatarColor = { bg: "#DBEAFE", text: "#1E40AF" };

  return (
    <div style={{ minHeight: "100vh", background: "#F3F7FC", padding: "28px 28px 60px" }}>
      {/* Back + Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/ca-management" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#4A6FA5", textDecoration: "none", marginBottom: 14 }}>
          <ChevronLeft size={14} /> CA一覧に戻る
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: avatarColor.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: avatarColor.text, flexShrink: 0 }}>
            {ca ? ca.name.replace(/\s+/g, "").slice(0, 2) : "…"}
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D2B5E" }}>{ca?.name ?? "読み込み中..."}</h1>
            <p style={{ fontSize: 12, color: "#9CAAB8", marginTop: 2 }}>{ca?.experience} · {ca?.role}{ca?.email ? ` · ${ca.email}` : ""}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: "#E8F2FC", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            style={{ padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: activeTab === t.key ? 700 : 500, background: activeTab === t.key ? "#fff" : "transparent", color: activeTab === t.key ? "#0D2B5E" : "#4A6FA5", border: "none", cursor: "pointer", boxShadow: activeTab === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s", whiteSpace: "nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "candidates" && <CandidatesTab caId={id} caName={ca?.name ?? ""} />}
      {activeTab === "feedback"   && <FeedbackHistoryTab caId={id} />}
      {activeTab === "documents"  && <DocumentsTab caId={id} />}
      {activeTab === "entries"    && <EntryRequestsTab caId={id} caName={ca?.name ?? ""} candidates={candidates} />}
      {activeTab === "reports"    && <DailyReportsTab caId={id} caName={ca?.name ?? ""} candidates={candidates} />}
    </div>
  );
}

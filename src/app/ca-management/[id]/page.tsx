"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchStaffById, fetchCandidates, addCandidate, updateCandidate, deleteCandidate,
  fetchFeedbackSessionsFiltered, fetchDocuments, fetchEntryRequests, addEntryRequest,
  updateEntryStatus,
  fetchDailyReports, addDailyReport, fetchMonthlyForecast, upsertMonthlyForecast,
  Candidate, CandidateDocument, EntryRequest, DailyReport,
} from "@/lib/db";
import { Staff, FeedbackSession } from "@/types";
import {
  ChevronLeft, Plus, Trash2, Edit2, User, X, Save, FileText, Briefcase,
  FolderOpen, ClipboardList, ChevronDown, ChevronUp,
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
  pending:   { label: "依頼中",        bg: "#FEF9C3", text: "#854D0E" },
  entered:   { label: "エントリー済",  bg: "#E8F2FC", text: "#1A5BA6" },
  adjusting: { label: "日程調整中",    bg: "#FAEEDA", text: "#854F0B" },
  confirmed: { label: "確定面接待ち",  bg: "#DCFCE7", text: "#166534" },
  done:      { label: "面接完了",      bg: "#F1F0E8", text: "#5F5E5A" },
  stopped:   { label: "進んでいない",  bg: "#FEE2E2", text: "#991B1B" },
};

// ── Modal option constants ────────────────────────────────────────────────────
const AGE_OPTIONS = Array.from({ length: 48 }, (_, i) => i + 18);

const PREFECTURE_OPTIONS = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

const EDUCATION_OPTIONS = ["中学卒","高校卒","専門学校卒","短大卒","大学卒","大学院卒"];

const INCOME_OPTIONS: { label: string; value: string }[] = [
  { label: "100万円未満", value: "0" },
  ...Array.from({ length: 38 }, (_, i) => ({ label: `${100 + i * 50}万円`, value: String(100 + i * 50) })),
  { label: "2000万円以上", value: "2000" },
];

const DESIRED_JOB_OPTIONS = [
  "営業","法人営業","個人営業","内勤営業","施工管理","販売","接客",
  "ITエンジニア","起電エンジニア","インフラエンジニア","マーケティング",
  "企画","人事・採用","経理・財務","コンサルタント","マネージャー","その他",
];

const CURRENT_INDUSTRY_OPTIONS = [
  "未就業","保育士・幼稚園教諭","介護・福祉","営業","販売・接客","施工管理・建築",
  "ITエンジニア","電気・機械エンジニア","事務・バックオフィス","マーケティング・企画",
  "人事・採用","経理・財務","コンサルタント","教育・講師","医療・看護","飲食・サービス",
  "物流・ドライバー","その他",
];

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

// ── Tab 1: Candidates ─────────────────────────────────────────────────────────
function CandidatesTab({ caId, candidates, loading, setCandidates, onAdd, onEdit }: {
  caId: string;
  candidates: Candidate[];
  loading: boolean;
  setCandidates: React.Dispatch<React.SetStateAction<Candidate[]>>;
  onAdd: () => void;
  onEdit: (c: Candidate) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
        <button onClick={onAdd}
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
            const showOffer = ["A", "B", "C"].includes(c.reading);
            const isHovered = hoveredId === c.id;
            const fmtIncome = (v?: number) => v ? `${v}万` : "—";
            return (
              <div key={c.id}
                style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: "14px 16px", transition: "box-shadow 0.2s", boxShadow: isHovered ? "0 2px 12px rgba(59,143,212,0.12)" : "none", position: "relative" }}
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {/* Left info */}
                  <Link href={`/ca-management/${caId}/candidates/${c.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}>{c.name}</p>
                      <span style={{ fontSize: 12, fontWeight: 800, padding: "1px 8px", borderRadius: 10, background: rs.bg, color: rs.text }}>{c.reading}</span>
                      <span style={{ fontSize: 10, color: "#4A6FA5", background: "#EBF5FF", borderRadius: 8, padding: "1px 7px" }}>{c.phase}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
                      {(c.desiredJobs ?? []).slice(0, 2).map((j) => (
                        <span key={j} style={{ fontSize: 10, background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "1px 6px", color: "#4A6FA5" }}>{j}</span>
                      ))}
                      {(c.desiredJobs?.length ?? 0) > 2 && (
                        <span style={{ fontSize: 10, color: "#9CAAB8" }}>+{c.desiredJobs!.length - 2}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#9CAAB8" }}>
                      {(c.currentIncome || c.desiredIncome) && (
                        <span>{fmtIncome(c.currentIncome)} <span style={{ color: "#C8DFF5" }}>→</span> <span style={{ color: "#0D2B5E", fontWeight: 600 }}>{fmtIncome(c.desiredIncome)}</span></span>
                      )}
                      {showOffer && (c.minOffer || c.maxOffer) && (
                        <span style={{ background: "#DCFCE7", color: "#166534", borderRadius: 6, padding: "1px 7px", fontSize: 10, fontWeight: 600 }}>
                          ¥{c.minOffer ?? "—"}〜{c.maxOffer ?? "—"}万
                        </span>
                      )}
                    </div>
                  </Link>
                  {/* Right: NA + action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    {/* 3 icon buttons */}
                    <div style={{ display: "flex", gap: 4 }}>
                      <Link href={`/ca-management/${caId}/candidates/${c.id}`}
                        title="詳細"
                        style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", display: "flex", alignItems: "center", color: "#4A6FA5", textDecoration: "none" }}>
                        <User size={12} />
                      </Link>
                      <button onClick={() => onEdit(c)} title="編集"
                        style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", color: "#4A6FA5" }}>
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} title="削除"
                        style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FFF0F0", cursor: "pointer", color: "#991B1B" }}>
                        {deletingId === c.id ? "..." : <Trash2 size={12} />}
                      </button>
                    </div>
                    {/* NA dropdown */}
                    <select value={c.nextAction ?? ""} onChange={(e) => handleNextActionChange(c.id, e.target.value)}
                      style={{ fontSize: 11, border: "1px solid #C8DFF5", borderRadius: 6, padding: "3px 8px", color: "#0D2B5E", background: "#fff", cursor: "pointer" }}>
                      <option value="">NA未設定</option>
                      {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.label}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

// ── Entry status dropdown (inline) ───────────────────────────────────────────
function EntryStatusDropdown({ entry, onUpdate }: {
  entry: EntryRequest;
  onUpdate: (id: string, status: EntryRequest["status"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const st = ENTRY_STATUS[entry.status] ?? ENTRY_STATUS.pending;
  const handleSelect = async (val: EntryRequest["status"]) => {
    setOpen(false);
    if (val === entry.status) return;
    setBusy(true);
    await updateEntryStatus(entry.id, val);
    onUpdate(entry.id, val);
    setBusy(false);
  };
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen((o) => !o)} disabled={busy}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: st.bg, color: st.text, border: "none", cursor: "pointer" }}>
        {st.label} <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 20, marginTop: 4, background: "#fff", border: "1px solid #C8DFF5", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 140, overflow: "hidden" }}>
          {Object.entries(ENTRY_STATUS).map(([val, { label }]) => (
            <button key={val} onClick={() => handleSelect(val as EntryRequest["status"])}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", fontSize: 12, color: "#0D2B5E", background: val === entry.status ? "#F0F7FF" : "transparent", border: "none", cursor: "pointer", fontWeight: val === entry.status ? 600 : 400 }}>
              {label}
            </button>
          ))}
        </div>
      )}
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
  const handleUpdate = (id: string, status: EntryRequest["status"]) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
  };

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
            const days = Math.floor((Date.now() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const stalled = e.status === "stopped" || ((e.status === "pending" || e.status === "entered") && days > 7);
            return (
              <div key={e.id} style={{ background: stalled ? "#FFFBF0" : "#fff", border: `1px solid ${stalled ? "#FCA5A5" : "#C8DFF5"}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 3 }}>
                    {e.candidateName}
                    <span style={{ margin: "0 6px", color: "#C8DFF5" }}>→</span>
                    {e.companyName}
                    {stalled && <span style={{ marginLeft: 8, fontSize: 10, color: "#991B1B", fontWeight: 600 }}>⚠ 停滞</span>}
                  </p>
                  <p style={{ fontSize: 11, color: "#9CAAB8" }}>
                    {new Date(e.createdAt).toLocaleDateString("ja-JP")} · {days}日経過
                    {e.media?.length ? ` · ${e.media.join(", ")}` : ""}
                  </p>
                </div>
                <EntryStatusDropdown entry={e} onUpdate={handleUpdate} />
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
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [saving, setSaving] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    name: '', phase: 'F 長期保有', nextAction: '', currentIndustry: '', desiredJob: '', memo: '',
    age: '', prefecture: '', gender: '', education: '', currentIncome: '', desiredIncome: '', desiredJobs: [] as string[],
  });
  const inpStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #C8DFF5', borderRadius: 6, fontSize: 13, color: '#0D2B5E', outline: 'none', boxSizing: 'border-box', background: '#fff' };

  useEffect(() => {
    fetchStaffById(id).then(setCA);
    fetchCandidates(id).then((cs) => { setCandidates(cs); setCandidatesLoading(false); });
  }, [id]);

  const openAdd = () => {
    setCandidateForm({ name: '', phase: 'F 長期保有', nextAction: '', currentIndustry: '', desiredJob: '', memo: '', age: '', prefecture: '', gender: '', education: '', currentIncome: '', desiredIncome: '', desiredJobs: [] });
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (c: Candidate) => {
    setCandidateForm({
      name: c.name,
      phase: c.phase,
      nextAction: c.nextAction ?? '',
      currentIndustry: c.currentCompany ?? '',
      desiredJob: c.desiredJob ?? '',
      memo: c.memo ?? '',
      age: c.age !== undefined ? String(c.age) : '',
      prefecture: c.prefecture ?? '',
      gender: c.gender ?? '',
      education: c.education ?? '',
      currentIncome: c.currentIncome !== undefined ? String(c.currentIncome) : '',
      desiredIncome: c.desiredIncome !== undefined ? String(c.desiredIncome) : '',
      desiredJobs: c.desiredJobs ?? [],
    });
    setEditing(c);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setCandidateForm({ name: '', phase: 'F 長期保有', nextAction: '', currentIndustry: '', desiredJob: '', memo: '', age: '', prefecture: '', gender: '', education: '', currentIncome: '', desiredIncome: '', desiredJobs: [] });
  };

  const handleModalSave = async () => {
    if (!candidateForm.name.trim()) return;
    setSaving(true);
    try {
      const reading = (candidateForm.phase.charAt(0) as Candidate['reading']) || 'F';
      const payload: Omit<Candidate, 'id' | 'createdAt' | 'updatedAt'> = {
        caId: id, caName: ca?.name ?? '',
        name: candidateForm.name,
        reading,
        phase: candidateForm.phase,
        nextAction: candidateForm.nextAction || undefined,
        currentCompany: candidateForm.currentIndustry || undefined,
        desiredJob: candidateForm.desiredJob || undefined,
        memo: candidateForm.memo || undefined,
        targetCompanies: editing?.targetCompanies ?? [],
        age: candidateForm.age ? Number(candidateForm.age) : undefined,
        prefecture: candidateForm.prefecture || undefined,
        gender: candidateForm.gender || undefined,
        education: candidateForm.education || undefined,
        currentIncome: candidateForm.currentIncome !== '' ? Number(candidateForm.currentIncome) : undefined,
        desiredIncome: candidateForm.desiredIncome !== '' ? Number(candidateForm.desiredIncome) : undefined,
        desiredJobs: candidateForm.desiredJobs.length > 0 ? candidateForm.desiredJobs : undefined,
      };
      if (editing) {
        await updateCandidate(editing.id, payload);
        setCandidates((prev) => {
          const next = prev.map((c) => c.id === editing.id ? { ...editing, ...payload } : c);
          return next.sort((a, b) => a.reading.localeCompare(b.reading));
        });
      } else {
        const created = await addCandidate(payload);
        const newC = created ?? { id: crypto.randomUUID(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setCandidates((prev) => [...prev, newC].sort((a, b) => a.reading.localeCompare(b.reading)));
      }
    } finally {
      setSaving(false);
      closeModal();
    }
  };

  const toggleJob = (job: string) => {
    setCandidateForm(prev => ({
      ...prev,
      desiredJobs: prev.desiredJobs.includes(job)
        ? prev.desiredJobs.filter(j => j !== job)
        : [...prev.desiredJobs, job]
    }));
  };

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
      {activeTab === "candidates" && <CandidatesTab caId={id} candidates={candidates} loading={candidatesLoading} setCandidates={setCandidates} onAdd={openAdd} onEdit={openEdit} />}
      {activeTab === "feedback"   && <FeedbackHistoryTab caId={id} />}
      {activeTab === "documents"  && <DocumentsTab caId={id} />}
      {activeTab === "entries"    && <EntryRequestsTab caId={id} caName={ca?.name ?? ""} candidates={candidates} />}
      {activeTab === "reports"    && <DailyReportsTab caId={id} caName={ca?.name ?? ""} candidates={candidates} />}

      {/* Candidate Modal — rendered at page level so candidateForm state changes never remount the inputs */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: 540, maxHeight: '90vh', overflowY: 'auto', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#0D2B5E' }}>{editing ? '求職者を編集' : '求職者を追加'}</p>
              <button onClick={closeModal} style={{ color: '#9CAAB8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* 氏名 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>氏名 *</label>
              <input
                type="text"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="山田 太郎"
                style={inpStyle}
              />
            </div>

            {/* 読み / ネクストアクション */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>読み</label>
                <select value={candidateForm.phase} onChange={(e) => setCandidateForm(prev => ({ ...prev, phase: e.target.value }))} style={inpStyle}>
                  {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.label}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>ネクストアクション</label>
                <select value={candidateForm.nextAction} onChange={(e) => setCandidateForm(prev => ({ ...prev, nextAction: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.label}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* 年齢 / 性別 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>年齢</label>
                <select value={candidateForm.age} onChange={(e) => setCandidateForm(prev => ({ ...prev, age: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  {AGE_OPTIONS.map((a) => <option key={a} value={String(a)}>{a}歳</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>性別</label>
                <select value={candidateForm.gender} onChange={(e) => setCandidateForm(prev => ({ ...prev, gender: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  <option value="男性">男性</option>
                  <option value="女性">女性</option>
                  <option value="その他">その他</option>
                </select>
              </div>
            </div>

            {/* 現住所 / 最終学歴 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>現住所</label>
                <select value={candidateForm.prefecture} onChange={(e) => setCandidateForm(prev => ({ ...prev, prefecture: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  {PREFECTURE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>最終学歴</label>
                <select value={candidateForm.education} onChange={(e) => setCandidateForm(prev => ({ ...prev, education: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  {EDUCATION_OPTIONS.map((ed) => <option key={ed} value={ed}>{ed}</option>)}
                </select>
              </div>
            </div>

            {/* 現職業種 / 現職種 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>現職業種</label>
                <select value={candidateForm.currentIndustry} onChange={(e) => setCandidateForm(prev => ({ ...prev, currentIndustry: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  {CURRENT_INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>現職種</label>
                <input
                  type="text"
                  value={candidateForm.desiredJob}
                  onChange={(e) => setCandidateForm(prev => ({ ...prev, desiredJob: e.target.value }))}
                  placeholder="法人営業"
                  style={inpStyle}
                />
              </div>
            </div>

            {/* 現年収 / 希望年収 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>現年収</label>
                <select value={candidateForm.currentIncome} onChange={(e) => setCandidateForm(prev => ({ ...prev, currentIncome: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  {INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>希望年収</label>
                <select value={candidateForm.desiredIncome} onChange={(e) => setCandidateForm(prev => ({ ...prev, desiredIncome: e.target.value }))} style={inpStyle}>
                  <option value="">選択...</option>
                  {INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* 希望職種（複数選択） */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 6 }}>希望職種</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DESIRED_JOB_OPTIONS.map((job) => {
                  const checked = candidateForm.desiredJobs.includes(job);
                  return (
                    <label key={job} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: checked ? '#0D2B5E' : '#4A6FA5', background: checked ? '#EBF5FF' : '#F7FAFF', border: `1px solid ${checked ? '#1A5BA6' : '#C8DFF5'}`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleJob(job)} style={{ margin: 0 }} />
                      {job}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* メモ */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4A6FA5', display: 'block', marginBottom: 4 }}>メモ</label>
              <textarea
                value={candidateForm.memo}
                onChange={(e) => setCandidateForm(prev => ({ ...prev, memo: e.target.value }))}
                rows={3}
                placeholder="自由記述..."
                style={{ ...inpStyle, resize: 'vertical' }}
              />
            </div>

            <button
              onClick={handleModalSave}
              disabled={!candidateForm.name.trim() || saving}
              style={{ width: '100%', padding: '11px 0', borderRadius: 8, fontSize: 14, fontWeight: 700, background: candidateForm.name.trim() ? 'linear-gradient(135deg,#0D2B5E,#1A5BA6)' : '#E0E8F0', color: candidateForm.name.trim() ? '#fff' : '#9CAAB8', border: 'none', cursor: candidateForm.name.trim() ? 'pointer' : 'not-allowed' }}
            >
              {saving ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useEffect, use, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchCandidateById, fetchCandidates, fetchStaffById, updateCandidate,
  fetchFeedbackSessionsByCandidateName, fetchFeedbackSessionsByCandidateId,
  fetchDocuments, fetchEntryRequestsByCandidateId, addEntryRequest, updateEntryStatus,
  Candidate, TargetCompany, CandidateDocument, EntryRequest,
} from "@/lib/db";
import { FeedbackSession, Staff } from "@/types";
import {
  ChevronLeft, Edit2, Save, X, Plus, Trash2, Sparkles, ExternalLink,
  FileText, Building2, ClipboardList, User, MessageSquare,
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
const AGES = Array.from({ length: 48 }, (_, i) => i + 18);
const GENDERS = ["男性", "女性", "その他"];
const PREFECTURES = ["北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県","茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県","新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県","静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県","奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県","徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県","熊本県","大分県","宮崎県","鹿児島県","沖縄県"];
const EDUCATIONS = ["中学卒","高校卒","専門学校卒","短大卒","大学卒","大学院卒"];
const INCOME_OPTIONS = [
  { label: "100万円未満", value: 50 },
  ...Array.from({ length: 38 }, (_, i) => ({ label: `${(i + 2) * 50}万円`, value: (i + 2) * 50 })),
  { label: "2000万円以上", value: 2050 },
];
const DESIRED_JOBS_OPTIONS = ["営業","法人営業","個人営業","内勤営業","施工管理","販売","接客","ITエンジニア","起電エンジニア","インフラエンジニア","マーケティング","企画","人事・採用","経理・財務","コンサルタント","マネージャー","その他"];

const READING_STYLE: Record<string, { bg: string; text: string }> = {
  A: { bg: "#FEE2E2", text: "#991B1B" },
  B: { bg: "#FEF9C3", text: "#854D0E" },
  C: { bg: "#FEF9C3", text: "#854D0E" },
  D: { bg: "#F1F0E8", text: "#5F5E5A" },
  E: { bg: "#F1F0E8", text: "#5F5E5A" },
  F: { bg: "#F1F0E8", text: "#5F5E5A" },
  G: { bg: "#F1F0E8", text: "#5F5E5A" },
};

const TARGET_STATUS_OPTIONS = [
  { value: "considering", label: "検討中", bg: "#EBF5FF", text: "#1A5BA6" },
  { value: "entered",     label: "エントリー済", bg: "#FEF9C3", text: "#854D0E" },
  { value: "interviewing",label: "面接中", bg: "#FAEEDA", text: "#854F0B" },
  { value: "offered",     label: "内定", bg: "#DCFCE7", text: "#166534" },
  { value: "declined",    label: "辞退", bg: "#FEE2E2", text: "#991B1B" },
  { value: "rejected",    label: "不合格", bg: "#F1F0E8", text: "#5F5E5A" },
];

const ENTRY_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "依頼中",        bg: "#FEF9C3", text: "#854D0E" },
  entered:   { label: "エントリー済",  bg: "#E8F2FC", text: "#1A5BA6" },
  adjusting: { label: "日程調整中",    bg: "#FAEEDA", text: "#854F0B" },
  confirmed: { label: "確定面接待ち",  bg: "#DCFCE7", text: "#166534" },
  done:      { label: "面接完了",      bg: "#F1F0E8", text: "#5F5E5A" },
  stopped:   { label: "進んでいない",  bg: "#FEE2E2", text: "#991B1B" },
};

// ── Shared style helpers ──────────────────────────────────────────────────────
const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
  width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5",
  borderRadius: 6, fontSize: 13, color: "#0D2B5E", outline: "none",
  boxSizing: "border-box", background: "#fff", ...extra,
});
const Lbl = ({ children }: { children: React.ReactNode }) => (
  <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>{children}</label>
);
const FRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 12 }}>
    <Lbl>{label}</Lbl>
    {children}
  </div>
);

// ── Tab 1: Basic Info ─────────────────────────────────────────────────────────
interface BasicInfoForm {
  name: string; age: string; gender: string; prefecture: string; education: string;
  currentIncome: string; desiredIncome: string; desiredJobs: string[];
  reading: string; phase: string; currentCompany: string;
  minOffer: string; maxOffer: string; nextAction: string; memo: string;
}

function BasicInfoTab({ candidate, caId, onUpdated }: { candidate: Candidate; caId: string; onUpdated: (c: Candidate) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BasicInfoForm>({
    name: candidate.name,
    age: candidate.age?.toString() ?? "",
    gender: candidate.gender ?? "",
    prefecture: candidate.prefecture ?? "",
    education: candidate.education ?? "",
    currentIncome: candidate.currentIncome?.toString() ?? "",
    desiredIncome: candidate.desiredIncome?.toString() ?? "",
    desiredJobs: candidate.desiredJobs ?? [],
    reading: candidate.reading,
    phase: candidate.phase,
    currentCompany: candidate.currentCompany ?? "",
    minOffer: candidate.minOffer?.toString() ?? "",
    maxOffer: candidate.maxOffer?.toString() ?? "",
    nextAction: candidate.nextAction ?? "",
    memo: candidate.memo ?? "",
  });

  const needsOffer = ["A", "B", "C"].includes(form.reading);
  const rs = READING_STYLE[candidate.reading] ?? READING_STYLE.G;

  const toggleJob = (job: string) =>
    setForm((f) => ({
      ...f,
      desiredJobs: f.desiredJobs.includes(job) ? f.desiredJobs.filter((j) => j !== job) : [...f.desiredJobs, job],
    }));

  const handlePhaseChange = (val: string) => {
    const opt = PHASE_OPTIONS.find((p) => p.value === val);
    setForm((f) => ({ ...f, reading: val, phase: opt?.label ?? val }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updates: Partial<Candidate> = {
        name: form.name,
        age: form.age ? parseInt(form.age) : undefined,
        gender: form.gender || undefined,
        prefecture: form.prefecture || undefined,
        education: form.education || undefined,
        currentIncome: form.currentIncome ? parseInt(form.currentIncome) : undefined,
        desiredIncome: form.desiredIncome ? parseInt(form.desiredIncome) : undefined,
        desiredJobs: form.desiredJobs.length > 0 ? form.desiredJobs : undefined,
        reading: form.reading as Candidate["reading"],
        phase: form.phase,
        currentCompany: form.currentCompany || undefined,
        minOffer: needsOffer && form.minOffer ? parseInt(form.minOffer) : undefined,
        maxOffer: needsOffer && form.maxOffer ? parseInt(form.maxOffer) : undefined,
        nextAction: form.nextAction || undefined,
        memo: form.memo || undefined,
      };
      await updateCandidate(candidate.id, updates);
      onUpdated({ ...candidate, ...updates });
      setEditing(false);
    } finally { setSaving(false); }
  };

  if (!editing) {
    const fmt = (v?: number) => v ? `${v}万円` : "—";
    const rows: [string, string][] = [
      ["氏名", candidate.name],
      ["年齢", candidate.age ? `${candidate.age}歳` : "—"],
      ["性別", candidate.gender ?? "—"],
      ["現住所", candidate.prefecture ?? "—"],
      ["最終学歴", candidate.education ?? "—"],
      ["現職", candidate.currentCompany ?? "—"],
      ["現年収", fmt(candidate.currentIncome)],
      ["希望年収", fmt(candidate.desiredIncome)],
      ["希望職種", (candidate.desiredJobs ?? []).join("・") || "—"],
      ["ネクストアクション", candidate.nextAction ?? "—"],
    ];
    if (["A","B","C"].includes(candidate.reading)) {
      rows.push(["売上見込み", `${fmt(candidate.minOffer)}〜${fmt(candidate.maxOffer)}`]);
    }
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 800, padding: "3px 12px", borderRadius: 14, background: rs.bg, color: rs.text }}>{candidate.reading}読み</span>
            <span style={{ fontSize: 12, color: "#4A6FA5", background: "#EBF5FF", borderRadius: 10, padding: "2px 10px" }}>{candidate.phase}</span>
          </div>
          <button onClick={() => setEditing(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#1A5BA6" }}>
            <Edit2 size={12} /> 編集
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ background: "#F7FAFF", borderRadius: 8, padding: "10px 14px" }}>
              <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0D2B5E" }}>{value}</p>
            </div>
          ))}
        </div>
        {candidate.memo && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 10, color: "#92400E", marginBottom: 4, fontWeight: 600 }}>メモ</p>
            <p style={{ fontSize: 13, color: "#0D2B5E", whiteSpace: "pre-wrap" }}>{candidate.memo}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#0D2B5E" }}>基本情報を編集</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setEditing(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 12, color: "#9CAAB8" }}>
            <X size={12} style={{ display: "inline", marginRight: 4 }} />キャンセル
          </button>
          <button onClick={handleSave} disabled={!form.name.trim() || saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            <Save size={12} />{saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#4A6FA5", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>基本情報</p>
      <FRow label="氏名 *">
        <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="山田 太郎" style={inp()} />
      </FRow>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <FRow label="年齢">
          <select value={form.age} onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))} style={inp()}>
            <option value="">選択</option>
            {AGES.map((a) => <option key={a} value={a}>{a}歳</option>)}
          </select>
        </FRow>
        <FRow label="性別">
          <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} style={inp()}>
            <option value="">選択</option>
            {GENDERS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </FRow>
        <FRow label="最終学歴">
          <select value={form.education} onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))} style={inp()}>
            <option value="">選択</option>
            {EDUCATIONS.map((e) => <option key={e}>{e}</option>)}
          </select>
        </FRow>
      </div>
      <FRow label="現住所">
        <select value={form.prefecture} onChange={(e) => setForm((f) => ({ ...f, prefecture: e.target.value }))} style={inp()}>
          <option value="">選択</option>
          {PREFECTURES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </FRow>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#4A6FA5", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 10px" }}>職歴・希望</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <FRow label="現年収">
          <select value={form.currentIncome} onChange={(e) => setForm((f) => ({ ...f, currentIncome: e.target.value }))} style={inp()}>
            <option value="">選択</option>
            {INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FRow>
        <FRow label="希望年収">
          <select value={form.desiredIncome} onChange={(e) => setForm((f) => ({ ...f, desiredIncome: e.target.value }))} style={inp()}>
            <option value="">選択</option>
            {INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FRow>
        <FRow label="現職">
          <input value={form.currentCompany} onChange={(e) => setForm((f) => ({ ...f, currentCompany: e.target.value }))} placeholder="株式会社○○" style={inp()} />
        </FRow>
      </div>
      <FRow label="希望職種（複数選択可）">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {DESIRED_JOBS_OPTIONS.map((job) => {
            const checked = form.desiredJobs.includes(job);
            return (
              <button key={job} onClick={() => toggleJob(job)} type="button"
                style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer", border: checked ? "2px solid #1A5BA6" : "1px solid #C8DFF5", background: checked ? "#EBF5FF" : "#F7FAFF", color: checked ? "#0D2B5E" : "#4A6FA5" }}>
                {job}
              </button>
            );
          })}
        </div>
      </FRow>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#4A6FA5", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 10px" }}>転職活動情報</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FRow label="読み">
          <select value={form.reading} onChange={(e) => handlePhaseChange(e.target.value)} style={inp()}>
            {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </FRow>
        <FRow label="ネクストアクション">
          <select value={form.nextAction} onChange={(e) => setForm((f) => ({ ...f, nextAction: e.target.value }))} style={inp()}>
            <option value="">選択...</option>
            {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.label}>{p.label}</option>)}
          </select>
        </FRow>
      </div>
      {needsOffer && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <FRow label="ミニマム（万円）">
            <input type="number" value={form.minOffer} onChange={(e) => setForm((f) => ({ ...f, minOffer: e.target.value }))} placeholder="500" style={inp()} />
          </FRow>
          <FRow label="マックス（万円）">
            <input type="number" value={form.maxOffer} onChange={(e) => setForm((f) => ({ ...f, maxOffer: e.target.value }))} placeholder="700" style={inp()} />
          </FRow>
        </div>
      )}
      <FRow label="メモ">
        <textarea value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))} rows={3} style={{ ...inp(), resize: "vertical" }} />
      </FRow>
    </div>
  );
}

// ── Tab 2: Feedback History (実装⑦) ──────────────────────────────────────────
function FeedbackHistoryTab({
  candidateId, candidateName, caId,
}: { candidateId: string; candidateName: string; caId: string }) {
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchFeedbackSessionsByCandidateId(candidateId),
      fetchFeedbackSessionsByCandidateName(candidateName),
    ]).then(([byId, byName]) => {
      const merged = [...byId];
      for (const s of byName) {
        if (!merged.find((m) => m.id === s.id)) merged.push(s);
      }
      merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSessions(merged);
      setLoading(false);
    });
  }, [candidateId, candidateName]);

  const scoreColor = (s: number) => s >= 80 ? "#166534" : s >= 60 ? "#854D0E" : "#991B1B";
  const scoreBg = (s: number) => s >= 80 ? "#DCFCE7" : s >= 60 ? "#FEF9C3" : "#FEE2E2";

  const extractTitle = (point: string) => {
    const colonIdx = point.indexOf("：");
    return colonIdx > 0 ? point.slice(0, colonIdx) : point.slice(0, 16);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>;

  return (
    <div>
      {/* 新規面談ボタン */}
      <div style={{ marginBottom: 14 }}>
        <Link href={`/new?candidate_id=${candidateId}&candidate_name=${encodeURIComponent(candidateName)}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", textDecoration: "none" }}>
          <Plus size={14} /> 新規面談を登録する
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8", marginBottom: 8 }}>面談記録がありません</p>
          <Link href={`/new?candidate_id=${candidateId}&candidate_name=${encodeURIComponent(candidateName)}`}
            style={{ fontSize: 12, color: "#1A5BA6", textDecoration: "none", fontWeight: 600 }}>
            最初の面談を登録する →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, overflow: "hidden" }}>
              {/* Card header */}
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, background: "#EBF5FF", color: "#1A5BA6", padding: "2px 8px", borderRadius: 8 }}>{s.meetingType}</span>
                    {s.interviewPhase && (
                      <span style={{ fontSize: 11, fontWeight: 600, background: "#F7FAFF", color: "#4A6FA5", padding: "2px 8px", borderRadius: 8, border: "1px solid #C8DFF5" }}>{s.interviewPhase}</span>
                    )}
                    <span style={{ fontSize: 11, color: "#9CAAB8" }}>{s.meetingDate}</span>
                    {s.staffName && <span style={{ fontSize: 11, color: "#9CAAB8" }}>担当: {s.staffName}</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0D2B5E", marginBottom: 8 }}>{s.summary || "（サマリなし）"}</p>

                  {/* Good points */}
                  {s.goodPoints.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 4 }}>
                      {s.goodPoints.slice(0, 3).map((gp, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 600, background: "#DCFCE7", color: "#166534", padding: "2px 8px", borderRadius: 8 }}>
                          ✓ {extractTitle(gp)}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Improvements */}
                  {s.improvements.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {s.improvements.slice(0, 2).map((imp, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 600, background: "#FEF9C3", color: "#854D0E", padding: "2px 8px", borderRadius: 8 }}>
                          △ {extractTitle(imp)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Score */}
                <div style={{ textAlign: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: scoreColor(s.totalScore), background: scoreBg(s.totalScore), padding: "6px 14px", borderRadius: 12, display: "block", lineHeight: 1 }}>{s.totalScore}</span>
                  <span style={{ fontSize: 9, color: "#9CAAB8", marginTop: 2, display: "block" }}>総合スコア</span>
                </div>
              </div>
              {/* Footer */}
              <div style={{ borderTop: "1px solid #EBF5FF", padding: "8px 16px", display: "flex", justifyContent: "flex-end" }}>
                <Link href={`/feedback/${s.id}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#1A5BA6", textDecoration: "none" }}>
                  詳細を見る <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Documents ──────────────────────────────────────────────────────────
function DocumentsTab({ candidateName, caId }: { candidateName: string; caId: string }) {
  const [docs, setDocs] = useState<CandidateDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments(caId).then((all) => {
      setDocs(all.filter((d) => d.candidateName === candidateName));
      setLoading(false);
    });
  }, [candidateName, caId]);

  const typeLabel = (t: string) => t === "resume" ? "職務経歴書" : t === "career" ? "キャリアシート" : t;

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>;
  if (docs.length === 0) return (
    <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
      <p style={{ fontSize: 14, color: "#9CAAB8", marginBottom: 8 }}>書類が作成されていません</p>
      <Link href="/documents" style={{ fontSize: 13, color: "#1A5BA6", textDecoration: "none", fontWeight: 600 }}>書類作成ページへ →</Link>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {docs.map((d) => (
        <div key={d.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <FileText size={18} style={{ color: "#1A5BA6", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E" }}>{typeLabel(d.documentType)}</p>
            <p style={{ fontSize: 11, color: "#9CAAB8" }}>{new Date(d.createdAt).toLocaleDateString("ja-JP")}</p>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <Link href="/documents" style={{ fontSize: 12, color: "#1A5BA6", textDecoration: "none" }}>+ 新規書類を作成</Link>
      </div>
    </div>
  );
}

// ── Tab 4: Target Companies + Recommendation ─────────────────────────────────
interface AddCompanyForm {
  name: string; industry: string; jobType: string; minIncome: string; maxIncome: string;
}

function TargetCompaniesTab({
  candidate, caName, onUpdated,
}: {
  candidate: Candidate; caName: string; onUpdated: (c: Candidate) => void;
}) {
  const [companies, setCompanies] = useState<TargetCompany[]>(candidate.targetCompanies ?? []);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddCompanyForm>({ name: "", industry: "", jobType: "", minIncome: "", maxIncome: "" });
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const save = useCallback(async (updated: TargetCompany[]) => {
    setCompanies(updated);
    await updateCandidate(candidate.id, { targetCompanies: updated });
    onUpdated({ ...candidate, targetCompanies: updated });
  }, [candidate, onUpdated]);

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    const entry: TargetCompany = {
      id: crypto.randomUUID(),
      name: addForm.name,
      industry: addForm.industry || undefined,
      jobType: addForm.jobType || undefined,
      minIncome: addForm.minIncome ? parseInt(addForm.minIncome) : undefined,
      maxIncome: addForm.maxIncome ? parseInt(addForm.maxIncome) : undefined,
      status: "considering",
      createdAt: new Date().toISOString(),
    };
    await save([...companies, entry]);
    setAddForm({ name: "", industry: "", jobType: "", minIncome: "", maxIncome: "" });
    setShowAdd(false);
  };

  const handleStatusChange = async (id: string, status: TargetCompany["status"]) => {
    await save(companies.map((c) => c.id === id ? { ...c, status } : c));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この企業を削除しますか？")) return;
    await save(companies.filter((c) => c.id !== id));
  };

  const generateRecommendation = async (company: TargetCompany) => {
    setGeneratingId(company.id);
    try {
      const feedbackSummaries: string[] = [];
      const res = await fetch("/api/candidates/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate: {
            name: candidate.name,
            age: candidate.age,
            education: candidate.education,
            currentIncome: candidate.currentIncome,
            desiredIncome: candidate.desiredIncome,
            desiredJobs: candidate.desiredJobs,
            currentCompany: candidate.currentCompany,
            phase: candidate.phase,
            memo: candidate.memo,
          },
          company: {
            name: company.name,
            industry: company.industry,
            jobType: company.jobType,
            minIncome: company.minIncome,
            maxIncome: company.maxIncome,
          },
          caName,
          feedbackSummaries,
        }),
      });
      if (!res.ok) throw new Error("生成失敗");
      const { recommendation } = await res.json();
      await save(companies.map((c) => c.id === company.id ? { ...c, recommendation } : c));
      setExpandedId(company.id);
    } catch {
      alert("推薦文の生成に失敗しました");
    } finally {
      setGeneratingId(null);
    }
  };

  const statusOpt = (status: string) => TARGET_STATUS_OPTIONS.find((o) => o.value === status) ?? TARGET_STATUS_OPTIONS[0];
  const fmt = (v?: number) => v ? `${v}万円` : "—";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button onClick={() => setShowAdd(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
          <Plus size={14} /> 企業を追加
        </button>
      </div>

      {showAdd && (
        <div style={{ background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 10, padding: 18, marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#0D2B5E", marginBottom: 12 }}>企業を追加</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <FRow label="企業名 *">
              <input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="株式会社○○" style={inp()} />
            </FRow>
            <FRow label="業種">
              <input value={addForm.industry} onChange={(e) => setAddForm((f) => ({ ...f, industry: e.target.value }))} placeholder="IT・通信" style={inp()} />
            </FRow>
            <FRow label="職種">
              <input value={addForm.jobType} onChange={(e) => setAddForm((f) => ({ ...f, jobType: e.target.value }))} placeholder="法人営業" style={inp()} />
            </FRow>
            <FRow label="年収レンジ（万円）">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" value={addForm.minIncome} onChange={(e) => setAddForm((f) => ({ ...f, minIncome: e.target.value }))} placeholder="400" style={{ ...inp(), flex: 1 }} />
                <span style={{ fontSize: 12, color: "#9CAAB8" }}>〜</span>
                <input type="number" value={addForm.maxIncome} onChange={(e) => setAddForm((f) => ({ ...f, maxIncome: e.target.value }))} placeholder="600" style={{ ...inp(), flex: 1 }} />
              </div>
            </FRow>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setShowAdd(false)} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 12, color: "#9CAAB8" }}>キャンセル</button>
            <button onClick={handleAdd} disabled={!addForm.name.trim()}
              style={{ padding: "7px 16px", borderRadius: 7, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>追加</button>
          </div>
        </div>
      )}

      {companies.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>応募企業が登録されていません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {companies.map((co) => {
            const st = statusOpt(co.status);
            const isExpanded = expandedId === co.id;
            return (
              <div key={co.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <Building2 size={16} style={{ color: "#4A6FA5", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E" }}>{co.name}</p>
                    <p style={{ fontSize: 11, color: "#9CAAB8" }}>
                      {[co.industry, co.jobType, (co.minIncome || co.maxIncome) ? `${fmt(co.minIncome)}〜${fmt(co.maxIncome)}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <select value={co.status} onChange={(e) => handleStatusChange(co.id, e.target.value as TargetCompany["status"])}
                    style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${st.bg}`, borderRadius: 8, padding: "3px 8px", background: st.bg, color: st.text, cursor: "pointer" }}>
                    {TARGET_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button onClick={() => generateRecommendation(co)} disabled={generatingId === co.id}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#1A5BA6", whiteSpace: "nowrap" }}>
                    <Sparkles size={12} />{generatingId === co.id ? "生成中..." : "推薦文"}
                  </button>
                  {co.recommendation && (
                    <button onClick={() => setExpandedId(isExpanded ? null : co.id)}
                      style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#EBF5FF", cursor: "pointer", fontSize: 11, color: "#1A5BA6" }}>
                      {isExpanded ? "閉じる" : "表示"}
                    </button>
                  )}
                  <button onClick={() => handleDelete(co.id)}
                    style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FFF0F0", cursor: "pointer", color: "#991B1B" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                {isExpanded && co.recommendation && (
                  <div style={{ borderTop: "1px solid #EBF5FF", padding: "14px 16px", background: "#F7FAFF" }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#4A6FA5", marginBottom: 8 }}>推薦文</p>
                    <pre style={{ fontSize: 12, color: "#0D2B5E", whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: 1.7, margin: 0 }}>{co.recommendation}</pre>
                    <button onClick={() => navigator.clipboard.writeText(co.recommendation!)}
                      style={{ marginTop: 10, padding: "5px 12px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 11, color: "#1A5BA6" }}>
                      コピー
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 5: Entry Requests (実装⑧) ────────────────────────────────────────────
interface EntryForm {
  companyName: string;
  companyId: string;
  recommendation: string;
  mediaInput: string;
  mediaTags: string[];
  date1: string; time1: string;
  date2: string; time2: string;
  date3: string; time3: string;
}

function EntryRequestsTab({
  candidate, caId, caName, targetCompanies,
}: {
  candidate: Candidate; caId: string; caName: string; targetCompanies: TargetCompany[];
}) {
  const [entries, setEntries] = useState<EntryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<EntryForm>({
    companyName: "", companyId: "", recommendation: "",
    mediaInput: "", mediaTags: [],
    date1: "", time1: "10:00",
    date2: "", time2: "10:00",
    date3: "", time3: "10:00",
  });

  useEffect(() => {
    fetchEntryRequestsByCandidateId(candidate.id).then((es) => { setEntries(es); setLoading(false); });
  }, [candidate.id]);

  const handleCompanySelect = (companyId: string) => {
    const co = targetCompanies.find((c) => c.id === companyId);
    if (!co) { setForm((f) => ({ ...f, companyName: "", companyId: "", recommendation: "" })); return; }
    setForm((f) => ({ ...f, companyName: co.name, companyId: co.companyId ?? co.id, recommendation: co.recommendation ?? "" }));
  };

  const addMediaTag = () => {
    const tag = form.mediaInput.trim();
    if (tag && !form.mediaTags.includes(tag)) {
      setForm((f) => ({ ...f, mediaTags: [...f.mediaTags, tag], mediaInput: "" }));
    }
  };

  const removeMediaTag = (tag: string) =>
    setForm((f) => ({ ...f, mediaTags: f.mediaTags.filter((t) => t !== tag) }));

  const buildDates = () => {
    const dates: string[] = [];
    if (form.date1) dates.push(`${form.date1} ${form.time1}`);
    if (form.date2) dates.push(`${form.date2} ${form.time2}`);
    if (form.date3) dates.push(`${form.date3} ${form.time3}`);
    return dates;
  };

  const handleSubmit = async () => {
    if (!form.companyName.trim()) return;
    setSubmitting(true);
    try {
      const id = await addEntryRequest({
        caId, caName,
        candidateId: candidate.id,
        candidateName: candidate.name,
        companyName: form.companyName,
        companyId: form.companyId || undefined,
        media: form.mediaTags,
        recommendation: form.recommendation || undefined,
        interviewDates: buildDates(),
        status: "pending",
      });
      const newEntry: EntryRequest = {
        id: id ?? crypto.randomUUID(),
        caId, caName,
        candidateId: candidate.id,
        candidateName: candidate.name,
        companyName: form.companyName,
        companyId: form.companyId || undefined,
        media: form.mediaTags,
        recommendation: form.recommendation || undefined,
        interviewDates: buildDates(),
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
      setForm({ companyName: "", companyId: "", recommendation: "", mediaInput: "", mediaTags: [], date1: "", time1: "10:00", date2: "", time2: "10:00", date3: "", time3: "10:00" });
      setShowForm(false);
    } finally { setSubmitting(false); }
  };

  const handleStatusChange = async (id: string, status: EntryRequest["status"]) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    await updateEntryStatus(id, status);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button onClick={() => setShowForm(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
          <Plus size={14} /> エントリー依頼
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 12, padding: 20, marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#0D2B5E", marginBottom: 16 }}>エントリー依頼を作成</p>

          {/* Read-only fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <Lbl>求職者名</Lbl>
              <div style={{ ...inp(), background: "#F0F4FA", color: "#9CAAB8" }}>{candidate.name}</div>
            </div>
            <div>
              <Lbl>担当CA</Lbl>
              <div style={{ ...inp(), background: "#F0F4FA", color: "#9CAAB8" }}>{caName}</div>
            </div>
          </div>

          {/* Company selection */}
          <FRow label="エントリー企業 *">
            {targetCompanies.length > 0 ? (
              <select value={form.companyId} onChange={(e) => handleCompanySelect(e.target.value)} style={inp()}>
                <option value="">企業を選択...</option>
                {targetCompanies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}
              </select>
            ) : (
              <input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="株式会社○○（タブ4に企業を先に登録してください）" style={inp()} />
            )}
          </FRow>
          {form.companyName && targetCompanies.length > 0 && (
            <div style={{ fontSize: 12, color: "#1A5BA6", marginTop: -8, marginBottom: 12 }}>選択企業: {form.companyName}</div>
          )}

          {/* Media tags */}
          <FRow label="エントリー媒体">
            <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              {form.mediaTags.map((tag) => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 600, background: "#EBF5FF", color: "#0D2B5E", padding: "3px 10px", borderRadius: 14, display: "flex", alignItems: "center", gap: 4 }}>
                  {tag}
                  <button onClick={() => removeMediaTag(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CAAB8", padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input value={form.mediaInput} onChange={(e) => setForm((f) => ({ ...f, mediaInput: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addMediaTag(); } }}
                placeholder="リクナビNEXT（Enterで追加）" style={{ ...inp(), flex: 1 }} />
              <button onClick={addMediaTag} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 12, color: "#1A5BA6", fontWeight: 600, whiteSpace: "nowrap" }}>追加</button>
            </div>
          </FRow>

          {/* Interview dates */}
          <Lbl>面接候補日</Lbl>
          {[1,2,3].map((n) => {
            const dateKey = `date${n}` as keyof EntryForm;
            const timeKey = `time${n}` as keyof EntryForm;
            return (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#9CAAB8", fontWeight: 600, minWidth: 40 }}>第{n}希望</span>
                <input type="date" value={form[dateKey] as string} onChange={(e) => setForm((f) => ({ ...f, [dateKey]: e.target.value }))} style={inp()} />
                <input type="time" value={form[timeKey] as string} onChange={(e) => setForm((f) => ({ ...f, [timeKey]: e.target.value }))} style={inp()} />
              </div>
            );
          })}

          {/* Recommendation */}
          <FRow label="推薦文（自動入力・編集可）">
            <textarea value={form.recommendation} onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value }))}
              rows={5} placeholder="推薦文がある場合は自動入力されます。編集可能です。"
              style={{ ...inp(), resize: "vertical" }} />
          </FRow>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 7, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 13, color: "#9CAAB8" }}>キャンセル</button>
            <button onClick={handleSubmit} disabled={!form.companyName.trim() || submitting}
              style={{ padding: "8px 20px", borderRadius: 7, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {submitting ? "送信中..." : "依頼を作成"}
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>エントリー依頼がありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e) => {
            const st = ENTRY_STATUS[e.status] ?? ENTRY_STATUS.pending;
            return (
              <div key={e.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <ClipboardList size={16} style={{ color: "#4A6FA5", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E", marginBottom: 3 }}>{e.companyName}</p>
                    <p style={{ fontSize: 11, color: "#9CAAB8", marginBottom: 4 }}>
                      {e.media && e.media.length > 0 ? e.media.join(", ") + " · " : ""}{new Date(e.createdAt).toLocaleDateString("ja-JP")}
                    </p>
                    {e.interviewDates && e.interviewDates.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {e.interviewDates.map((d, i) => (
                          <span key={i} style={{ fontSize: 10, background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "1px 7px", color: "#4A6FA5" }}>
                            第{i+1}候補: {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <select value={e.status} onChange={(ev) => handleStatusChange(e.id, ev.target.value as EntryRequest["status"])}
                    style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${st.bg}`, borderRadius: 8, padding: "3px 8px", background: st.bg, color: st.text, cursor: "pointer", flexShrink: 0 }}>
                    {Object.entries(ENTRY_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "basic",    label: "基本情報",    icon: User },
  { id: "feedback", label: "面談・FB履歴", icon: MessageSquare },
  { id: "docs",     label: "書類",        icon: FileText },
  { id: "companies",label: "受ける企業",  icon: Building2 },
  { id: "entries",  label: "エントリー",  icon: ClipboardList },
];

function CandidateDetailInner({ caId, candidateId }: { caId: string; candidateId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") ?? "basic");

  useEffect(() => {
    const load = async () => {
      const [c, s] = await Promise.all([fetchCandidateById(candidateId), fetchStaffById(caId)]);
      if (!c) {
        // Fallback: fetchCandidateById returned null — try scanning the CA's full list
        console.warn('fetchCandidateById returned null for id:', candidateId, '— falling back to fetchCandidates');
        const all = await fetchCandidates(caId);
        const found = all.find((cand) => cand.id === candidateId) ?? null;
        setCandidate(found);
      } else {
        setCandidate(c);
      }
      setStaff(s);
      setLoading(false);
    };
    load().catch((err) => {
      console.error('CandidateDetailInner load error:', err);
      setLoading(false);
    });
  }, [candidateId, caId]);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>;
  if (!candidate) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: "#991B1B" }}>求職者が見つかりません</p>
      <button onClick={() => router.back()} style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", fontSize: 13, color: "#0D2B5E" }}>戻る</button>
    </div>
  );

  const caName = staff?.name ?? "";
  const rs = READING_STYLE[candidate.reading] ?? READING_STYLE.G;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 800 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Link href={`/ca-management/${caId}`}
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#9CAAB8", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
          <ChevronLeft size={16} />{staff?.name ?? "戻る"}
        </Link>
        <span style={{ color: "#C8DFF5" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}>{candidate.name}</span>
        <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 12, background: rs.bg, color: rs.text, marginLeft: 4 }}>{candidate.reading}読み</span>
      </div>

      {/* Sub-header stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
        {[
          ["フェーズ", candidate.phase],
          ["現職", candidate.currentCompany ?? "—"],
          ["希望年収", candidate.desiredIncome ? `${candidate.desiredIncome}万円` : "—"],
          ["希望職種", (candidate.desiredJobs ?? []).slice(0, 2).join("・") || "—"],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 8, padding: "8px 14px" }}>
            <p style={{ fontSize: 9, color: "#9CAAB8", marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #EBF5FF", marginBottom: 22 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "9px 16px",
              fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: "none",
              color: activeTab === id ? "#0D2B5E" : "#9CAAB8",
              borderBottom: activeTab === id ? "2px solid #1A5BA6" : "2px solid transparent",
              marginBottom: -2,
            }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "basic" && (
          <BasicInfoTab candidate={candidate} caId={caId} onUpdated={setCandidate} />
        )}
        {activeTab === "feedback" && (
          <FeedbackHistoryTab candidateId={candidateId} candidateName={candidate.name} caId={caId} />
        )}
        {activeTab === "docs" && (
          <DocumentsTab candidateName={candidate.name} caId={caId} />
        )}
        {activeTab === "companies" && (
          <TargetCompaniesTab candidate={candidate} caName={caName} onUpdated={setCandidate} />
        )}
        {activeTab === "entries" && (
          <EntryRequestsTab
            candidate={candidate} caId={caId} caName={caName}
            targetCompanies={candidate.targetCompanies ?? []}
          />
        )}
      </div>
    </div>
  );
}

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string; candidateId: string }> }) {
  const { id: caId, candidateId } = use(params);
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>}>
      <CandidateDetailInner caId={caId} candidateId={candidateId} />
    </Suspense>
  );
}

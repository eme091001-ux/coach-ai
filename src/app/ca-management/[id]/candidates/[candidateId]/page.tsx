"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  mapDbCandidateToApp, updateCandidate,
  fetchFeedbackSessionsByCandidateId,
  fetchEntryRequestsByCandidateId, addEntryRequest, updateEntryStatus,
  updateEntryRecommendation,
  fetchDocuments,
  Candidate, CandidateDocument, EntryRequest, TargetCompany,
} from "@/lib/db";
import { FeedbackSession } from "@/types";
import { ChevronLeft, Edit2, Plus, X, FileText, Building2, ClipboardList, User } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const READING_STYLE: Record<string, { bg: string; text: string }> = {
  A: { bg: "#FEE2E2", text: "#991B1B" },
  B: { bg: "#FEF9C3", text: "#854D0E" },
  C: { bg: "#FEF9C3", text: "#854D0E" },
  D: { bg: "#F1F0E8", text: "#5F5E5A" },
  E: { bg: "#F1F0E8", text: "#5F5E5A" },
  F: { bg: "#F1F0E8", text: "#5F5E5A" },
  G: { bg: "#F1F0E8", text: "#5F5E5A" },
};

const PHASE_OPTIONS = [
  { value: "A", label: "A 内定承諾" },
  { value: "B", label: "B 内定" },
  { value: "C", label: "C 企業面接待ち" },
  { value: "D", label: "D 企業面接日設定中" },
  { value: "E", label: "E 次回面談次第" },
  { value: "F", label: "F 長期保有" },
  { value: "G", label: "G 離脱" },
];

const NA_OPTIONS = [
  "次回二次面接（再一次）",
  "次回求人提案",
  "次回面接対策",
  "次回企業面接",
  "次回内定承諾",
  "長期保有",
];

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

const INCOME_OPTIONS = [
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

const ENTRY_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "依頼中",       bg: "#FEF9C3", text: "#854D0E" },
  entered:   { label: "エントリー済", bg: "#E8F2FC", text: "#1A5BA6" },
  adjusting: { label: "日程調整中",   bg: "#FAEEDA", text: "#854F0B" },
  confirmed: { label: "確定面接待ち", bg: "#DCFCE7", text: "#166534" },
  done:      { label: "面接完了",     bg: "#F1F0E8", text: "#5F5E5A" },
  stopped:   { label: "進んでいない", bg: "#FEE2E2", text: "#991B1B" },
};

const TARGET_STATUS_LABELS: Record<string, string> = {
  considering: "検討中", entered: "エントリー済", interviewing: "面接中",
  offered: "内定", declined: "辞退", rejected: "不合格",
};

const PHASE_BADGE: Record<string, { bg: string; text: string }> = {
  "1次面談": { bg: "#E8F2FC", text: "#1A5BA6" },
  "2次面談": { bg: "#DCFCE7", text: "#166534" },
  "求人提案": { bg: "#FEF9C3", text: "#854D0E" },
  "内定後フォロー": { bg: "#FEE2E2", text: "#991B1B" },
};

// ── Step1 追加定数 ─────────────────────────────────────────────────────────────
const MEDIA_OPTIONS = [
  "リクナビNEXT", "マイナビ転職", "doda", "Green", "Wantedly",
  "LinkedIn", "ビズリーチ", "ハローワーク", "エージェント（自社）", "その他",
];

const ENTRY_JOB_OPTIONS = [
  "営業", "法人営業", "個人営業", "内勤営業", "施工管理", "販売", "接客",
  "ITエンジニア", "電気・機械エンジニア", "インフラエンジニア", "マーケティング",
  "企画", "人事・採用", "経理・財務", "コンサルタント", "マネージャー", "その他",
];

// ── Tab 1: Basic Info ─────────────────────────────────────────────────────────

function BasicInfoTab({ candidate, onUpdate }: {
  candidate: Candidate;
  onUpdate: (updated: Candidate) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: candidate.name,
    reading: candidate.reading as string,
    phase: candidate.phase,
    nextAction: candidate.nextAction ?? "",
    currentIndustry: candidate.currentCompany ?? "",
    desiredJob: candidate.desiredJob ?? "",
    age: String(candidate.age ?? ""),
    prefecture: candidate.prefecture ?? "",
    gender: candidate.gender ?? "",
    education: candidate.education ?? "",
    currentIncome: String(candidate.currentIncome ?? ""),
    desiredIncome: String(candidate.desiredIncome ?? ""),
    desiredJobs: candidate.desiredJobs ?? [],
    minOffer: String(candidate.minOffer ?? ""),
    maxOffer: String(candidate.maxOffer ?? ""),
    memo: candidate.memo ?? "",
  });

  const toggleJob = (job: string) => {
    setForm((prev) => ({
      ...prev,
      desiredJobs: prev.desiredJobs.includes(job)
        ? prev.desiredJobs.filter((j) => j !== job)
        : [...prev.desiredJobs, job],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const updates: Partial<Candidate> = {
      name: form.name,
      reading: form.reading as Candidate["reading"],
      phase: form.phase,
      nextAction: form.nextAction || undefined,
      currentCompany: form.currentIndustry || undefined,
      desiredJob: form.desiredJob || undefined,
      age: form.age ? Number(form.age) : undefined,
      prefecture: form.prefecture || undefined,
      gender: form.gender || undefined,
      education: form.education || undefined,
      currentIncome: form.currentIncome ? Number(form.currentIncome) : undefined,
      desiredIncome: form.desiredIncome ? Number(form.desiredIncome) : undefined,
      desiredJobs: form.desiredJobs.length > 0 ? form.desiredJobs : undefined,
      minOffer: form.minOffer ? Number(form.minOffer) : undefined,
      maxOffer: form.maxOffer ? Number(form.maxOffer) : undefined,
      memo: form.memo || undefined,
    };
    await updateCandidate(candidate.id, updates);
    onUpdate({ ...candidate, ...updates });
    setSaving(false);
    setEditing(false);
  };

  const row = (label: string, value: React.ReactNode) => (
    <div style={{ display: "flex", padding: "10px 0", borderBottom: "1px solid #E8F2FC" }}>
      <span style={{ width: 140, fontSize: 12, color: "#9CAAB8", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#0D2B5E", fontWeight: 500 }}>{value || "—"}</span>
    </div>
  );

  const rs = READING_STYLE[candidate.reading] ?? READING_STYLE.G;

  if (editing) {
    return (
      <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}>基本情報を編集</h3>
          <button onClick={() => setEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CAAB8" }}><X size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>氏名</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>ランク</label>
            <select value={form.reading} onChange={(e) => setForm({ ...form, reading: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              {["A","B","C","D","E","F","G"].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>フェーズ</label>
            <select value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              {PHASE_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>次回アクション</label>
            <select value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              {NA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>年齢</label>
            <select value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              {Array.from({ length: 48 }, (_, i) => i + 18).map((a) => <option key={a} value={a}>{a}歳</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>性別</label>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              <option value="男性">男性</option>
              <option value="女性">女性</option>
              <option value="その他">その他</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>都道府県</label>
            <select value={form.prefecture} onChange={(e) => setForm({ ...form, prefecture: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              {PREFECTURE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>最終学歴</label>
            <select value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              {EDUCATION_OPTIONS.map((ed) => <option key={ed} value={ed}>{ed}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>現職業種</label>
            <select value={form.currentIndustry} onChange={(e) => setForm({ ...form, currentIndustry: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              {CURRENT_INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>希望職種（テキスト）</label>
            <input value={form.desiredJob} onChange={(e) => setForm({ ...form, desiredJob: e.target.value })} placeholder="例: 法人営業"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>現年収</label>
            <select value={form.currentIncome} onChange={(e) => setForm({ ...form, currentIncome: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              {INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>希望年収</label>
            <select value={form.desiredIncome} onChange={(e) => setForm({ ...form, desiredIncome: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13 }}>
              <option value="">選択してください（任意）</option>
              {INCOME_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>オファー金額（最低）万円</label>
            <input type="number" value={form.minOffer} onChange={(e) => setForm({ ...form, minOffer: e.target.value })} placeholder="例: 400"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>オファー金額（最高）万円</label>
            <input type="number" value={form.maxOffer} onChange={(e) => setForm({ ...form, maxOffer: e.target.value })} placeholder="例: 500"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 6 }}>希望職種（複数選択）</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DESIRED_JOB_OPTIONS.map((j) => (
              <button key={j} type="button" onClick={() => toggleJob(j)}
                style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, border: form.desiredJobs.includes(j) ? "2px solid #1A5BA6" : "1px solid #C8DFF5", background: form.desiredJobs.includes(j) ? "#EBF5FF" : "#fff", color: form.desiredJobs.includes(j) ? "#0D2B5E" : "#4A6FA5", cursor: "pointer" }}>
                {j}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>メモ</label>
          <textarea value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} rows={3}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setEditing(false)}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", fontSize: 13, cursor: "pointer" }}>
            キャンセル
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}>
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#0D2B5E" }}>{candidate.name}</span>
          <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 12, background: rs.bg, color: rs.text }}>{candidate.reading}</span>
          <span style={{ fontSize: 11, background: "#E8F2FC", color: "#1A5BA6", borderRadius: 8, padding: "2px 8px" }}>{candidate.phase}</span>
        </div>
        <button onClick={() => setEditing(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", fontSize: 12, cursor: "pointer" }}>
          <Edit2 size={12} /> 編集
        </button>
      </div>
      <div>
        {row("次回アクション", candidate.nextAction)}
        {row("年齢", candidate.age ? `${candidate.age}歳` : null)}
        {row("性別", candidate.gender)}
        {row("都道府県", candidate.prefecture)}
        {row("最終学歴", candidate.education)}
        {row("現職業種", candidate.currentCompany)}
        {row("希望職種", candidate.desiredJob)}
        {row("現年収", candidate.currentIncome ? `${candidate.currentIncome}万円` : null)}
        {row("希望年収", candidate.desiredIncome ? `${candidate.desiredIncome}万円` : null)}
        {row("希望職種（複数）", candidate.desiredJobs?.length ? (
          <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {candidate.desiredJobs.map((j) => (
              <span key={j} style={{ fontSize: 11, background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "1px 7px", color: "#4A6FA5" }}>{j}</span>
            ))}
          </span>
        ) : null)}
        {row("オファー金額", (candidate.minOffer || candidate.maxOffer) ? `${candidate.minOffer ?? "—"}〜${candidate.maxOffer ?? "—"}万円` : null)}
        {row("メモ", candidate.memo && (
          <span style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#0D2B5E" }}>{candidate.memo}</span>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: Feedback History ───────────────────────────────────────────────────

function FeedbackHistoryTab({ candidateId, candidateName, caId }: {
  candidateId: string;
  candidateName: string;
  caId: string;
}) {
  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbackSessionsByCandidateId(candidateId).then((ss) => {
      setSessions(ss);
      setLoading(false);
    });
  }, [candidateId]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#9CAAB8" }}>{candidateName} の面談・フィードバック履歴</p>
        <Link href={`/feedback/new?caId=${caId}&candidateId=${candidateId}&candidateName=${encodeURIComponent(candidateName)}`}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", textDecoration: "none" }}>
          <Plus size={13} /> 新規面談
        </Link>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>
      ) : sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>面談履歴がありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sessions.map((s) => {
            const pb = s.interviewPhase ? PHASE_BADGE[s.interviewPhase] : null;
            const scoreColor = s.totalScore >= 80 ? "#166534" : s.totalScore >= 60 ? "#1A5BA6" : "#991B1B";
            return (
              <Link key={s.id} href={`/feedback/${s.id}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3B8FD4"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(59,143,212,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#C8DFF5"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 3 }}>{s.meetingType}</p>
                    <p style={{ fontSize: 11, color: "#9CAAB8" }}>{s.meetingDate} · {s.staffName}</p>
                  </div>
                  {pb && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: pb.bg, color: pb.text }}>
                      {s.interviewPhase}
                    </span>
                  )}
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor }}>{s.totalScore}</span>
                    <span style={{ fontSize: 10, color: "#9CAAB8" }}>点</span>
                  </div>
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

function DocumentsTab({ candidateName, caId, candidateId }: {
  candidateName: string;
  caId: string;
  candidateId: string;
}) {
  const [docs, setDocs] = useState<CandidateDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments(caId).then((all) => {
      setDocs(all.filter((d) => d.candidateName === candidateName));
      setLoading(false);
    });
  }, [caId, candidateName]);

  const docTypeLabel = (t: string) => t === "resume" ? "履歴書" : "職務経歴書";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#9CAAB8" }}>{candidateName} の書類一覧</p>
        <Link href={`/documents?caId=${caId}&candidateId=${candidateId}&candidateName=${encodeURIComponent(candidateName)}`}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", textDecoration: "none" }}>
          <Plus size={13} /> 書類を作成
        </Link>
      </div>
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>書類がありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <FileText size={18} color="#3B8FD4" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0D2B5E", marginBottom: 2 }}>{docTypeLabel(d.documentType)}</p>
                <p style={{ fontSize: 11, color: "#9CAAB8" }}>{new Date(d.createdAt).toLocaleDateString("ja-JP")}</p>
              </div>
              <Link href={`/documents/${d.id}`}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", fontSize: 12, textDecoration: "none" }}>
                編集 / PDF
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 4: Entry Companies (Step1: 媒体・売上・10社同時入力対応) ───────────────

type EntryRow = { name: string; media: string; customMedia: string; jobType: string; minSales: string; maxSales: string };
const EMPTY_ROW: EntryRow = { name: "", media: "", customMedia: "", jobType: "", minSales: "", maxSales: "" };

function TargetCompaniesTab({ candidate, onUpdate }: {
  candidate: Candidate;
  onUpdate: (updated: Candidate) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [rows, setRows] = useState<EntryRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const [editingRec, setEditingRec] = useState<string | null>(null);
  const [recText, setRecText] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const companies = candidate.targetCompanies ?? [];

  const openModal = () => {
    setRows([{ ...EMPTY_ROW }]);
    setShowModal(true);
  };

  const addRow = () => {
    if (rows.length >= 10) return;
    setRows([...rows, { ...EMPTY_ROW }]);
  };

  const removeRow = (i: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, field: keyof EntryRow, val: string) => {
    setRows(rows.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const handleAddCompanies = async () => {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const added: TargetCompany[] = valid.map((r) => ({
        id: crypto.randomUUID(),
        name: r.name.trim(),
        jobType: r.jobType || undefined,
        media: r.customMedia.trim() || r.media || undefined,
        minSales: r.minSales ? Number(r.minSales) : undefined,
        maxSales: r.maxSales ? Number(r.maxSales) : undefined,
        status: "considering" as const,
        createdAt: new Date().toISOString(),
      }));
      const updated = [...companies, ...added];
      await updateCandidate(candidate.id, { targetCompanies: updated });
      onUpdate({ ...candidate, targetCompanies: updated });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (companyId: string, status: TargetCompany["status"]) => {
    const updated = companies.map((c) => c.id === companyId ? { ...c, status } : c);
    await updateCandidate(candidate.id, { targetCompanies: updated });
    onUpdate({ ...candidate, targetCompanies: updated });
  };

  const handleSaveRec = async (companyId: string) => {
    const updated = companies.map((c) => c.id === companyId ? { ...c, recommendation: recText } : c);
    await updateCandidate(candidate.id, { targetCompanies: updated });
    onUpdate({ ...candidate, targetCompanies: updated });
    setEditingRec(null);
  };

  const handleGenerateRec = async (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    if (!company) return;
    setGenerating(companyId);
    try {
      const res = await fetch("/api/generate-recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidate.name,
          companyName: company.name,
          desiredJob: candidate.desiredJob,
          desiredJobs: candidate.desiredJobs,
          age: candidate.age,
          education: candidate.education,
          currentIncome: candidate.currentIncome,
          desiredIncome: candidate.desiredIncome,
        }),
      });
      if (res.ok) {
        const { text } = await res.json();
        const updated = companies.map((c) => c.id === companyId ? { ...c, recommendation: text } : c);
        await updateCandidate(candidate.id, { targetCompanies: updated });
        onUpdate({ ...candidate, targetCompanies: updated });
      }
    } finally {
      setGenerating(null);
    }
  };

  const handleRemove = async (companyId: string) => {
    if (!confirm("この企業を削除しますか？")) return;
    const updated = companies.filter((c) => c.id !== companyId);
    await updateCandidate(candidate.id, { targetCompanies: updated });
    onUpdate({ ...candidate, targetCompanies: updated });
  };

  const inpSt: React.CSSProperties = { width: "100%", padding: "6px 8px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 12, boxSizing: "border-box", color: "#0D2B5E", background: "#fff" };
  const hasValid = rows.some((r) => r.name.trim());

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#9CAAB8" }}>エントリー企業と推薦文</p>
        <button onClick={openModal}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
          <Plus size={13} /> 企業を追加
        </button>
      </div>

      {/* ── 一括追加モーダル（最大10社）── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 860, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}>エントリー企業を追加（最大10社）</h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CAAB8" }}><X size={16} /></button>
            </div>

            {/* テーブルヘッダー */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.6fr 1.4fr 80px 80px 32px", gap: 6, marginBottom: 8, padding: "0 4px" }}>
              {["企業名 *", "媒体", "職種", "MIN売上(万)", "MAX売上(万)", ""].map((h) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 600, color: "#9CAAB8" }}>{h}</span>
              ))}
            </div>

            {/* 入力行 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((r, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1.6fr 1.4fr 80px 80px 32px", gap: 6, alignItems: "start" }}>
                  {/* 企業名 */}
                  <input value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)}
                    placeholder="株式会社〇〇" style={inpSt} />
                  {/* 媒体 プルダウン + カスタム */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <select value={r.media} onChange={(e) => updateRow(i, "media", e.target.value)} style={inpSt}>
                      <option value="">選択...</option>
                      {MEDIA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <input value={r.customMedia} onChange={(e) => updateRow(i, "customMedia", e.target.value)}
                      placeholder="直接入力" style={{ ...inpSt, fontSize: 11 }} />
                  </div>
                  {/* 職種 */}
                  <select value={r.jobType} onChange={(e) => updateRow(i, "jobType", e.target.value)} style={inpSt}>
                    <option value="">選択...</option>
                    {ENTRY_JOB_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
                  </select>
                  {/* MIN売上 */}
                  <input type="number" value={r.minSales} onChange={(e) => updateRow(i, "minSales", e.target.value)}
                    placeholder="0" min={0} style={inpSt} />
                  {/* MAX売上 */}
                  <input type="number" value={r.maxSales} onChange={(e) => updateRow(i, "maxSales", e.target.value)}
                    placeholder="0" min={0} style={inpSt} />
                  {/* 行削除 */}
                  <button onClick={() => removeRow(i)} disabled={rows.length === 1}
                    style={{ padding: "6px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FFF0F0", cursor: rows.length === 1 ? "not-allowed" : "pointer", color: "#991B1B", opacity: rows.length === 1 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* 行追加ボタン */}
            {rows.length < 10 && (
              <button onClick={addRow}
                style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#4A6FA5", background: "none", border: "1px dashed #C8DFF5", borderRadius: 8, padding: "6px 14px", cursor: "pointer", width: "100%", justifyContent: "center" }}>
                <Plus size={12} /> 行を追加（{rows.length}/10）
              </button>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", fontSize: 13, cursor: "pointer" }}>
                キャンセル
              </button>
              <button onClick={handleAddCompanies} disabled={!hasValid || saving}
                style={{ padding: "8px 24px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (!hasValid || saving) ? "not-allowed" : "pointer", opacity: (!hasValid || saving) ? 0.6 : 1 }}>
                {saving ? "保存中..." : `${rows.filter((r) => r.name.trim()).length}社を追加`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 企業カード一覧 ── */}
      {companies.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>エントリー企業が登録されていません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {companies.map((c) => {
            const isEditingThisRec = editingRec === c.id;
            return (
              <div key={c.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                  <Building2 size={16} color="#3B8FD4" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 4 }}>{c.name}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {c.jobType && <span style={{ fontSize: 11, background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "1px 7px", color: "#4A6FA5" }}>{c.jobType}</span>}
                      {c.media && <span style={{ fontSize: 11, background: "#EBF5FF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "1px 7px", color: "#1A5BA6" }}>{c.media}</span>}
                      {(c.minSales || c.maxSales) && (
                        <span style={{ fontSize: 11, background: "#DCFCE7", border: "1px solid #BBF7D0", borderRadius: 6, padding: "1px 7px", color: "#166534", fontWeight: 600 }}>
                          {c.minSales ?? "—"}〜{c.maxSales ?? "—"}万円
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <select value={c.status} onChange={(e) => handleStatusChange(c.id, e.target.value as TargetCompany["status"])}
                      style={{ fontSize: 11, border: "1px solid #C8DFF5", borderRadius: 6, padding: "3px 8px", color: "#0D2B5E", background: "#fff", cursor: "pointer" }}>
                      {Object.entries(TARGET_STATUS_LABELS).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                    <button onClick={() => handleRemove(c.id)}
                      style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#FFF0F0", cursor: "pointer", color: "#991B1B", fontSize: 10 }}>
                      削除
                    </button>
                  </div>
                </div>
                {/* 推薦文（既存機能そのまま） */}
                <div style={{ background: "#F7FAFF", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5" }}>推薦文</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!isEditingThisRec && (
                        <>
                          <button onClick={() => { setEditingRec(c.id); setRecText(c.recommendation ?? ""); }}
                            style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", cursor: "pointer" }}>
                            編集
                          </button>
                          <button onClick={() => handleGenerateRec(c.id)} disabled={generating === c.id}
                            style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", cursor: generating === c.id ? "wait" : "pointer" }}>
                            {generating === c.id ? "生成中..." : "AI生成"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {isEditingThisRec ? (
                    <div>
                      <textarea value={recText} onChange={(e) => setRecText(e.target.value)} rows={4}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 12, resize: "vertical", boxSizing: "border-box", marginBottom: 8 }} />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button onClick={() => setEditingRec(null)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", cursor: "pointer" }}>
                          キャンセル
                        </button>
                        <button onClick={() => handleSaveRec(c.id)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "#1A5BA6", color: "#fff", cursor: "pointer" }}>
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: c.recommendation ? "#0D2B5E" : "#9CAAB8", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {c.recommendation || "推薦文が未入力です。「編集」または「AI生成」で作成してください。"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 5: Entry Requests ─────────────────────────────────────────────────────

function EntryRequestsTab({ candidate, caId }: { candidate: Candidate; caId: string }) {
  const [entries, setEntries] = useState<EntryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ companyName: "", media: "", jobType: "", recommendation: "" });

  // ── Step3: 一括選択状態 ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // ── Step4: 推薦文編集状態（エントリーID単位） ──
  const [recEditing, setRecEditing] = useState<string | null>(null);
  const [recText, setRecText] = useState("");
  const [recGenerating, setRecGenerating] = useState<string | null>(null);
  const [recSaving, setRecSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchEntryRequestsByCandidateId(candidate.id).then((es) => {
      setEntries(es);
      setLoading(false);
    });
  }, [candidate.id]);

  // ── Step3: 一括エントリー依頼 ──
  const targetCompanies = candidate.targetCompanies ?? [];
  // すでに依頼済みの企業名セット（バッジ表示用）
  const submittedNames = new Set(entries.map((e) => e.companyName));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === targetCompanies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(targetCompanies.map((c) => c.id)));
    }
  };

  const handleBulkSubmit = async () => {
    const selected = targetCompanies.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    setBulkSubmitting(true);
    try {
      const created: EntryRequest[] = [];
      for (const company of selected) {
        const id = await addEntryRequest({
          caId,
          candidateId: candidate.id,
          candidateName: candidate.name,
          companyName: company.name,
          media: company.media ? [company.media] : [],
          jobType: company.jobType,
          minSales: company.minSales,
          maxSales: company.maxSales,
          status: "pending",
        });
        if (id) {
          created.push({
            id,
            caId,
            candidateId: candidate.id,
            candidateName: candidate.name,
            companyName: company.name,
            media: company.media ? [company.media] : [],
            jobType: company.jobType,
            minSales: company.minSales,
            maxSales: company.maxSales,
            status: "pending",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
      setEntries((prev) => [...created, ...prev]);
      setSelectedIds(new Set());
    } finally {
      setBulkSubmitting(false);
    }
  };

  // 既存の手動追加フォーム
  const handleSubmit = async () => {
    if (!form.companyName.trim()) return;
    setSubmitting(true);
    const id = await addEntryRequest({
      caId,
      candidateId: candidate.id,
      candidateName: candidate.name,
      companyName: form.companyName,
      media: form.media ? [form.media] : [],
      jobType: form.jobType || undefined,
      recommendation: form.recommendation || undefined,
      status: "pending",
    });
    if (id) {
      const newEntry: EntryRequest = {
        id,
        caId,
        candidateId: candidate.id,
        candidateName: candidate.name,
        companyName: form.companyName,
        media: form.media ? [form.media] : [],
        jobType: form.jobType || undefined,
        recommendation: form.recommendation || undefined,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setEntries((prev) => [newEntry, ...prev]);
    }
    setForm({ companyName: "", media: "", jobType: "", recommendation: "" });
    setShowForm(false);
    setSubmitting(false);
  };

  const handleStatusChange = async (id: string, status: EntryRequest["status"]) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
    await updateEntryStatus(id, status);
  };

  // ── Step4: 推薦文ハンドラー ──
  const handleGenerateRec = async (entry: EntryRequest) => {
    setRecGenerating(entry.id);
    try {
      const res = await fetch("/api/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName: candidate.name,
          companyName: entry.companyName,
          jobType: entry.jobType,
          age: candidate.age,
          education: candidate.education,
          currentIncome: candidate.currentIncome,
          desiredIncome: candidate.desiredIncome,
          desiredJobs: candidate.desiredJobs,
          memo: candidate.memo,
        }),
      });
      if (res.ok) {
        const { text } = await res.json();
        // 生成後は編集モードへ（自動保存しない）
        setRecText(text);
        setRecEditing(entry.id);
      } else {
        alert("推薦文の生成に失敗しました");
      }
    } catch {
      alert("推薦文の生成に失敗しました");
    } finally {
      setRecGenerating(null);
    }
  };

  const handleSaveRec = async (entryId: string) => {
    setRecSaving(entryId);
    try {
      const ok = await updateEntryRecommendation(entryId, recText);
      if (ok) {
        setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, recommendation: recText } : e));
        setRecEditing(null);
      } else {
        alert("保存に失敗しました");
      }
    } finally {
      setRecSaving(null);
    }
  };

  const targetCompanyNames = targetCompanies.map((c) => c.name);

  return (
    <div>
      {/* ── Step3: エントリー企業から一括依頼 ── */}
      {targetCompanies.length > 0 && (
        <div style={{ background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E" }}>エントリー企業から一括依頼</p>
            <button onClick={toggleSelectAll}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", cursor: "pointer" }}>
              {selectedIds.size === targetCompanies.length ? "全解除" : "全選択"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {targetCompanies.map((c) => {
              const checked = selectedIds.has(c.id);
              const alreadySubmitted = submittedNames.has(c.name);
              return (
                <label key={c.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: checked ? "#EBF5FF" : "#fff", border: `1px solid ${checked ? "#1A5BA6" : "#C8DFF5"}`, borderRadius: 8, cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSelect(c.id)} style={{ width: 15, height: 15, accentColor: "#1A5BA6", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0D2B5E" }}>{c.name}</span>
                      {alreadySubmitted && (
                        <span style={{ fontSize: 10, background: "#DCFCE7", color: "#166534", borderRadius: 10, padding: "1px 7px", fontWeight: 600 }}>依頼済</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                      {c.jobType && <span style={{ fontSize: 11, color: "#4A6FA5" }}>{c.jobType}</span>}
                      {c.media && <span style={{ fontSize: 11, background: "#EBF5FF", borderRadius: 4, padding: "0 5px", color: "#1A5BA6" }}>{c.media}</span>}
                      {(c.minSales || c.maxSales) && (
                        <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>{c.minSales ?? "—"}〜{c.maxSales ?? "—"}万円</span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button onClick={handleBulkSubmit} disabled={selectedIds.size === 0 || bulkSubmitting}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (selectedIds.size === 0 || bulkSubmitting) ? "not-allowed" : "pointer", opacity: (selectedIds.size === 0 || bulkSubmitting) ? 0.5 : 1 }}>
              <ClipboardList size={14} />
              {bulkSubmitting ? "送信中..." : `${selectedIds.size}社にエントリー依頼を送る`}
            </button>
          </div>
        </div>
      )}

      {/* ── 手動追加フォーム（既存機能そのまま） ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "#9CAAB8" }}>エントリー依頼一覧</p>
        <button onClick={() => setShowForm(!showForm)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: "#fff", color: "#0D2B5E", border: "1px solid #C8DFF5", cursor: "pointer" }}>
          <Plus size={13} /> 手動で追加
        </button>
      </div>

      {showForm && (
        <div style={{ background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>企業名 *</label>
              <input list="target-companies-list" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="企業名を入力または選択"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box" }} />
              <datalist id="target-companies-list">
                {targetCompanyNames.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>媒体</label>
              <select value={form.media} onChange={(e) => setForm({ ...form, media: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0D2B5E" }}>
                <option value="">選択...</option>
                {MEDIA_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>職種</label>
              <select value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value })}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, boxSizing: "border-box", background: "#fff", color: "#0D2B5E" }}>
                <option value="">選択...</option>
                {ENTRY_JOB_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={{ fontSize: 11, color: "#9CAAB8", display: "block", marginBottom: 4 }}>推薦文</label>
              <textarea value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} rows={3}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => setShowForm(false)}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", fontSize: 12, cursor: "pointer" }}>
              キャンセル
            </button>
            <button onClick={handleSubmit} disabled={submitting || !form.companyName.trim()}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: (submitting || !form.companyName.trim()) ? "not-allowed" : "pointer", opacity: (submitting || !form.companyName.trim()) ? 0.6 : 1 }}>
              {submitting ? "送信中..." : "依頼を追加"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9CAAB8" }}>読み込み中...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <p style={{ fontSize: 14, color: "#9CAAB8" }}>エントリー依頼がありません</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((e) => {
            const es = ENTRY_STATUS[e.status] ?? ENTRY_STATUS.pending;
            return (
              <div key={e.id} style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 2 }}>{e.companyName}</p>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {e.jobType && <span style={{ fontSize: 11, background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "1px 7px", color: "#4A6FA5" }}>{e.jobType}</span>}
                      {(e.media ?? []).map((m) => (
                        <span key={m} style={{ fontSize: 11, background: "#EBF5FF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "1px 6px", color: "#1A5BA6" }}>{m}</span>
                      ))}
                      <span style={{ fontSize: 11, color: "#9CAAB8" }}>{new Date(e.createdAt).toLocaleDateString("ja-JP")}</span>
                    </div>
                  </div>
                  <select value={e.status} onChange={(ev) => handleStatusChange(e.id, ev.target.value as EntryRequest["status"])}
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, border: `1px solid ${es.bg}`, background: es.bg, color: es.text, cursor: "pointer" }}>
                    {Object.entries(ENTRY_STATUS).map(([val, { label }]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                {/* ── Step4: 推薦文エリア ── */}
                <div style={{ marginTop: 10, background: "#F7FAFF", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5" }}>推薦文</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {recEditing !== e.id && (
                        <>
                          {e.recommendation && (
                            <button
                              onClick={() => { setRecText(e.recommendation ?? ""); setRecEditing(e.id); }}
                              style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", cursor: "pointer" }}>
                              編集
                            </button>
                          )}
                          <button
                            onClick={() => handleGenerateRec(e)}
                            disabled={recGenerating === e.id}
                            style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, border: "none", background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", cursor: recGenerating === e.id ? "wait" : "pointer", opacity: recGenerating === e.id ? 0.7 : 1 }}>
                            {recGenerating === e.id ? "生成中..." : e.recommendation ? "再生成" : "AI生成"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {recEditing === e.id ? (
                    <div>
                      <textarea
                        value={recText}
                        onChange={(ev) => setRecText(ev.target.value)}
                        rows={4}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 12, resize: "vertical", boxSizing: "border-box", marginBottom: 8 }}
                      />
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setRecEditing(null)}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", cursor: "pointer" }}>
                          キャンセル
                        </button>
                        <button
                          onClick={() => handleSaveRec(e.id)}
                          disabled={recSaving === e.id || !recText.trim()}
                          style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "none", background: "#1A5BA6", color: "#fff", cursor: (recSaving === e.id || !recText.trim()) ? "not-allowed" : "pointer", opacity: (recSaving === e.id || !recText.trim()) ? 0.6 : 1 }}>
                          {recSaving === e.id ? "保存中..." : "保存"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: e.recommendation ? "#0D2B5E" : "#9CAAB8", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {e.recommendation || "推薦文が未作成です。「AI生成」で作成してください。"}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "basic",    label: "👤 基本情報" },
  { id: "feedback", label: "🗂 面談履歴" },
  { id: "docs",     label: "📄 書類" },
  { id: "companies",label: "🏢 エントリー企業" },
  { id: "entries",  label: "📋 エントリー依頼" },
];

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.candidateId as string;
  const caId = params?.id as string;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    if (!candidateId) {
      setError("IDが取得できませんでした");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const fetchCandidate = async () => {
      try {
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("id", candidateId)
          .maybeSingle();

        if (error) {
          console.error("fetch error:", error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (!data) {
          setError("求職者が見つかりません");
          setLoading(false);
          return;
        }

        setCandidate(mapDbCandidateToApp(data as Record<string, unknown>));
        setLoading(false);
      } catch (e) {
        console.error("unexpected error:", e);
        setError("予期しないエラーが発生しました");
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [candidateId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#9CAAB8", fontSize: 14 }}>
      読み込み中...
    </div>
  );

  if (error) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: "#991B1B", marginBottom: 12 }}>エラー：{error}</p>
      <button onClick={() => router.back()}
        style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", cursor: "pointer" }}>
        戻る
      </button>
    </div>
  );

  if (!candidate) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: "#991B1B", marginBottom: 12 }}>求職者が見つかりません（ID: {candidateId}）</p>
      <button onClick={() => router.back()}
        style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #C8DFF5", background: "#fff", color: "#4A6FA5", cursor: "pointer" }}>
        戻る
      </button>
    </div>
  );

  const rs = READING_STYLE[candidate.reading] ?? READING_STYLE.G;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link href={`/ca-management/${caId}`}
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#9CAAB8", fontSize: 12, textDecoration: "none", padding: "4px 8px", borderRadius: 6, border: "1px solid #E8F2FC", background: "#fff" }}>
          <ChevronLeft size={14} /> 戻る
        </Link>
        <span style={{ fontSize: 10, color: "#C8DFF5" }}>|</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#0D2B5E" }}>{candidate.name}</span>
        <span style={{ fontSize: 12, fontWeight: 800, padding: "2px 10px", borderRadius: 12, background: rs.bg, color: rs.text }}>{candidate.reading}</span>
        <span style={{ fontSize: 11, background: "#E8F2FC", color: "#1A5BA6", borderRadius: 8, padding: "2px 8px" }}>{candidate.phase}</span>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, overflowX: "auto", background: "#F7FAFF", borderRadius: 12, padding: 4 }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: activeTab === t.id ? 700 : 400,
              border: "none", background: activeTab === t.id ? "#fff" : "transparent",
              color: activeTab === t.id ? "#0D2B5E" : "#9CAAB8",
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: activeTab === t.id ? "0 1px 4px rgba(13,43,94,0.1)" : "none",
              transition: "all 0.15s",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "basic" && (
        <BasicInfoTab candidate={candidate} onUpdate={setCandidate} />
      )}
      {activeTab === "feedback" && (
        <FeedbackHistoryTab candidateId={candidateId} candidateName={candidate.name} caId={caId} />
      )}
      {activeTab === "docs" && (
        <DocumentsTab candidateName={candidate.name} caId={caId} candidateId={candidateId} />
      )}
      {activeTab === "companies" && (
        <TargetCompaniesTab candidate={candidate} onUpdate={setCandidate} />
      )}
      {activeTab === "entries" && (
        <EntryRequestsTab candidate={candidate} caId={caId} />
      )}
    </div>
  );
}

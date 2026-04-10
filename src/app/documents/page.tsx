"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Briefcase, Target, ChevronDown, Printer, Sparkles, X, Search, Plus, Trash2 } from "lucide-react";
import { fetchFeedbackSessions } from "@/lib/db";
import { FeedbackSession } from "@/types";

// ── Auto-fill field style ─────────────────────────────────────────────────────
const autoStyle: React.CSSProperties = {
  border: "2px solid #3B8FD4",
  background: "#EBF5FF",
  borderRadius: 6,
  padding: "6px 10px",
  width: "100%",
  fontSize: 13,
  color: "#0D2B5E",
};

const normalStyle: React.CSSProperties = {
  border: "1px solid #C8DFF5",
  background: "#fff",
  borderRadius: 6,
  padding: "6px 10px",
  width: "100%",
  fontSize: 13,
  color: "#0D2B5E",
};

function AutoBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 10,
        color: "#3B8FD4",
        background: "#EBF5FF",
        border: "1px solid #C8DFF5",
        borderRadius: 4,
        padding: "1px 6px",
        marginLeft: 6,
        fontWeight: 600,
      }}
    >
      ✦ 自動入力済み・上書き可能
    </span>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  auto,
  placeholder,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  auto?: boolean;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const style = auto ? autoStyle : normalStyle;
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>
        {label}
        {auto && <AutoBadge />}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows ?? 3}
          style={{ ...style, resize: "vertical" }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={style}
        />
      )}
    </div>
  );
}

// ── Candidate Selection Modal ─────────────────────────────────────────────────
function CandidateModal({
  sessions,
  onSelect,
  onClose,
}: {
  sessions: FeedbackSession[];
  onSelect: (session: FeedbackSession) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = sessions.filter(
    (s) =>
      s.candidateName.includes(search) ||
      s.staffName.includes(search)
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          width: 520,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #E8F2FC",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontWeight: 700, fontSize: 15, color: "#0D2B5E" }}>
            候補者を選択
          </p>
          <button onClick={onClose} style={{ color: "#9CAAB8" }}>
            <X size={18} />
          </button>
        </div>
        {/* Search */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #E8F2FC" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "#9CAAB8" }} />
            <input
              type="text"
              placeholder="候補者名・担当者名で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 10px 7px 30px",
                border: "1px solid #C8DFF5",
                borderRadius: 6,
                fontSize: 13,
                color: "#0D2B5E",
                outline: "none",
              }}
            />
          </div>
        </div>
        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ padding: 24, textAlign: "center", color: "#9CAAB8", fontSize: 13 }}>
              該当する面談が見つかりません
            </p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => { onSelect(s); onClose(); }}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  borderBottom: "1px solid #F0F7FF",
                  textAlign: "left",
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F7FAFF")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#E8F2FC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "#3B8FD4",
                    flexShrink: 0,
                  }}
                >
                  {s.candidateName[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, color: "#0D2B5E" }}>{s.candidateName}</p>
                  <p style={{ fontSize: 11, color: "#9CAAB8", marginTop: 1 }}>
                    {s.meetingDate} · {s.meetingType} · 担当: {s.staffName}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Resume types ──────────────────────────────────────────────────────────────
interface ResumeData {
  furigana: string;
  birthdate: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  education: { year: string; month: string; school: string; faculty: string; type: string }[];
  workHistory: { year: string; month: string; company: string; detail: string; type: string }[];
  licenses: { year: string; month: string; name: string }[];
  motivation: string;
  selfPR: string;
  hobbies: string;
  commute: string;
  dependents: string;
  spouse: string;
  spouseDependency: string;
}

function emptyResume(): ResumeData {
  return {
    furigana: "", birthdate: "", gender: "", address: "",
    phone: "", email: "",
    education: [{ year: "", month: "", school: "", faculty: "", type: "卒業" }],
    workHistory: [{ year: "", month: "", company: "", detail: "", type: "入社" }],
    licenses: [{ year: "", month: "", name: "" }],
    motivation: "", selfPR: "", hobbies: "",
    commute: "", dependents: "", spouse: "", spouseDependency: "",
  };
}

// ── Career types ──────────────────────────────────────────────────────────────
interface CareerPosition {
  title: string;
  period: string;
  description: string;
  achievements: string;
}
interface CareerCompany {
  name: string;
  industry: string;
  employees: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  positions: CareerPosition[];
}
interface CareerData {
  summary: string;
  companies: CareerCompany[];
  skills: { technical: string[]; language: string[]; other: string[] };
  pr: string;
}

function emptyCareer(): CareerData {
  return {
    summary: "",
    companies: [{
      name: "", industry: "", employees: "",
      startYear: "", startMonth: "", endYear: "", endMonth: "",
      positions: [{ title: "", period: "", description: "", achievements: "" }],
    }],
    skills: { technical: [], language: [], other: [] },
    pr: "",
  };
}

// ── Interview types ───────────────────────────────────────────────────────────
interface InterviewQuestion {
  number: number;
  category: string;
  question: string;
  answer: string;
  tip: string;
}

// ── Resume Tab ────────────────────────────────────────────────────────────────
function ResumeTab({ session }: { session: FeedbackSession | null }) {
  const [resume, setResume] = useState<ResumeData>(emptyResume());
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const set = (field: keyof ResumeData) => (v: string) =>
    setResume((r) => ({ ...r, [field]: v }));

  async function generate() {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "resume",
          candidateName: session.candidateName,
          transcript: session.transcript,
        }),
      });
      const json = await res.json();
      if (json.data) {
        const d: ResumeData = json.data;
        setResume((prev) => ({
          ...prev,
          furigana: d.furigana || prev.furigana,
          birthdate: d.birthdate || prev.birthdate,
          gender: d.gender || prev.gender,
          address: d.address || prev.address,
          phone: d.phone || prev.phone,
          email: d.email || prev.email,
          education: d.education?.length ? d.education : prev.education,
          workHistory: d.workHistory?.length ? d.workHistory : prev.workHistory,
          licenses: d.licenses?.length ? d.licenses : prev.licenses,
          motivation: d.motivation || prev.motivation,
          selfPR: d.selfPR || prev.selfPR,
          hobbies: d.hobbies || prev.hobbies,
          commute: d.commute || prev.commute,
          dependents: d.dependents || prev.dependents,
          spouse: d.spouse || prev.spouse,
          spouseDependency: d.spouseDependency || prev.spouseDependency,
        }));
        const filled = new Set<string>(
          Object.entries(d)
            .filter(([, v]) => v && (typeof v === "string" ? v !== "" : (v as unknown[]).length > 0))
            .map(([k]) => k)
        );
        setAutoFields(filled);
      }
    } finally {
      setLoading(false);
    }
  }

  const isAuto = (f: string) => autoFields.has(f);

  return (
    <div>
      {/* Action bar */}
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={generate}
          disabled={!session || loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: session ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0",
            color: session ? "#fff" : "#9CAAB8",
            border: "none", cursor: session ? "pointer" : "not-allowed",
            transition: "opacity 0.15s",
          }}
        >
          <Sparkles size={14} />
          {loading ? "生成中..." : "AI自動入力"}
        </button>
        <button
          onClick={() => window.print()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "#fff", color: "#0D2B5E",
            border: "1px solid #C8DFF5", cursor: "pointer",
          }}
        >
          <Printer size={14} />
          PDF印刷
        </button>
      </div>

      {/* Form */}
      <div
        className="print-full-width"
        style={{
          background: "#fff",
          border: "1px solid #C8DFF5",
          borderRadius: 10,
          padding: 24,
          maxWidth: 860,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0D2B5E", textAlign: "center", marginBottom: 20, borderBottom: "2px solid #0D2B5E", paddingBottom: 12 }}>
          履　歴　書
        </h2>
        <p style={{ fontSize: 10, color: "#9CAAB8", textAlign: "right", marginBottom: 12 }}>
          （厚生労働省様式）
        </p>

        {/* Basic info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <Field label="氏名（漢字）" value={session?.candidateName ?? ""} onChange={() => {}} auto={false} placeholder="山田 太郎" />
          <Field label="ふりがな" value={resume.furigana} onChange={set("furigana")} auto={isAuto("furigana")} placeholder="やまだ たろう" />
          <Field label="生年月日" value={resume.birthdate} onChange={set("birthdate")} auto={isAuto("birthdate")} placeholder="1990-01-01" />
          <Field label="性別" value={resume.gender} onChange={set("gender")} auto={isAuto("gender")} placeholder="男・女・その他" />
        </div>
        <Field label="現住所" value={resume.address} onChange={set("address")} auto={isAuto("address")} placeholder="東京都渋谷区..." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="電話番号" value={resume.phone} onChange={set("phone")} auto={isAuto("phone")} placeholder="090-0000-0000" />
          <Field label="メールアドレス" value={resume.email} onChange={set("email")} auto={isAuto("email")} placeholder="example@email.com" />
        </div>

        {/* Education */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginTop: 20, marginBottom: 10, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>
          学歴
          {isAuto("education") && <AutoBadge />}
        </h3>
        {resume.education.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 50px 1fr 1fr 80px", gap: 6, marginBottom: 6, alignItems: "start" }}>
            <input value={e.year} onChange={(ev) => {
              const ed = [...resume.education]; ed[i] = { ...ed[i], year: ev.target.value };
              setResume((r) => ({ ...r, education: ed }));
            }} placeholder="年" style={isAuto("education") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={e.month} onChange={(ev) => {
              const ed = [...resume.education]; ed[i] = { ...ed[i], month: ev.target.value };
              setResume((r) => ({ ...r, education: ed }));
            }} placeholder="月" style={isAuto("education") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={e.school} onChange={(ev) => {
              const ed = [...resume.education]; ed[i] = { ...ed[i], school: ev.target.value };
              setResume((r) => ({ ...r, education: ed }));
            }} placeholder="学校名" style={isAuto("education") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={e.faculty} onChange={(ev) => {
              const ed = [...resume.education]; ed[i] = { ...ed[i], faculty: ev.target.value };
              setResume((r) => ({ ...r, education: ed }));
            }} placeholder="学部・学科" style={isAuto("education") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={e.type} onChange={(ev) => {
              const ed = [...resume.education]; ed[i] = { ...ed[i], type: ev.target.value };
              setResume((r) => ({ ...r, education: ed }));
            }} placeholder="入学/卒業" style={isAuto("education") ? { ...autoStyle } : { ...normalStyle }} />
          </div>
        ))}
        <button className="no-print" onClick={() =>
          setResume((r) => ({ ...r, education: [...r.education, { year: "", month: "", school: "", faculty: "", type: "卒業" }] }))
        } style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <Plus size={12} /> 追加
        </button>

        {/* Work History */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginTop: 16, marginBottom: 10, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>
          職歴
          {isAuto("workHistory") && <AutoBadge />}
        </h3>
        {resume.workHistory.map((w, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 50px 1fr 1fr 80px 32px", gap: 6, marginBottom: 6, alignItems: "start" }}>
            <input value={w.year} onChange={(ev) => {
              const wh = [...resume.workHistory]; wh[i] = { ...wh[i], year: ev.target.value };
              setResume((r) => ({ ...r, workHistory: wh }));
            }} placeholder="年" style={isAuto("workHistory") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={w.month} onChange={(ev) => {
              const wh = [...resume.workHistory]; wh[i] = { ...wh[i], month: ev.target.value };
              setResume((r) => ({ ...r, workHistory: wh }));
            }} placeholder="月" style={isAuto("workHistory") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={w.company} onChange={(ev) => {
              const wh = [...resume.workHistory]; wh[i] = { ...wh[i], company: ev.target.value };
              setResume((r) => ({ ...r, workHistory: wh }));
            }} placeholder="会社名" style={isAuto("workHistory") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={w.detail} onChange={(ev) => {
              const wh = [...resume.workHistory]; wh[i] = { ...wh[i], detail: ev.target.value };
              setResume((r) => ({ ...r, workHistory: wh }));
            }} placeholder="業務内容" style={isAuto("workHistory") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={w.type} onChange={(ev) => {
              const wh = [...resume.workHistory]; wh[i] = { ...wh[i], type: ev.target.value };
              setResume((r) => ({ ...r, workHistory: wh }));
            }} placeholder="入社/退社" style={isAuto("workHistory") ? { ...autoStyle } : { ...normalStyle }} />
            <button className="no-print" onClick={() =>
              setResume((r) => ({ ...r, workHistory: r.workHistory.filter((_, j) => j !== i) }))
            } style={{ background: "none", border: "none", cursor: "pointer", color: "#F87171", padding: 4, display: "flex", alignItems: "center" }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button className="no-print" onClick={() =>
          setResume((r) => ({ ...r, workHistory: [...r.workHistory, { year: "", month: "", company: "", detail: "", type: "入社" }] }))
        } style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <Plus size={12} /> 追加
        </button>

        {/* Licenses */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginTop: 16, marginBottom: 10, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>
          資格・免許
          {isAuto("licenses") && <AutoBadge />}
        </h3>
        {resume.licenses.map((l, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 50px 1fr 32px", gap: 6, marginBottom: 6 }}>
            <input value={l.year} onChange={(ev) => {
              const ls = [...resume.licenses]; ls[i] = { ...ls[i], year: ev.target.value };
              setResume((r) => ({ ...r, licenses: ls }));
            }} placeholder="年" style={isAuto("licenses") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={l.month} onChange={(ev) => {
              const ls = [...resume.licenses]; ls[i] = { ...ls[i], month: ev.target.value };
              setResume((r) => ({ ...r, licenses: ls }));
            }} placeholder="月" style={isAuto("licenses") ? { ...autoStyle } : { ...normalStyle }} />
            <input value={l.name} onChange={(ev) => {
              const ls = [...resume.licenses]; ls[i] = { ...ls[i], name: ev.target.value };
              setResume((r) => ({ ...r, licenses: ls }));
            }} placeholder="資格・免許名" style={isAuto("licenses") ? { ...autoStyle } : { ...normalStyle }} />
            <button className="no-print" onClick={() =>
              setResume((r) => ({ ...r, licenses: r.licenses.filter((_, j) => j !== i) }))
            } style={{ background: "none", border: "none", cursor: "pointer", color: "#F87171", padding: 4, display: "flex", alignItems: "center" }}>
              <Trash2 size={12} />
            </button>
          </div>
        ))}
        <button className="no-print" onClick={() =>
          setResume((r) => ({ ...r, licenses: [...r.licenses, { year: "", month: "", name: "" }] }))
        } style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
          <Plus size={12} /> 追加
        </button>

        {/* Motivation / PR */}
        <Field label="志望動機" value={resume.motivation} onChange={set("motivation")} auto={isAuto("motivation")} multiline rows={4} placeholder="志望動機を入力..." />
        <Field label="自己PR" value={resume.selfPR} onChange={set("selfPR")} auto={isAuto("selfPR")} multiline rows={4} placeholder="自己PRを入力..." />
        <Field label="趣味・特技" value={resume.hobbies} onChange={set("hobbies")} auto={isAuto("hobbies")} placeholder="読書、スポーツ等" />

        {/* Misc */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 8 }}>
          <Field label="通勤時間（分）" value={resume.commute} onChange={set("commute")} auto={isAuto("commute")} placeholder="30" />
          <Field label="扶養家族数" value={resume.dependents} onChange={set("dependents")} auto={isAuto("dependents")} placeholder="0" />
          <Field label="配偶者" value={resume.spouse} onChange={set("spouse")} auto={isAuto("spouse")} placeholder="有・無" />
          <Field label="配偶者の扶養義務" value={resume.spouseDependency} onChange={set("spouseDependency")} auto={isAuto("spouseDependency")} placeholder="有・無" />
        </div>
      </div>
    </div>
  );
}

// ── Career Tab ────────────────────────────────────────────────────────────────
function CareerTab({ session }: { session: FeedbackSession | null }) {
  const [career, setCareer] = useState<CareerData>(emptyCareer());
  const [autoFilled, setAutoFilled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "career",
          candidateName: session.candidateName,
          transcript: session.transcript,
        }),
      });
      const json = await res.json();
      if (json.data) {
        const d: CareerData = json.data;
        setCareer({
          summary: d.summary || "",
          companies: d.companies?.length ? d.companies : emptyCareer().companies,
          skills: d.skills || { technical: [], language: [], other: [] },
          pr: d.pr || "",
        });
        setAutoFilled(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function updateCompany(i: number, field: keyof CareerCompany, v: string) {
    const cs = [...career.companies];
    cs[i] = { ...cs[i], [field]: v };
    setCareer((c) => ({ ...c, companies: cs }));
  }

  function updatePosition(ci: number, pi: number, field: keyof CareerPosition, v: string) {
    const cs = [...career.companies];
    const pos = [...cs[ci].positions];
    pos[pi] = { ...pos[pi], [field]: v };
    cs[ci] = { ...cs[ci], positions: pos };
    setCareer((c) => ({ ...c, companies: cs }));
  }

  function addCompany() {
    setCareer((c) => ({
      ...c,
      companies: [...c.companies, {
        name: "", industry: "", employees: "",
        startYear: "", startMonth: "", endYear: "", endMonth: "",
        positions: [{ title: "", period: "", description: "", achievements: "" }],
      }],
    }));
  }

  function removeCompany(i: number) {
    setCareer((c) => ({ ...c, companies: c.companies.filter((_, j) => j !== i) }));
  }

  function addPosition(ci: number) {
    const cs = [...career.companies];
    cs[ci] = { ...cs[ci], positions: [...cs[ci].positions, { title: "", period: "", description: "", achievements: "" }] };
    setCareer((c) => ({ ...c, companies: cs }));
  }

  const fieldStyle = (auto: boolean) => auto ? autoStyle : normalStyle;

  return (
    <div>
      {/* Action bar */}
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={generate}
          disabled={!session || loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: session ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0",
            color: session ? "#fff" : "#9CAAB8",
            border: "none", cursor: session ? "pointer" : "not-allowed",
          }}
        >
          <Sparkles size={14} />
          {loading ? "生成中..." : "AI自動入力"}
        </button>
        <button
          onClick={() => window.print()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "#fff", color: "#0D2B5E",
            border: "1px solid #C8DFF5", cursor: "pointer",
          }}
        >
          <Printer size={14} />
          PDF印刷
        </button>
      </div>

      <div
        className="print-full-width"
        style={{
          background: "#fff",
          border: "1px solid #C8DFF5",
          borderRadius: 10,
          padding: 24,
          maxWidth: 860,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0D2B5E", textAlign: "center", marginBottom: 20, borderBottom: "2px solid #0D2B5E", paddingBottom: 12 }}>
          職 務 経 歴 書
        </h2>
        <p style={{ fontSize: 11, color: "#9CAAB8", marginBottom: 16 }}>
          作成日: {new Date().toLocaleDateString("ja-JP")} &nbsp;|&nbsp; 氏名: {session?.candidateName ?? "—"}
        </p>

        {/* Summary */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 8, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>
          職務要約
          {autoFilled && <AutoBadge />}
        </h3>
        <textarea
          value={career.summary}
          onChange={(e) => setCareer((c) => ({ ...c, summary: e.target.value }))}
          rows={4}
          placeholder="職務要約を入力..."
          style={{ ...fieldStyle(autoFilled), resize: "vertical", marginBottom: 20 }}
        />

        {/* Companies */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 12, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>
          職務経歴
          {autoFilled && <AutoBadge />}
        </h3>
        {career.companies.map((co, ci) => (
          <div
            key={ci}
            style={{
              border: "1px solid #C8DFF5",
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
              background: "#F7FAFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E" }}>
                会社 {ci + 1}
              </span>
              <button className="no-print" onClick={() => removeCompany(ci)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F87171", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                <Trash2 size={12} /> 削除
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>会社名</label>
                <input value={co.name} onChange={(e) => updateCompany(ci, "name", e.target.value)} placeholder="株式会社..." style={fieldStyle(autoFilled)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>業種</label>
                <input value={co.industry} onChange={(e) => updateCompany(ci, "industry", e.target.value)} placeholder="IT・人材等" style={fieldStyle(autoFilled)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>従業員数</label>
                <input value={co.employees} onChange={(e) => updateCompany(ci, "employees", e.target.value)} placeholder="100名" style={fieldStyle(autoFilled)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>在籍期間</label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input value={co.startYear} onChange={(e) => updateCompany(ci, "startYear", e.target.value)} placeholder="入社年" style={{ ...fieldStyle(autoFilled), width: 70 }} />
                  <span style={{ fontSize: 11, color: "#9CAAB8" }}>年</span>
                  <input value={co.startMonth} onChange={(e) => updateCompany(ci, "startMonth", e.target.value)} placeholder="月" style={{ ...fieldStyle(autoFilled), width: 50 }} />
                  <span style={{ fontSize: 11, color: "#9CAAB8" }}>〜</span>
                  <input value={co.endYear} onChange={(e) => updateCompany(ci, "endYear", e.target.value)} placeholder="退社年" style={{ ...fieldStyle(autoFilled), width: 70 }} />
                  <span style={{ fontSize: 11, color: "#9CAAB8" }}>年</span>
                  <input value={co.endMonth} onChange={(e) => updateCompany(ci, "endMonth", e.target.value)} placeholder="月" style={{ ...fieldStyle(autoFilled), width: 50 }} />
                </div>
              </div>
            </div>

            {/* Positions */}
            {co.positions.map((pos, pi) => (
              <div key={pi} style={{ background: "#fff", border: "1px solid #E8F2FC", borderRadius: 6, padding: 12, marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#3B8FD4", marginBottom: 8 }}>ポジション {pi + 1}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>役職</label>
                    <input value={pos.title} onChange={(e) => updatePosition(ci, pi, "title", e.target.value)} placeholder="営業・リーダー等" style={fieldStyle(autoFilled)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>期間</label>
                    <input value={pos.period} onChange={(e) => updatePosition(ci, pi, "period", e.target.value)} placeholder="2020年4月〜現在" style={fieldStyle(autoFilled)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>業務内容</label>
                  <textarea value={pos.description} onChange={(e) => updatePosition(ci, pi, "description", e.target.value)} rows={3} placeholder="業務内容を入力..." style={{ ...fieldStyle(autoFilled), resize: "vertical", marginBottom: 8 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>実績・成果</label>
                  <textarea value={pos.achievements} onChange={(e) => updatePosition(ci, pi, "achievements", e.target.value)} rows={2} placeholder="売上目標達成率120%等..." style={{ ...fieldStyle(autoFilled), resize: "vertical" }} />
                </div>
              </div>
            ))}
            <button className="no-print" onClick={() => addPosition(ci)} style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <Plus size={12} /> ポジション追加
            </button>
          </div>
        ))}
        <button className="no-print" onClick={addCompany} style={{ fontSize: 12, color: "#3B8FD4", background: "#EBF5FF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
          <Plus size={12} /> 会社を追加
        </button>

        {/* Skills */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 8, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>
          スキル・資格
          {autoFilled && <AutoBadge />}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {(["technical", "language", "other"] as const).map((cat) => (
            <div key={cat}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>
                {cat === "technical" ? "技術・ツール" : cat === "language" ? "語学" : "その他"}
              </label>
              <textarea
                value={career.skills[cat].join("\n")}
                onChange={(e) =>
                  setCareer((c) => ({
                    ...c,
                    skills: { ...c.skills, [cat]: e.target.value.split("\n").filter(Boolean) },
                  }))
                }
                rows={4}
                placeholder="1行1スキル"
                style={{ ...fieldStyle(autoFilled), resize: "vertical" }}
              />
            </div>
          ))}
        </div>

        {/* PR */}
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 8, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>
          自己PR
          {autoFilled && <AutoBadge />}
        </h3>
        <textarea
          value={career.pr}
          onChange={(e) => setCareer((c) => ({ ...c, pr: e.target.value }))}
          rows={6}
          placeholder="自己PRを入力..."
          style={{ ...fieldStyle(autoFilled), resize: "vertical" }}
        />
      </div>
    </div>
  );
}

// ── Interview Tab ─────────────────────────────────────────────────────────────
const INDUSTRIES = [
  "IT・通信", "人材・採用", "金融・保険", "コンサルティング", "製造業",
  "医療・製薬", "不動産・建設", "小売・流通", "広告・メディア", "教育",
  "公務・非営利", "その他",
];
const JOB_TYPES = [
  "営業", "エンジニア", "マーケティング", "経営企画", "人事・総務",
  "経理・財務", "カスタマーサポート", "コンサルタント", "デザイナー",
  "プロジェクトマネージャー", "その他",
];

function InterviewTab({ session }: { session: FeedbackSession | null }) {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [jobType, setJobType] = useState(JOB_TYPES[0]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  async function generate() {
    if (!session) return;
    setLoading(true);
    setQuestions([]);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "interview",
          candidateName: session.candidateName,
          transcript: session.transcript,
          industry,
          jobType,
        }),
      });
      const json = await res.json();
      if (json.data?.questions) {
        setQuestions(json.data.questions);
        setExpanded(new Set(json.data.questions.map((q: InterviewQuestion) => q.number)));
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(n: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  }

  const CATEGORY_COLORS: Record<string, string> = {
    "自己紹介": "#3B8FD4",
    "志望動機": "#8B5CF6",
    "強み": "#10B981",
    "弱み": "#F59E0B",
    "経験": "#0D2B5E",
    "転職理由": "#EF4444",
    "将来像": "#06B6D4",
  };
  function getCategoryColor(cat: string) {
    for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
      if (cat.includes(k)) return v;
    }
    return "#3B8FD4";
  }

  return (
    <div>
      {/* Controls */}
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>業界</label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={{ ...normalStyle, width: 160 }}
          >
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>職種</label>
          <select
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
            style={{ ...normalStyle, width: 180 }}
          >
            {JOB_TYPES.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button
            onClick={generate}
            disabled={!session || loading}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: session ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0",
              color: session ? "#fff" : "#9CAAB8",
              border: "none", cursor: session ? "pointer" : "not-allowed",
            }}
          >
            <Sparkles size={14} />
            {loading ? "生成中..." : "Q&A生成"}
          </button>
          {questions.length > 0 && (
            <button
              onClick={() => window.print()}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "#fff", color: "#0D2B5E",
                border: "1px solid #C8DFF5", cursor: "pointer",
              }}
            >
              <Printer size={14} />
              PDF印刷
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#3B8FD4", fontSize: 13 }}>
          <Sparkles size={18} style={{ display: "inline-block", marginBottom: 8, animation: "spin 1s linear infinite" }} />
          <p>面接対策Q&Aを生成しています...</p>
        </div>
      )}

      {questions.length > 0 && (
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#4A6FA5" }}>
              <strong style={{ color: "#0D2B5E" }}>{session?.candidateName}</strong> さんの面接対策 &mdash; {industry} / {jobType}
            </p>
            <span style={{ fontSize: 12, color: "#9CAAB8" }}>{questions.length}問</span>
          </div>
          {questions.map((q) => (
            <div
              key={q.number}
              style={{
                background: "#F7FAFF",
                border: "1px solid #C8DFF5",
                borderRadius: 10,
                marginBottom: 12,
                overflow: "hidden",
              }}
            >
              {/* Question header */}
              <button
                onClick={() => toggleExpand(q.number)}
                style={{
                  width: "100%",
                  padding: "14px 18px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: getCategoryColor(q.category),
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {q.number}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: getCategoryColor(q.category),
                    background: `${getCategoryColor(q.category)}18`,
                    padding: "2px 8px",
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                >
                  {q.category}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0D2B5E" }}>
                  {q.question}
                </span>
                <ChevronDown
                  size={16}
                  style={{
                    color: "#9CAAB8",
                    flexShrink: 0,
                    transform: expanded.has(q.number) ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>

              {/* Expanded content */}
              {expanded.has(q.number) && (
                <div style={{ padding: "0 18px 16px", borderTop: "1px solid #E8F2FC" }}>
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#3B8FD4", marginBottom: 6 }}>模範回答</p>
                    <p style={{ fontSize: 13, color: "#1A2B4A", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {q.answer}
                    </p>
                  </div>
                  {q.tip && (
                    <div
                      style={{
                        marginTop: 12,
                        background: "#FFF9E6",
                        border: "1px solid #FCD34D",
                        borderRadius: 6,
                        padding: "8px 12px",
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <span style={{ fontSize: 14 }}>💡</span>
                      <p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>{q.tip}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!session && !loading && questions.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            background: "#F7FAFF",
            border: "1px dashed #C8DFF5",
            borderRadius: 12,
            maxWidth: 500,
          }}
        >
          <Target size={32} style={{ color: "#C8DFF5", marginBottom: 12, display: "inline-block" }} />
          <p style={{ fontSize: 14, color: "#9CAAB8", fontWeight: 600 }}>候補者を選択してQ&Aを生成</p>
          <p style={{ fontSize: 12, color: "#BDD0E6", marginTop: 6 }}>
            上の「候補者選択」から面談を選んでください
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page inner ───────────────────────────────────────────────────────────
type TabType = "resume" | "career" | "interview";

function DocumentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") as TabType) ?? "resume";
  const candidateParam = searchParams.get("candidate");

  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<FeedbackSession | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchFeedbackSessions().then(setSessions);
  }, []);

  useEffect(() => {
    if (candidateParam && sessions.length > 0) {
      const found = sessions.find((s) => s.id === candidateParam);
      if (found) setSelectedSession(found);
    }
  }, [candidateParam, sessions]);

  function selectTab(t: TabType) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.push(`/documents?${params.toString()}`);
  }

  function handleSelectCandidate(s: FeedbackSession) {
    setSelectedSession(s);
    const params = new URLSearchParams(searchParams.toString());
    params.set("candidate", s.id);
    router.push(`/documents?${params.toString()}`);
  }

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "resume", label: "履歴書", icon: <FileText size={14} /> },
    { key: "career", label: "職務経歴書", icon: <Briefcase size={14} /> },
    { key: "interview", label: "面接対策", icon: <Target size={14} /> },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F7FC",
        padding: "28px 28px 60px",
      }}
    >
      {/* Header */}
      <div className="no-print" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D2B5E", marginBottom: 4 }}>
          書類作成
        </h1>
        <p style={{ fontSize: 13, color: "#4A6FA5" }}>
          面談データをもとに履歴書・職務経歴書・面接対策シートをAI自動生成します
        </p>
      </div>

      {/* Candidate selector */}
      <div
        className="no-print"
        style={{
          background: "#fff",
          border: "1px solid #C8DFF5",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 600, color: "#4A6FA5", flexShrink: 0 }}>候補者</p>
        {selectedSession ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#EBF5FF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#3B8FD4",
              }}
            >
              {selectedSession.candidateName[0]}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E" }}>{selectedSession.candidateName}</p>
              <p style={{ fontSize: 11, color: "#9CAAB8" }}>
                {selectedSession.meetingDate} · {selectedSession.meetingType} · 担当: {selectedSession.staffName}
              </p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#9CAAB8", flex: 1 }}>候補者が選択されていません</p>
        )}
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: "7px 14px",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {selectedSession ? "変更" : "選択"}
        </button>
      </div>

      {/* Tabs */}
      <div
        className="no-print"
        style={{
          display: "flex",
          gap: 4,
          background: "#E8F2FC",
          borderRadius: 10,
          padding: 4,
          width: "fit-content",
          marginBottom: 24,
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 7,
              fontSize: 13,
              fontWeight: tabParam === t.key ? 700 : 500,
              background: tabParam === t.key ? "#fff" : "transparent",
              color: tabParam === t.key ? "#0D2B5E" : "#4A6FA5",
              border: "none",
              cursor: "pointer",
              boxShadow: tabParam === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tabParam === "resume" && <ResumeTab session={selectedSession} />}
      {tabParam === "career" && <CareerTab session={selectedSession} />}
      {tabParam === "interview" && <InterviewTab session={selectedSession} />}

      {/* Modal */}
      {showModal && (
        <CandidateModal
          sessions={sessions}
          onSelect={handleSelectCandidate}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ── Export with Suspense ──────────────────────────────────────────────────────
export default function DocumentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#9CAAB8", fontSize: 13 }}>読み込み中...</div>}>
      <DocumentsPageInner />
    </Suspense>
  );
}

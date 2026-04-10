"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FileText, Briefcase, Target, ChevronDown, Printer, Sparkles,
  X, Search, Plus, Trash2, FolderOpen, Upload, Save, RefreshCw,
} from "lucide-react";
import {
  fetchFeedbackSessions, fetchCAProfiles, fetchDocuments,
  saveDocument, updateDocument, deleteDocument, uploadDocumentPhoto,
  CandidateDocument,
} from "@/lib/db";
import { FeedbackSession, CAProfile } from "@/types";

// ── Shared styles ─────────────────────────────────────────────────────────────
const autoStyle: React.CSSProperties = {
  border: "2px solid #3B8FD4", background: "#EBF5FF", borderRadius: 6,
  padding: "6px 10px", width: "100%", fontSize: 13, color: "#0D2B5E",
};
const normalStyle: React.CSSProperties = {
  border: "1px solid #C8DFF5", background: "#fff", borderRadius: 6,
  padding: "6px 10px", width: "100%", fontSize: 13, color: "#0D2B5E",
};

function AutoBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10,
      color: "#3B8FD4", background: "#EBF5FF", border: "1px solid #C8DFF5",
      borderRadius: 4, padding: "1px 6px", marginLeft: 6, fontWeight: 600,
    }}>✦ 自動入力済み・上書き可能</span>
  );
}

// ── Candidate Selection Modal ─────────────────────────────────────────────────
function CandidateModal({
  sessions, onSelect, onClose,
}: {
  sessions: FeedbackSession[];
  onSelect: (s: FeedbackSession) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = sessions.filter(
    (s) => s.candidateName.includes(search) || s.staffName.includes(search)
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #E8F2FC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#0D2B5E" }}>候補者を選択</p>
          <button onClick={onClose} style={{ color: "#9CAAB8" }}><X size={18} /></button>
        </div>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #E8F2FC" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: "#9CAAB8" }} />
            <input type="text" placeholder="候補者名・担当者名で検索..." value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", padding: "7px 10px 7px 30px", border: "1px solid #C8DFF5", borderRadius: 6, fontSize: 13, color: "#0D2B5E", outline: "none" }} />
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 ? (
            <p style={{ padding: 24, textAlign: "center", color: "#9CAAB8", fontSize: 13 }}>該当する面談が見つかりません</p>
          ) : filtered.map((s) => (
            <button key={s.id} onClick={() => { onSelect(s); onClose(); }}
              style={{ width: "100%", padding: "12px 20px", borderBottom: "1px solid #F0F7FF", textAlign: "left", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F7FAFF")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "#E8F2FC", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#3B8FD4", flexShrink: 0 }}>
                {s.candidateName[0]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 13, color: "#0D2B5E" }}>{s.candidateName}</p>
                <p style={{ fontSize: 11, color: "#9CAAB8", marginTop: 1 }}>{s.meetingDate} · {s.meetingType} · 担当: {s.staffName}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Resume types ──────────────────────────────────────────────────────────────
interface HistoryRow { year: string; month: string; content: string; }

interface ResumeData {
  name: string; furigana: string;
  birthdateYear: string; birthdateMonth: string; birthdateDay: string;
  age: string; gender: string;
  postalCode: string; addressKana: string; address: string;
  phone: string; email: string;
  contactPostalCode: string; contactAddressKana: string; contactAddress: string;
  contactPhone: string; contactEmail: string;
  education: HistoryRow[]; workHistory: HistoryRow[]; licenses: HistoryRow[];
  motivation: string; commute: string; dependents: string;
  spouse: string; spouseDependency: string; wish: string;
  photoDataUrl: string | null;
}

function emptyResume(name = ""): ResumeData {
  return {
    name, furigana: "", birthdateYear: "", birthdateMonth: "", birthdateDay: "",
    age: "", gender: "",
    postalCode: "", addressKana: "", address: "",
    phone: "", email: "",
    contactPostalCode: "", contactAddressKana: "", contactAddress: "",
    contactPhone: "", contactEmail: "",
    education: [{ year: "", month: "", content: "" }],
    workHistory: [{ year: "", month: "", content: "" }],
    licenses: [{ year: "", month: "", content: "" }],
    motivation: "", commute: "", dependents: "",
    spouse: "", spouseDependency: "", wish: "",
    photoDataUrl: null,
  };
}

// ── Photo Upload Component ────────────────────────────────────────────────────
function PhotoUpload({
  photoDataUrl, onPhotoChange,
}: {
  photoDataUrl: string | null;
  onPhotoChange: (url: string | null) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [rawDataUrl, setRawDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stage, setStage] = useState<"idle" | "selected" | "processing" | "done">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setRawDataUrl(url);
      setStage("selected");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }, [handleFile]);

  const useRaw = () => {
    if (rawDataUrl) { onPhotoChange(rawDataUrl); setStage("done"); }
  };

  const processBlue = async () => {
    if (!rawDataUrl) return;
    setProcessing(true);
    setStage("processing");
    try {
      const resp = await fetch(rawDataUrl);
      const blob = await resp.blob();
      const file = new File([blob], "photo.jpg", { type: blob.type });

      const { removeBackground } = await import("@imgly/background-removal");
      const resultBlob = await removeBackground(file);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();
      img.src = URL.createObjectURL(resultBlob);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = "#1A5BA6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const cropCanvas = document.createElement("canvas");
      const cropCtx = cropCanvas.getContext("2d")!;
      const cropHeight = Math.floor(canvas.height * 0.75);
      cropCanvas.width = canvas.width;
      cropCanvas.height = cropHeight;
      cropCtx.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);

      const result = cropCanvas.toDataURL("image/jpeg", 0.95);
      onPhotoChange(result);
      setStage("done");
    } catch (err) {
      console.error("Background removal failed:", err);
      alert("加工に失敗しました。別の画像をお試しください。");
      setStage("selected");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => { setRawDataUrl(null); onPhotoChange(null); setStage("idle"); };

  const photoAreaStyle: React.CSSProperties = {
    width: "100%", aspectRatio: "3/4", border: dragging ? "2px dashed #3B8FD4" : "2px dashed #aaa",
    borderRadius: 4, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", cursor: "pointer", background: dragging ? "#EBF5FF" : "#f9f9f9",
    overflow: "hidden", position: "relative",
  };

  const currentPhoto = photoDataUrl ?? rawDataUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div className="resume-photo-area"
        style={photoAreaStyle}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}>
        {currentPhoto ? (
          <img src={currentPhoto} alt="証明写真" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <>
            <Upload size={20} color="#aaa" style={{ marginBottom: 4 }} />
            <span style={{ fontSize: 10, color: "#aaa", textAlign: "center", lineHeight: 1.4 }}>証明写真<br />クリックまたはドロップ</span>
          </>
        )}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/heic,image/heif"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {/* Buttons */}
      {stage === "selected" && !processing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
          <button className="no-print" onClick={useRaw}
            style={{ fontSize: 10, padding: "4px 6px", borderRadius: 4, border: "1px solid #C8DFF5", background: "#fff", cursor: "pointer", color: "#0D2B5E" }}>
            そのまま使う
          </button>
          <button className="no-print" onClick={processBlue}
            style={{ fontSize: 10, padding: "4px 6px", borderRadius: 4, border: "1px solid #3B8FD4", background: "#EBF5FF", cursor: "pointer", color: "#1A5BA6", fontWeight: 600 }}>
            ✦ 背景を青に加工する
          </button>
        </div>
      )}
      {stage === "processing" && (
        <div style={{ fontSize: 10, color: "#3B8FD4", display: "flex", alignItems: "center", gap: 4 }}>
          <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> 加工中...
        </div>
      )}
      {stage === "done" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
          <button className="no-print" onClick={reset}
            style={{ fontSize: 10, padding: "4px 6px", borderRadius: 4, border: "1px solid #F87171", background: "#FFF0F0", cursor: "pointer", color: "#991B1B" }}>
            やり直す
          </button>
        </div>
      )}
    </div>
  );
}

// ── Document Import Modal ─────────────────────────────────────────────────────
interface ParsedDocData {
  documentType?: string; name?: string; furigana?: string;
  birthdate?: string; age?: string; gender?: string;
  postalCode?: string; address?: string; phone?: string; email?: string;
  education?: HistoryRow[]; career?: HistoryRow[]; qualifications?: HistoryRow[];
  motivation?: string; pr?: string; wish?: string;
  summary?: string; companies?: Array<{
    name: string; period: string; industry: string; duties: string; achievements: string;
  }>;
  skills?: string; selfPR?: string;
}

function DocumentImportModal({
  onClose, onApply,
}: {
  onClose: () => void;
  onApply: (data: ParsedDocData) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedDocData | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setLoading(true); setError(""); setParsed(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setParsed(json.data);
    } catch {
      setError("読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 560, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: "1px solid #E8F2FC", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#0D2B5E" }}>📎 既存書類を読み込む</p>
            <p style={{ fontSize: 12, color: "#9CAAB8", marginTop: 2 }}>PDF・Word(.docx)・画像(jpg・png)に対応</p>
          </div>
          <button onClick={onClose} style={{ color: "#9CAAB8" }}><X size={20} /></button>
        </div>

        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
          {/* Drop zone */}
          {!parsed && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragging ? "2px solid #3B8FD4" : "2px dashed #C8DFF5",
                borderRadius: 10, padding: 40, textAlign: "center",
                background: dragging ? "#EBF5FF" : "#F7FAFF", cursor: "pointer",
                transition: "all 0.2s",
              }}>
              <Upload size={32} color={dragging ? "#3B8FD4" : "#C8DFF5"} style={{ marginBottom: 12, display: "inline-block" }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: dragging ? "#3B8FD4" : "#4A6FA5" }}>
                ファイルをドロップ、またはクリックして選択
              </p>
              <p style={{ fontSize: 12, color: "#9CAAB8", marginTop: 6 }}>PDF・Word(.docx)・画像(jpg・png)</p>
              <input ref={fileInputRef} type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
            </div>
          )}

          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#3B8FD4" }}>
              <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", display: "inline-block", marginBottom: 12 }} />
              <p style={{ fontSize: 14 }}>書類を解析しています...</p>
            </div>
          )}

          {error && (
            <div style={{ background: "#FFF0F0", border: "1px solid #FCA5A5", borderRadius: 8, padding: 14, color: "#991B1B", fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}

          {parsed && (
            <div>
              <div style={{ background: "#F0FFF4", border: "1px solid #86EFAC", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>解析完了</p>
                  <p style={{ fontSize: 12, color: "#15803D" }}>
                    書類種別: {parsed.documentType === "resume" ? "履歴書" : "職務経歴書"}
                    {parsed.name && ` / 氏名: ${parsed.name}`}
                  </p>
                </div>
              </div>

              {/* Preview of parsed fields */}
              <div style={{ background: "#F7FAFF", borderRadius: 8, padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#4A6FA5", marginBottom: 10 }}>抽出された情報</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    ["氏名", parsed.name],
                    ["ふりがな", parsed.furigana],
                    ["生年月日", parsed.birthdate],
                    ["性別", parsed.gender],
                    ["電話", parsed.phone],
                    ["Email", parsed.email],
                    ["住所", parsed.address],
                    ["学歴", parsed.education?.length ? `${parsed.education.length}件` : ""],
                    ["職歴", parsed.career?.length ? `${parsed.career.length}件` : ""],
                    ["資格", parsed.qualifications?.length ? `${parsed.qualifications.length}件` : ""],
                  ].filter(([, v]) => v).map(([label, val]) => (
                    <div key={label} style={{ background: "#EBF5FF", border: "2px solid #3B8FD4", borderRadius: 5, padding: "4px 8px" }}>
                      <span style={{ fontSize: 10, color: "#4A6FA5" }}>{label}: </span>
                      <span style={{ fontSize: 12, color: "#0D2B5E", fontWeight: 500 }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { onApply(parsed); onClose(); }}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 8, fontSize: 14, fontWeight: 700,
                  background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff",
                  border: "none", cursor: "pointer",
                }}>
                このデータをフォームに反映する
              </button>
              <button onClick={() => setParsed(null)}
                style={{ width: "100%", padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#fff", color: "#9CAAB8", border: "1px solid #E8F2FC", cursor: "pointer", marginTop: 8 }}>
                別のファイルを選択
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Cell input for resume table ───────────────────────────────────────────────
function CI({
  value, onChange, auto, placeholder, bold, large, align, flex,
}: {
  value: string; onChange: (v: string) => void; auto?: boolean;
  placeholder?: string; bold?: boolean; large?: boolean;
  align?: "center" | "right"; flex?: number;
}) {
  return (
    <input
      type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`resume-cell-input${auto ? " resume-cell-input--auto" : ""}`}
      style={{
        fontWeight: bold ? 700 : 400,
        fontSize: large ? 18 : 12,
        textAlign: align ?? "left",
        flex: flex,
      }}
    />
  );
}

function CIArea({
  value, onChange, auto, placeholder, rows,
}: {
  value: string; onChange: (v: string) => void; auto?: boolean;
  placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows ?? 3}
      className={`resume-cell-input${auto ? " resume-cell-input--auto" : ""}`}
      style={{ resize: "vertical", lineHeight: 1.5 }}
    />
  );
}

// ── Resume Tab ────────────────────────────────────────────────────────────────
function ResumeTab({
  session, importedData, existingResumeData, caProfiles, currentUser, existingDocId, onSaved,
}: {
  session: FeedbackSession | null;
  importedData: ParsedDocData | null;
  existingResumeData: ResumeData | null;
  caProfiles: CAProfile[];
  currentUser: { id?: string; name?: string; email?: string } | null;
  existingDocId: string | null;
  onSaved: (id: string) => void;
}) {
  const [resume, setResume] = useState<ResumeData>(() => emptyResume(session?.candidateName ?? ""));
  const [autoFields, setAutoFields] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [docId, setDocId] = useState<string | null>(existingDocId);

  // Reset when session changes
  useEffect(() => {
    if (!existingResumeData) {
      setResume(emptyResume(session?.candidateName ?? ""));
      setAutoFields(new Set());
      setSaveMsg("");
    }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load existing saved document directly
  useEffect(() => {
    if (existingResumeData) {
      setResume(existingResumeData);
      setDocId(existingDocId);
      setAutoFields(new Set());
    }
  }, [existingResumeData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply imported data
  useEffect(() => {
    if (!importedData) return;
    const d = importedData;
    const newAuto = new Set<string>();

    setResume((prev) => {
      const next = { ...prev };
      if (d.name) { next.name = d.name; newAuto.add("name"); }
      if (d.furigana) { next.furigana = d.furigana; newAuto.add("furigana"); }
      if (d.birthdate) {
        const m = d.birthdate.match(/(\d+)[年\/\-](\d+)[月\/\-](\d+)/);
        if (m) {
          next.birthdateYear = m[1]; next.birthdateMonth = m[2]; next.birthdateDay = m[3];
          newAuto.add("birthdate");
        }
      }
      if (d.age) { next.age = d.age; newAuto.add("age"); }
      if (d.gender) { next.gender = d.gender; newAuto.add("gender"); }
      if (d.postalCode) { next.postalCode = d.postalCode; newAuto.add("postalCode"); }
      if (d.address) { next.address = d.address; newAuto.add("address"); }
      if (d.phone) { next.phone = d.phone; newAuto.add("phone"); }
      if (d.email) { next.email = d.email; newAuto.add("email"); }
      if (d.education?.length) { next.education = d.education; newAuto.add("education"); }
      if (d.career?.length) { next.workHistory = d.career; newAuto.add("workHistory"); }
      if (d.qualifications?.length) { next.licenses = d.qualifications; newAuto.add("licenses"); }
      if (d.motivation) { next.motivation = d.motivation; newAuto.add("motivation"); }
      if (d.wish) { next.wish = d.wish; newAuto.add("wish"); }
      return next;
    });
    setAutoFields(newAuto);
  }, [importedData]);

  const isAuto = (f: string) => autoFields.has(f);

  async function generate() {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "resume", candidateName: session.candidateName, transcript: session.transcript }),
      });
      const json = await res.json();
      if (json.data) {
        const d = json.data;
        const newAuto = new Set<string>();
        setResume((prev) => {
          const next = { ...prev };
          if (d.furigana) { next.furigana = d.furigana; newAuto.add("furigana"); }
          if (d.birthdate) {
            const m = d.birthdate.match(/(\d+)[年\/\-](\d+)[月\/\-](\d+)/);
            if (m) { next.birthdateYear = m[1]; next.birthdateMonth = m[2]; next.birthdateDay = m[3]; newAuto.add("birthdate"); }
          }
          if (d.gender) { next.gender = d.gender; newAuto.add("gender"); }
          if (d.address) { next.address = d.address; newAuto.add("address"); }
          if (d.phone) { next.phone = d.phone; newAuto.add("phone"); }
          if (d.email) { next.email = d.email; newAuto.add("email"); }
          if (d.motivation) { next.motivation = d.motivation; newAuto.add("motivation"); }
          if (d.education?.length) {
            next.education = d.education.map((e: { year: string; month: string; school?: string; faculty?: string; type?: string; content?: string }) => ({
              year: e.year, month: e.month,
              content: e.content ?? [e.school, e.faculty, e.type].filter(Boolean).join(" "),
            }));
            newAuto.add("education");
          }
          if (d.workHistory?.length) {
            next.workHistory = d.workHistory.map((w: { year: string; month: string; company?: string; detail?: string; type?: string; content?: string }) => ({
              year: w.year, month: w.month,
              content: w.content ?? [w.company, w.detail, w.type].filter(Boolean).join(" "),
            }));
            newAuto.add("workHistory");
          }
          if (d.licenses?.length) {
            next.licenses = d.licenses.map((l: { year: string; month: string; name?: string; content?: string }) => ({
              year: l.year, month: l.month, content: l.content ?? l.name ?? "",
            }));
            newAuto.add("licenses");
          }
          return next;
        });
        setAutoFields(newAuto);
      }
    } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    try {
      let photoUrl: string | undefined;
      if (resume.photoDataUrl) {
        const fn = `resume_${resume.name || "unnamed"}_${Date.now()}.jpg`;
        const uploaded = await uploadDocumentPhoto(resume.photoDataUrl, fn);
        photoUrl = uploaded ?? undefined;
      }

      const caProfile = currentUser?.email
        ? caProfiles.find((c) => c.email === currentUser.email)
        : undefined;

      const payload = {
        candidateName: resume.name || session?.candidateName || "不明",
        caId: caProfile?.id,
        caName: caProfile?.name,
        documentType: "resume" as const,
        documentData: resume,
        photoUrl: photoUrl ?? resume.photoDataUrl ?? undefined,
      };

      let savedId: string | null;
      if (docId) {
        await updateDocument(docId, payload);
        savedId = docId;
      } else {
        savedId = await saveDocument(payload);
        if (savedId) setDocId(savedId);
      }

      setSaveMsg(savedId ? "保存しました ✓" : "保存に失敗しました（Supabase未設定の可能性）");
      if (savedId) onSaved(savedId);
    } finally { setSaving(false); setTimeout(() => setSaveMsg(""), 3000); }
  }

  const today = new Date();
  const todayStr = `令和${today.getFullYear() - 2018}年 ${today.getMonth() + 1}月 ${today.getDate()}日 現在`;

  const setRow = (
    field: "education" | "workHistory" | "licenses", idx: number, key: keyof HistoryRow, val: string
  ) => setResume((r) => {
    const arr = [...r[field]]; arr[idx] = { ...arr[idx], [key]: val }; return { ...r, [field]: arr };
  });

  const addRow = (field: "education" | "workHistory" | "licenses") =>
    setResume((r) => ({ ...r, [field]: [...r[field], { year: "", month: "", content: "" }] }));

  const removeRow = (field: "education" | "workHistory" | "licenses", idx: number) =>
    setResume((r) => ({ ...r, [field]: r[field].filter((_, j) => j !== idx) }));

  const s = (field: keyof ResumeData) => (v: string) =>
    setResume((r) => ({ ...r, [field]: v }));

  const tdL: React.CSSProperties = { border: "1px solid #333", padding: 0, verticalAlign: "top" };
  const tdLPad: React.CSSProperties = { ...tdL, padding: "4px 6px" };
  const labelStyle: React.CSSProperties = { fontSize: 10, color: "#555", fontFamily: "'Noto Sans JP',sans-serif" };
  const sectionHeaderTd: React.CSSProperties = {
    border: "1px solid #333", padding: "4px 8px",
    textAlign: "center", fontWeight: 700, fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif",
  };
  const yearTd: React.CSSProperties = { border: "1px solid #333", padding: 2, width: "9%", textAlign: "center" };
  const monthTd: React.CSSProperties = { border: "1px solid #333", padding: 2, width: "7%", textAlign: "center" };
  const contentTd: React.CSSProperties = { border: "1px solid #333", padding: 2 };

  return (
    <div>
      {/* Action bar */}
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={generate} disabled={!session || loading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: session ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0", color: session ? "#fff" : "#9CAAB8", border: "none", cursor: session ? "pointer" : "not-allowed" }}>
          <Sparkles size={14} />{loading ? "生成中..." : "AI自動入力"}
        </button>
        <button onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#0D2B5E", border: "1px solid #C8DFF5", cursor: "pointer" }}>
          <Printer size={14} />PDF印刷
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#0D2B5E", border: "1px solid #C8DFF5", cursor: "pointer" }}>
          <Save size={14} />{saving ? "保存中..." : "💾 保存する"}
        </button>
        {saveMsg && <span style={{ fontSize: 12, color: saveMsg.includes("✓") ? "#16A34A" : "#DC2626" }}>{saveMsg}</span>}
      </div>

      {/* Resume form */}
      <div className="resume-wrap print-full-width" style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: 20, maxWidth: 900 }}>

        {/* Header */}
        <table style={{ width: "100%", marginBottom: 6, borderCollapse: "collapse", fontFamily: "'Noto Sans JP',sans-serif" }}>
          <tbody>
            <tr>
              <td style={{ fontSize: 22, fontWeight: 800, letterSpacing: "0.3em", padding: "4px 0" }}>履　歴　書</td>
              <td style={{ textAlign: "right", fontSize: 12, color: "#333", padding: "4px 0", whiteSpace: "nowrap" }}>
                <input value={resume.birthdateYear ? todayStr : todayStr} readOnly
                  className="resume-cell-input" style={{ textAlign: "right", width: "auto", fontSize: 12 }} />
              </td>
            </tr>
          </tbody>
        </table>

        {/* Basic info + photo */}
        <table className="resume-table" style={{ marginBottom: 0 }}>
          <colgroup>
            <col style={{ width: "75%" }} />
            <col style={{ width: "25%" }} />
          </colgroup>
          <tbody>
            {/* Row: ふりがな */}
            <tr>
              <td style={tdLPad} rowSpan={1}>
                <div style={labelStyle}>ふりがな</div>
                <CI value={resume.furigana} onChange={s("furigana")} auto={isAuto("furigana")} placeholder="やまだ たろう" />
              </td>
              <td style={{ border: "1px solid #333", padding: 10, textAlign: "center", verticalAlign: "middle" }} rowSpan={8}>
                <PhotoUpload
                  photoDataUrl={resume.photoDataUrl}
                  onPhotoChange={(url) => setResume((r) => ({ ...r, photoDataUrl: url }))}
                />
              </td>
            </tr>
            {/* Row: 氏名 */}
            <tr>
              <td style={tdLPad}>
                <div style={labelStyle}>氏名（漢字）</div>
                <CI value={resume.name} onChange={s("name")} auto={isAuto("name")} placeholder="山田　太郎" bold large />
              </td>
            </tr>
            {/* Row: 生年月日 */}
            <tr>
              <td style={{ ...tdLPad, whiteSpace: "nowrap" }}>
                <div style={labelStyle}>生年月日</div>
                <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                  <CI value={resume.birthdateYear} onChange={s("birthdateYear")} auto={isAuto("birthdate")} placeholder="1990" align="center" flex={2} />
                  <span style={{ fontSize: 12 }}>年</span>
                  <CI value={resume.birthdateMonth} onChange={s("birthdateMonth")} auto={isAuto("birthdate")} placeholder="1" align="center" flex={1} />
                  <span style={{ fontSize: 12 }}>月</span>
                  <CI value={resume.birthdateDay} onChange={s("birthdateDay")} auto={isAuto("birthdate")} placeholder="1" align="center" flex={1} />
                  <span style={{ fontSize: 12 }}>日生　(満</span>
                  <CI value={resume.age} onChange={s("age")} auto={isAuto("age")} placeholder="35" align="center" flex={1} />
                  <span style={{ fontSize: 12 }}>歳)</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>性別</span>
                  <CI value={resume.gender} onChange={s("gender")} auto={isAuto("gender")} placeholder="男・女" flex={2} />
                </div>
              </td>
            </tr>
            {/* Row: 現住所ふりがな */}
            <tr>
              <td style={tdLPad}>
                <div style={labelStyle}>ふりがな（現住所）</div>
                <CI value={resume.addressKana} onChange={s("addressKana")} placeholder="とうきょうと..." />
              </td>
            </tr>
            {/* Row: 現住所 */}
            <tr>
              <td style={tdLPad}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <span style={{ ...labelStyle, whiteSpace: "nowrap" }}>現住所 〒</span>
                  <CI value={resume.postalCode} onChange={s("postalCode")} auto={isAuto("postalCode")} placeholder="100-0001" />
                </div>
                <CI value={resume.address} onChange={s("address")} auto={isAuto("address")} placeholder="東京都千代田区..." />
              </td>
            </tr>
            {/* Row: 現住所電話・メール */}
            <tr>
              <td style={tdLPad}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>電話</div>
                    <CI value={resume.phone} onChange={s("phone")} auto={isAuto("phone")} placeholder="090-0000-0000" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>Email</div>
                    <CI value={resume.email} onChange={s("email")} auto={isAuto("email")} placeholder="example@email.com" />
                  </div>
                </div>
              </td>
            </tr>
            {/* Row: 連絡先ふりがな */}
            <tr>
              <td style={tdLPad}>
                <div style={labelStyle}>ふりがな（連絡先）</div>
                <CI value={resume.contactAddressKana} onChange={s("contactAddressKana")} placeholder="現住所以外に連絡を希望する場合のみ" />
              </td>
            </tr>
            {/* Row: 連絡先 */}
            <tr>
              <td style={tdLPad}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <span style={{ ...labelStyle, whiteSpace: "nowrap" }}>連絡先 〒</span>
                  <CI value={resume.contactPostalCode} onChange={s("contactPostalCode")} placeholder="（現住所以外に希望する場合のみ）" />
                </div>
                <CI value={resume.contactAddress} onChange={s("contactAddress")} placeholder="" />
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>電話</div>
                    <CI value={resume.contactPhone} onChange={s("contactPhone")} placeholder="090-0000-0000" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={labelStyle}>Email</div>
                    <CI value={resume.contactEmail} onChange={s("contactEmail")} placeholder="example@email.com" />
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Education / Work History table */}
        <table className="resume-table" style={{ marginTop: 0 }}>
          <colgroup><col style={{ width: "9%" }} /><col style={{ width: "7%" }} /><col /></colgroup>
          <thead>
            <tr>
              <th style={{ border: "1px solid #333", textAlign: "center", padding: 4, fontSize: 12 }}>年</th>
              <th style={{ border: "1px solid #333", textAlign: "center", padding: 4, fontSize: 12 }}>月</th>
              <th style={{ border: "1px solid #333", padding: 4, fontSize: 12 }}>学歴・職歴</th>
            </tr>
          </thead>
          <tbody>
            {/* 学歴 section */}
            <tr><td style={sectionHeaderTd} /><td style={sectionHeaderTd} /><td style={sectionHeaderTd}>学歴</td></tr>
            {resume.education.map((e, i) => (
              <tr key={i}>
                <td style={yearTd}><CI value={e.year} onChange={(v) => setRow("education", i, "year", v)} auto={isAuto("education")} align="center" placeholder="年" /></td>
                <td style={monthTd}><CI value={e.month} onChange={(v) => setRow("education", i, "month", v)} auto={isAuto("education")} align="center" placeholder="月" /></td>
                <td style={contentTd}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <CI value={e.content} onChange={(v) => setRow("education", i, "content", v)} auto={isAuto("education")} placeholder="○○大学 ○○学部 卒業" />
                    <button className="no-print" onClick={() => removeRow("education", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F87171", padding: "0 4px", flexShrink: 0 }}><Trash2 size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="no-print">
              <td colSpan={3} style={{ border: "1px solid #333", padding: "2px 4px" }}>
                <button onClick={() => addRow("education")} style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Plus size={11} /> 学歴を追加</button>
              </td>
            </tr>

            {/* Empty row */}
            <tr><td style={{ ...yearTd, height: 20 }} /><td style={monthTd} /><td style={contentTd} /></tr>

            {/* 職歴 section */}
            <tr><td style={sectionHeaderTd} /><td style={sectionHeaderTd} /><td style={sectionHeaderTd}>職歴</td></tr>
            {resume.workHistory.map((w, i) => (
              <tr key={i}>
                <td style={yearTd}><CI value={w.year} onChange={(v) => setRow("workHistory", i, "year", v)} auto={isAuto("workHistory")} align="center" placeholder="年" /></td>
                <td style={monthTd}><CI value={w.month} onChange={(v) => setRow("workHistory", i, "month", v)} auto={isAuto("workHistory")} align="center" placeholder="月" /></td>
                <td style={contentTd}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <CI value={w.content} onChange={(v) => setRow("workHistory", i, "content", v)} auto={isAuto("workHistory")} placeholder="株式会社○○ 入社" />
                    <button className="no-print" onClick={() => removeRow("workHistory", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F87171", padding: "0 4px", flexShrink: 0 }}><Trash2 size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="no-print">
              <td colSpan={3} style={{ border: "1px solid #333", padding: "2px 4px" }}>
                <button onClick={() => addRow("workHistory")} style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Plus size={11} /> 職歴を追加</button>
              </td>
            </tr>

            {/* 以上 */}
            <tr><td style={yearTd} /><td style={monthTd} /><td style={{ ...contentTd, textAlign: "right", padding: "4px 8px", fontSize: 12, fontFamily: "'Noto Sans JP',sans-serif" }}>以上</td></tr>
          </tbody>
        </table>

        {/* Licenses table */}
        <table className="resume-table" style={{ marginTop: 0 }}>
          <colgroup><col style={{ width: "9%" }} /><col style={{ width: "7%" }} /><col /></colgroup>
          <thead>
            <tr>
              <th style={{ border: "1px solid #333", textAlign: "center", padding: 4, fontSize: 12 }}>年</th>
              <th style={{ border: "1px solid #333", textAlign: "center", padding: 4, fontSize: 12 }}>月</th>
              <th style={{ border: "1px solid #333", padding: 4, fontSize: 12 }}>免許・資格</th>
            </tr>
          </thead>
          <tbody>
            {resume.licenses.map((l, i) => (
              <tr key={i}>
                <td style={yearTd}><CI value={l.year} onChange={(v) => setRow("licenses", i, "year", v)} auto={isAuto("licenses")} align="center" placeholder="年" /></td>
                <td style={monthTd}><CI value={l.month} onChange={(v) => setRow("licenses", i, "month", v)} auto={isAuto("licenses")} align="center" placeholder="月" /></td>
                <td style={contentTd}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <CI value={l.content} onChange={(v) => setRow("licenses", i, "content", v)} auto={isAuto("licenses")} placeholder="普通自動車第一種運転免許" />
                    <button className="no-print" onClick={() => removeRow("licenses", i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#F87171", padding: "0 4px", flexShrink: 0 }}><Trash2 size={11} /></button>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="no-print">
              <td colSpan={3} style={{ border: "1px solid #333", padding: "2px 4px" }}>
                <button onClick={() => addRow("licenses")} style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Plus size={11} /> 資格を追加</button>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom: motivation + misc */}
        <table className="resume-table" style={{ marginTop: 0 }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #333", padding: 6, width: "60%", verticalAlign: "top" }} rowSpan={5}>
                <div style={labelStyle}>志望の動機、特技、好きな学科、アピールポイントなど</div>
                {isAuto("motivation") && <AutoBadge />}
                <CIArea value={resume.motivation} onChange={s("motivation")} auto={isAuto("motivation")} placeholder="志望動機・特技・アピールポイントを入力..." rows={6} />
              </td>
              <td style={{ border: "1px solid #333", padding: 6, verticalAlign: "top" }}>
                <div style={labelStyle}>通勤時間</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 11 }}>約</span>
                  <CI value={resume.commute} onChange={s("commute")} placeholder="30分" />
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #333", padding: 6, verticalAlign: "top" }}>
                <div style={labelStyle}>扶養家族数（配偶者を除く）</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <CI value={resume.dependents} onChange={s("dependents")} placeholder="0" />
                  <span style={{ fontSize: 11 }}>人</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #333", padding: 6, verticalAlign: "top" }}>
                <div style={labelStyle}>配偶者</div>
                <CI value={resume.spouse} onChange={s("spouse")} placeholder="有・無" />
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #333", padding: 6, verticalAlign: "top" }}>
                <div style={labelStyle}>配偶者の扶養義務</div>
                <CI value={resume.spouseDependency} onChange={s("spouseDependency")} placeholder="有・無" />
              </td>
            </tr>
            <tr><td style={{ border: "1px solid #333", padding: 6 }} /></tr>
          </tbody>
        </table>

        {/* 本人希望欄 */}
        <table className="resume-table" style={{ marginTop: 0 }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #333", padding: 6 }}>
                <div style={labelStyle}>本人希望記入欄（特に給料・職種・勤務時間・勤務地・その他について希望があれば記入）</div>
                {isAuto("wish") && <AutoBadge />}
                <CIArea value={resume.wish} onChange={s("wish")} auto={isAuto("wish")} placeholder="特に希望がない場合は「貴社規定に従います」とご記入ください" rows={3} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Career types ──────────────────────────────────────────────────────────────
interface CareerPosition { title: string; period: string; description: string; achievements: string; }
interface CareerCompany {
  name: string; industry: string; employees: string;
  startYear: string; startMonth: string; endYear: string; endMonth: string;
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
    companies: [{ name: "", industry: "", employees: "", startYear: "", startMonth: "", endYear: "", endMonth: "", positions: [{ title: "", period: "", description: "", achievements: "" }] }],
    skills: { technical: [], language: [], other: [] }, pr: "",
  };
}

// ── Career Tab ────────────────────────────────────────────────────────────────
function CareerTab({
  session, importedData, existingCareerData, caProfiles, currentUser, existingDocId, onSaved,
}: {
  session: FeedbackSession | null;
  importedData: ParsedDocData | null;
  existingCareerData: CareerData | null;
  caProfiles: CAProfile[];
  currentUser: { id?: string; name?: string; email?: string } | null;
  existingDocId: string | null;
  onSaved: (id: string) => void;
}) {
  const [career, setCareer] = useState<CareerData>(emptyCareer());
  const [autoFilled, setAutoFilled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [docId, setDocId] = useState<string | null>(existingDocId);

  useEffect(() => {
    if (!existingCareerData) { setCareer(emptyCareer()); setAutoFilled(false); setSaveMsg(""); }
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (existingCareerData) { setCareer(existingCareerData); setDocId(existingDocId); setAutoFilled(false); }
  }, [existingCareerData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!importedData || importedData.documentType !== "career") return;
    const d = importedData;
    if (d.summary || d.companies?.length || d.skills) {
      setCareer((prev) => ({
        ...prev,
        summary: d.summary || prev.summary,
        companies: d.companies?.length ? d.companies.map((c) => ({
          name: c.name, industry: c.industry, employees: "",
          startYear: "", startMonth: "", endYear: "", endMonth: "",
          positions: [{ title: "", period: c.period || "", description: c.duties || "", achievements: c.achievements || "" }],
        })) : prev.companies,
        pr: d.selfPR || d.pr || prev.pr,
        skills: d.skills ? { technical: [d.skills], language: [], other: [] } : prev.skills,
      }));
      setAutoFilled(true);
    }
  }, [importedData]);

  async function generate() {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch("/api/documents/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "career", candidateName: session.candidateName, transcript: session.transcript }),
      });
      const json = await res.json();
      if (json.data) {
        const d: CareerData = json.data;
        setCareer({ summary: d.summary || "", companies: d.companies?.length ? d.companies : emptyCareer().companies, skills: d.skills || { technical: [], language: [], other: [] }, pr: d.pr || "" });
        setAutoFilled(true);
      }
    } finally { setLoading(false); }
  }

  async function handleSave() {
    setSaving(true); setSaveMsg("");
    try {
      const caProfile = currentUser?.email ? caProfiles.find((c) => c.email === currentUser.email) : undefined;
      const payload = {
        candidateName: session?.candidateName || "不明",
        caId: caProfile?.id, caName: caProfile?.name,
        documentType: "career" as const, documentData: career,
      };
      let savedId: string | null;
      if (docId) { await updateDocument(docId, payload); savedId = docId; }
      else { savedId = await saveDocument(payload); if (savedId) setDocId(savedId); }
      setSaveMsg(savedId ? "保存しました ✓" : "保存に失敗しました（Supabase未設定の可能性）");
      if (savedId) onSaved(savedId);
    } finally { setSaving(false); setTimeout(() => setSaveMsg(""), 3000); }
  }

  function updateCompany(i: number, f: keyof CareerCompany, v: string) {
    const cs = [...career.companies]; cs[i] = { ...cs[i], [f]: v }; setCareer((c) => ({ ...c, companies: cs }));
  }
  function updatePosition(ci: number, pi: number, f: keyof CareerPosition, v: string) {
    const cs = [...career.companies]; const pos = [...cs[ci].positions]; pos[pi] = { ...pos[pi], [f]: v }; cs[ci] = { ...cs[ci], positions: pos }; setCareer((c) => ({ ...c, companies: cs }));
  }

  const fs = (auto: boolean) => auto ? autoStyle : normalStyle;
  return (
    <div>
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={generate} disabled={!session || loading}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: session ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0", color: session ? "#fff" : "#9CAAB8", border: "none", cursor: session ? "pointer" : "not-allowed" }}>
          <Sparkles size={14} />{loading ? "生成中..." : "AI自動入力"}
        </button>
        <button onClick={() => window.print()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#0D2B5E", border: "1px solid #C8DFF5", cursor: "pointer" }}>
          <Printer size={14} />PDF印刷
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#0D2B5E", border: "1px solid #C8DFF5", cursor: "pointer" }}>
          <Save size={14} />{saving ? "保存中..." : "💾 保存する"}
        </button>
        {saveMsg && <span style={{ fontSize: 12, color: saveMsg.includes("✓") ? "#16A34A" : "#DC2626" }}>{saveMsg}</span>}
      </div>
      <div className="print-full-width" style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: 24, maxWidth: 860 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0D2B5E", textAlign: "center", marginBottom: 20, borderBottom: "2px solid #0D2B5E", paddingBottom: 12 }}>職 務 経 歴 書</h2>
        <p style={{ fontSize: 11, color: "#9CAAB8", marginBottom: 16 }}>作成日: {new Date().toLocaleDateString("ja-JP")} | 氏名: {session?.candidateName ?? "—"}</p>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 8, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>職務要約{autoFilled && <AutoBadge />}</h3>
        <textarea value={career.summary} onChange={(e) => setCareer((c) => ({ ...c, summary: e.target.value }))} rows={4} placeholder="職務要約を入力..." style={{ ...fs(autoFilled), resize: "vertical", marginBottom: 20 }} />
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 12, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>職務経歴{autoFilled && <AutoBadge />}</h3>
        {career.companies.map((co, ci) => (
          <div key={ci} style={{ border: "1px solid #C8DFF5", borderRadius: 8, padding: 16, marginBottom: 16, background: "#F7FAFF" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E" }}>会社 {ci + 1}</span>
              <button className="no-print" onClick={() => setCareer((c) => ({ ...c, companies: c.companies.filter((_, j) => j !== ci) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#F87171", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}><Trash2 size={12} /> 削除</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {([["会社名", "name", "株式会社..."], ["業種", "industry", "IT・人材等"], ["従業員数", "employees", "100名"]] as const).map(([label, field, placeholder]) => (
                <div key={field}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>{label}</label>
                  <input value={co[field as "name" | "industry" | "employees"]} onChange={(e) => updateCompany(ci, field as "name" | "industry" | "employees", e.target.value)} placeholder={placeholder} style={fs(autoFilled)} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>在籍期間</label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input value={co.startYear} onChange={(e) => updateCompany(ci, "startYear", e.target.value)} placeholder="入社年" style={{ ...fs(autoFilled), width: 70 }} />
                  <span style={{ fontSize: 11 }}>年</span>
                  <input value={co.startMonth} onChange={(e) => updateCompany(ci, "startMonth", e.target.value)} placeholder="月" style={{ ...fs(autoFilled), width: 50 }} />
                  <span style={{ fontSize: 11 }}>〜</span>
                  <input value={co.endYear} onChange={(e) => updateCompany(ci, "endYear", e.target.value)} placeholder="退社年" style={{ ...fs(autoFilled), width: 70 }} />
                  <span style={{ fontSize: 11 }}>年</span>
                  <input value={co.endMonth} onChange={(e) => updateCompany(ci, "endMonth", e.target.value)} placeholder="月" style={{ ...fs(autoFilled), width: 50 }} />
                </div>
              </div>
            </div>
            {co.positions.map((pos, pi) => (
              <div key={pi} style={{ background: "#fff", border: "1px solid #E8F2FC", borderRadius: 6, padding: 12, marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#3B8FD4", marginBottom: 8 }}>ポジション {pi + 1}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>役職</label>
                    <input value={pos.title} onChange={(e) => updatePosition(ci, pi, "title", e.target.value)} placeholder="営業・リーダー等" style={fs(autoFilled)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>期間</label>
                    <input value={pos.period} onChange={(e) => updatePosition(ci, pi, "period", e.target.value)} placeholder="2020年4月〜現在" style={fs(autoFilled)} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>業務内容</label>
                  <textarea value={pos.description} onChange={(e) => updatePosition(ci, pi, "description", e.target.value)} rows={3} placeholder="業務内容を入力..." style={{ ...fs(autoFilled), resize: "vertical", marginBottom: 8 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 3 }}>実績・成果</label>
                  <textarea value={pos.achievements} onChange={(e) => updatePosition(ci, pi, "achievements", e.target.value)} rows={2} placeholder="売上目標達成率120%等..." style={{ ...fs(autoFilled), resize: "vertical" }} />
                </div>
              </div>
            ))}
            <button className="no-print" onClick={() => {
              const cs = [...career.companies]; cs[ci] = { ...cs[ci], positions: [...cs[ci].positions, { title: "", period: "", description: "", achievements: "" }] }; setCareer((c) => ({ ...c, companies: cs }));
            }} style={{ fontSize: 11, color: "#3B8FD4", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Plus size={12} /> ポジション追加</button>
          </div>
        ))}
        <button className="no-print" onClick={() => setCareer((c) => ({ ...c, companies: [...c.companies, { name: "", industry: "", employees: "", startYear: "", startMonth: "", endYear: "", endMonth: "", positions: [{ title: "", period: "", description: "", achievements: "" }] }] }))}
          style={{ fontSize: 12, color: "#3B8FD4", background: "#EBF5FF", border: "1px solid #C8DFF5", borderRadius: 6, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 20 }}>
          <Plus size={12} /> 会社を追加
        </button>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 8, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>スキル・資格{autoFilled && <AutoBadge />}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {(["technical", "language", "other"] as const).map((cat) => (
            <div key={cat}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>
                {cat === "technical" ? "技術・ツール" : cat === "language" ? "語学" : "その他"}
              </label>
              <textarea value={career.skills[cat].join("\n")} onChange={(e) => setCareer((c) => ({ ...c, skills: { ...c.skills, [cat]: e.target.value.split("\n").filter(Boolean) } }))} rows={4} placeholder="1行1スキル" style={{ ...fs(autoFilled), resize: "vertical" }} />
            </div>
          ))}
        </div>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "#0D2B5E", marginBottom: 8, borderLeft: "3px solid #3B8FD4", paddingLeft: 8 }}>自己PR{autoFilled && <AutoBadge />}</h3>
        <textarea value={career.pr} onChange={(e) => setCareer((c) => ({ ...c, pr: e.target.value }))} rows={6} placeholder="自己PRを入力..." style={{ ...fs(autoFilled), resize: "vertical" }} />
      </div>
    </div>
  );
}

// ── Interview Tab ─────────────────────────────────────────────────────────────
const INDUSTRIES = ["IT・通信", "人材・採用", "金融・保険", "コンサルティング", "製造業", "医療・製薬", "不動産・建設", "小売・流通", "広告・メディア", "教育", "公務・非営利", "その他"];
const JOB_TYPES = ["営業", "エンジニア", "マーケティング", "経営企画", "人事・総務", "経理・財務", "カスタマーサポート", "コンサルタント", "デザイナー", "プロジェクトマネージャー", "その他"];

interface InterviewQuestion { number: number; category: string; question: string; answer: string; tip: string; }

function InterviewTab({ session }: { session: FeedbackSession | null }) {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [jobType, setJobType] = useState(JOB_TYPES[0]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  async function generate() {
    if (!session) return;
    setLoading(true); setQuestions([]);
    try {
      const res = await fetch("/api/documents/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "interview", candidateName: session.candidateName, transcript: session.transcript, industry, jobType }) });
      const json = await res.json();
      if (json.data?.questions) { setQuestions(json.data.questions); setExpanded(new Set(json.data.questions.map((q: InterviewQuestion) => q.number))); }
    } finally { setLoading(false); }
  }

  const CATEGORY_COLORS: Record<string, string> = { "自己紹介": "#3B8FD4", "志望動機": "#8B5CF6", "強み": "#10B981", "弱み": "#F59E0B", "経験": "#0D2B5E", "転職理由": "#EF4444", "将来像": "#06B6D4" };
  function getCategoryColor(cat: string) {
    for (const [k, v] of Object.entries(CATEGORY_COLORS)) { if (cat.includes(k)) return v; }
    return "#3B8FD4";
  }

  return (
    <div>
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>業界</label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} style={{ ...normalStyle, width: 160 }}>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#4A6FA5", display: "block", marginBottom: 4 }}>職種</label>
          <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={{ ...normalStyle, width: 180 }}>{JOB_TYPES.map((j) => <option key={j}>{j}</option>)}</select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button onClick={generate} disabled={!session || loading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: session ? "linear-gradient(135deg,#0D2B5E,#1A5BA6)" : "#E0E8F0", color: session ? "#fff" : "#9CAAB8", border: "none", cursor: session ? "pointer" : "not-allowed" }}>
            <Sparkles size={14} />{loading ? "生成中..." : "Q&A生成"}
          </button>
          {questions.length > 0 && (
            <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#0D2B5E", border: "1px solid #C8DFF5", cursor: "pointer" }}>
              <Printer size={14} />PDF印刷
            </button>
          )}
        </div>
      </div>
      {loading && <div style={{ textAlign: "center", padding: 40, color: "#3B8FD4", fontSize: 13 }}><Sparkles size={18} style={{ display: "inline-block", marginBottom: 8 }} /><p>面接対策Q&Aを生成しています...</p></div>}
      {questions.length > 0 && (
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#4A6FA5" }}><strong style={{ color: "#0D2B5E" }}>{session?.candidateName}</strong> さんの面接対策 — {industry} / {jobType}</p>
            <span style={{ fontSize: 12, color: "#9CAAB8" }}>{questions.length}問</span>
          </div>
          {questions.map((q) => (
            <div key={q.number} style={{ background: "#F7FAFF", border: "1px solid #C8DFF5", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
              <button onClick={() => setExpanded((prev) => { const next = new Set(prev); next.has(q.number) ? next.delete(q.number) : next.add(q.number); return next; })}
                style={{ width: "100%", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: getCategoryColor(q.category), color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{q.number}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: getCategoryColor(q.category), background: `${getCategoryColor(q.category)}18`, padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{q.category}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0D2B5E" }}>{q.question}</span>
                <ChevronDown size={16} style={{ color: "#9CAAB8", flexShrink: 0, transform: expanded.has(q.number) ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
              </button>
              {expanded.has(q.number) && (
                <div style={{ padding: "0 18px 16px", borderTop: "1px solid #E8F2FC" }}>
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#3B8FD4", marginBottom: 6 }}>模範回答</p>
                    <p style={{ fontSize: 13, color: "#1A2B4A", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{q.answer}</p>
                  </div>
                  {q.tip && <div style={{ marginTop: 12, background: "#FFF9E6", border: "1px solid #FCD34D", borderRadius: 6, padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ fontSize: 14 }}>💡</span><p style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>{q.tip}</p></div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {!session && !loading && questions.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12, maxWidth: 500 }}>
          <Target size={32} style={{ color: "#C8DFF5", marginBottom: 12, display: "inline-block" }} />
          <p style={{ fontSize: 14, color: "#9CAAB8", fontWeight: 600 }}>候補者を選択してQ&Aを生成</p>
          <p style={{ fontSize: 12, color: "#BDD0E6", marginTop: 6 }}>上の「候補者選択」から面談を選んでください</p>
        </div>
      )}
    </div>
  );
}

// ── Document Management Tab ───────────────────────────────────────────────────
const CA_COLORS = [
  { bg: "#C8DFF5", text: "#0D2B5E" }, { bg: "#DCFCE7", text: "#166534" },
  { bg: "#FEF9C3", text: "#854D0E" }, { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#EDE9FE", text: "#5B21B6" },
];

function DocumentManagementTab({
  caProfiles, onNewDocument, onEditDocument,
}: {
  caProfiles: CAProfile[];
  onNewDocument: () => void;
  onEditDocument: (doc: CandidateDocument) => void;
}) {
  const [docs, setDocs] = useState<CandidateDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [caFilter, setCAFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "resume" | "career">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingDocs(true);
    fetchDocuments().then((d) => { setDocs(d); setLoadingDocs(false); });
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("この書類を削除しますか？")) return;
    setDeletingId(id);
    const ok = await deleteDocument(id);
    if (ok) setDocs((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
  }

  const filtered = docs.filter((d) => {
    if (caFilter !== "all" && d.caId !== caFilter && d.caName !== caFilter) return false;
    if (typeFilter !== "all" && d.documentType !== typeFilter) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 900 }}>
      {/* CA Filter tabs */}
      <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {["all", ...caProfiles.map((c) => c.id)].map((id, idx) => {
          const ca = id === "all" ? null : caProfiles.find((c) => c.id === id);
          const color = ca ? CA_COLORS[(idx - 1) % CA_COLORS.length] : { bg: "#E8F2FC", text: "#0D2B5E" };
          const label = ca ? ca.name : "すべて";
          const active = caFilter === id;
          return (
            <button key={id} onClick={() => setCAFilter(id)}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500, border: active ? `2px solid ${color.text}` : "1px solid #C8DFF5", background: active ? color.bg : "#fff", color: active ? color.text : "#4A6FA5", cursor: "pointer", transition: "all 0.15s" }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Type filter */}
      <div className="no-print" style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["all", "resume", "career"] as const).map((t) => (
          <button key={t} onClick={() => setTypeFilter(t)}
            style={{ padding: "5px 14px", borderRadius: 6, fontSize: 12, fontWeight: typeFilter === t ? 700 : 400, border: typeFilter === t ? "2px solid #1A5BA6" : "1px solid #C8DFF5", background: typeFilter === t ? "#E8F2FC" : "#fff", color: typeFilter === t ? "#0D2B5E" : "#4A6FA5", cursor: "pointer" }}>
            {t === "all" ? "すべて" : t === "resume" ? "履歴書" : "職務経歴書"}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loadingDocs ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9CAAB8" }}>読み込み中...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, background: "#F7FAFF", border: "1px dashed #C8DFF5", borderRadius: 12 }}>
          <FolderOpen size={40} style={{ color: "#C8DFF5", marginBottom: 12, display: "inline-block" }} />
          <p style={{ fontSize: 14, color: "#9CAAB8", fontWeight: 600, marginBottom: 6 }}>まだ書類が保存されていません</p>
          <p style={{ fontSize: 12, color: "#BDD0E6", marginBottom: 20 }}>履歴書・職務経歴書タブで「💾 保存する」を押すと書類が保存されます</p>
          <button onClick={onNewDocument}
            style={{ padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer" }}>
            新規作成する
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {filtered.map((doc) => (
            <div key={doc.id}
              style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: 16, cursor: "default", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3B8FD4"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(59,143,212,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#C8DFF5"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}>{doc.candidateName}</span>
                    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 600, background: doc.documentType === "resume" ? "#EBF5FF" : "#F0FFF4", color: doc.documentType === "resume" ? "#1A5BA6" : "#166534", border: `1px solid ${doc.documentType === "resume" ? "#C8DFF5" : "#86EFAC"}` }}>
                      {doc.documentType === "resume" ? "履歴書" : "職務経歴書"}
                    </span>
                  </div>
                  {doc.caName && <p style={{ fontSize: 11, color: "#9CAAB8" }}>担当CA: {doc.caName}</p>}
                  <p style={{ fontSize: 11, color: "#BDD0E6", marginTop: 2 }}>
                    {new Date(doc.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                </div>
                {doc.photoUrl && (
                  <img src={doc.photoUrl} alt="" style={{ width: 36, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid #E8F2FC" }} />
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onEditDocument(doc)}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #C8DFF5", background: "#fff", color: "#0D2B5E", cursor: "pointer" }}>
                  ✏️ 編集
                </button>
                <button onClick={() => { onEditDocument(doc); setTimeout(() => window.print(), 500); }}
                  style={{ flex: 1, padding: "6px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #C8DFF5", background: "#fff", color: "#0D2B5E", cursor: "pointer" }}>
                  🖨️ PDF出力
                </button>
                <button onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id}
                  style={{ padding: "6px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "1px solid #FCA5A5", background: "#FFF0F0", color: "#991B1B", cursor: "pointer" }}>
                  {deletingId === doc.id ? "..." : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type TabType = "resume" | "career" | "interview" | "management";

function DocumentsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: authSession } = useSession();
  const tabParam = (searchParams.get("tab") as TabType) ?? "resume";
  const candidateParam = searchParams.get("candidate");

  const [sessions, setSessions] = useState<FeedbackSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<FeedbackSession | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedData, setImportedData] = useState<ParsedDocData | null>(null);
  const [caProfiles, setCAProfiles] = useState<CAProfile[]>([]);
  const [resumeDocId, setResumeDocId] = useState<string | null>(null);
  const [careerDocId, setCareerDocId] = useState<string | null>(null);
  const [editingResumeData, setEditingResumeData] = useState<ResumeData | null>(null);
  const [editingCareerData, setEditingCareerData] = useState<CareerData | null>(null);

  useEffect(() => {
    fetchFeedbackSessions().then(setSessions);
    fetchCAProfiles().then(setCAProfiles);
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
    setImportedData(null);
    setResumeDocId(null);
    setCareerDocId(null);
    setEditingResumeData(null);
    setEditingCareerData(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("candidate", s.id);
    router.push(`/documents?${params.toString()}`);
  }

  function handleApplyImport(data: ParsedDocData) {
    setImportedData(data);
    if (data.documentType === "career") selectTab("career");
    else selectTab("resume");
  }

  function handleEditDocument(doc: CandidateDocument) {
    if (doc.documentType === "resume") {
      setEditingResumeData(doc.documentData as ResumeData);
      setResumeDocId(doc.id);
      selectTab("resume");
    } else {
      setEditingCareerData(doc.documentData as CareerData);
      setCareerDocId(doc.id);
      selectTab("career");
    }
    setImportedData(null);
  }

  const currentUser = authSession?.user
    ? { name: authSession.user.name ?? undefined, email: authSession.user.email ?? undefined }
    : null;

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "resume", label: "履歴書", icon: <FileText size={14} /> },
    { key: "career", label: "職務経歴書", icon: <Briefcase size={14} /> },
    { key: "interview", label: "面接対策", icon: <Target size={14} /> },
    { key: "management", label: "📁 書類管理", icon: null },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F3F7FC", padding: "28px 28px 60px" }}>
      {/* Header */}
      <div className="no-print" style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D2B5E", marginBottom: 4 }}>書類作成</h1>
          <p style={{ fontSize: 13, color: "#4A6FA5" }}>面談データをもとに履歴書・職務経歴書・面接対策シートをAI自動生成します</p>
        </div>
        <button onClick={() => setShowImportModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#fff", color: "#0D2B5E", border: "1px solid #C8DFF5", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", whiteSpace: "nowrap" }}>
          <Upload size={15} />📎 既存書類を読み込む
        </button>
      </div>

      {/* Candidate selector */}
      <div className="no-print" style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#4A6FA5", flexShrink: 0 }}>候補者</p>
        {selectedSession ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EBF5FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#3B8FD4" }}>
              {selectedSession.candidateName[0]}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0D2B5E" }}>{selectedSession.candidateName}</p>
              <p style={{ fontSize: 11, color: "#9CAAB8" }}>{selectedSession.meetingDate} · {selectedSession.meetingType} · 担当: {selectedSession.staffName}</p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#9CAAB8", flex: 1 }}>候補者が選択されていません</p>
        )}
        <button onClick={() => setShowCandidateModal(true)}
          style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "linear-gradient(135deg,#0D2B5E,#1A5BA6)", color: "#fff", border: "none", cursor: "pointer", flexShrink: 0 }}>
          {selectedSession ? "変更" : "選択"}
        </button>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: "flex", gap: 4, background: "#E8F2FC", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 24 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => selectTab(t.key)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 7, fontSize: 13, fontWeight: tabParam === t.key ? 700 : 500, background: tabParam === t.key ? "#fff" : "transparent", color: tabParam === t.key ? "#0D2B5E" : "#4A6FA5", border: "none", cursor: "pointer", boxShadow: tabParam === t.key ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tabParam === "resume" && (
        <ResumeTab
          session={selectedSession}
          importedData={importedData}
          existingResumeData={editingResumeData}
          caProfiles={caProfiles}
          currentUser={currentUser}
          existingDocId={resumeDocId}
          onSaved={setResumeDocId}
        />
      )}
      {tabParam === "career" && (
        <CareerTab
          session={selectedSession}
          importedData={importedData}
          existingCareerData={editingCareerData}
          caProfiles={caProfiles}
          currentUser={currentUser}
          existingDocId={careerDocId}
          onSaved={setCareerDocId}
        />
      )}
      {tabParam === "interview" && <InterviewTab session={selectedSession} />}
      {tabParam === "management" && (
        <DocumentManagementTab
          caProfiles={caProfiles}
          onNewDocument={() => selectTab("resume")}
          onEditDocument={handleEditDocument}
        />
      )}

      {/* Modals */}
      {showCandidateModal && (
        <CandidateModal sessions={sessions} onSelect={handleSelectCandidate} onClose={() => setShowCandidateModal(false)} />
      )}
      {showImportModal && (
        <DocumentImportModal onClose={() => setShowImportModal(false)} onApply={handleApplyImport} />
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: "#9CAAB8", fontSize: 13 }}>読み込み中...</div>}>
      <DocumentsPageInner />
    </Suspense>
  );
}

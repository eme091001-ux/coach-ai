"use client";
import { useState, useEffect, useRef } from "react";
import { fetchEntryRequests, updateEntryStatus, fetchStaff } from "@/lib/db";
import { EntryRequest } from "@/lib/db";
import { Staff } from "@/types";
import { AlertTriangle, ClipboardList, Users, Loader2, ChevronDown, X } from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────
const ENTRY_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "依頼中",        bg: "#FEF9C3", text: "#854D0E" },
  entered:   { label: "エントリー済",  bg: "#E8F2FC", text: "#1A5BA6" },
  adjusting: { label: "日程調整中",    bg: "#FAEEDA", text: "#854F0B" },
  confirmed: { label: "確定面接待ち",  bg: "#DCFCE7", text: "#166534" },
  done:      { label: "面接完了",      bg: "#F1F0E8", text: "#5F5E5A" },
  stopped:   { label: "進んでいない",  bg: "#FEE2E2", text: "#991B1B" },
};

const STATUS_OPTIONS = Object.entries(ENTRY_STATUS).map(([value, { label }]) => ({ value, label }));

function isStalled(entry: EntryRequest): boolean {
  if (entry.status === "stopped") return true;
  if (entry.status === "pending" || entry.status === "entered") {
    return Date.now() - new Date(entry.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;
  }
  return false;
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

// ── StatusDropdown ────────────────────────────────────────────────────────────
function StatusDropdown({
  entry,
  onUpdate,
}: {
  entry: EntryRequest;
  onUpdate: (id: string, status: EntryRequest["status"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleSelect = async (val: EntryRequest["status"]) => {
    setOpen(false);
    if (val === entry.status) return;
    setUpdating(true);
    await updateEntryStatus(entry.id, val);
    onUpdate(entry.id, val);
    setUpdating(false);
  };

  const st = ENTRY_STATUS[entry.status] ?? ENTRY_STATUS.pending;

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={updating}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: st.bg, color: st.text,
          border: "none", cursor: "pointer",
        }}
      >
        {st.label} <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", right: 0, zIndex: 20, marginTop: 4,
          background: "#fff", border: "1px solid #C8DFF5", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 140, overflow: "hidden",
        }}>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleSelect(value as EntryRequest["status"])}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 12px", fontSize: 12, color: "#0D2B5E",
                background: value === entry.status ? "#F0F7FF" : "transparent",
                border: "none", cursor: "pointer",
                fontWeight: value === entry.status ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ entry, onClose, onUpdate }: {
  entry: EntryRequest;
  onClose: () => void;
  onUpdate: (id: string, status: EntryRequest["status"]) => void;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 540, maxHeight: "90vh", overflowY: "auto", padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#0D2B5E" }}>エントリー依頼の詳細</p>
          <button onClick={onClose} style={{ color: "#9CAAB8", background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            ["求職者名", entry.candidateName],
            ["応募企業", entry.companyName],
            ["企業ID", entry.companyId ?? "—"],
            ["担当CA", entry.caName ?? "—"],
          ].map(([label, val]) => (
            <div key={label as string}>
              <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0D2B5E" }}>{val}</p>
            </div>
          ))}
        </div>

        {entry.media && entry.media.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 6 }}>エントリー媒体</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {entry.media.map((m) => (
                <span key={m} style={{ padding: "2px 10px", background: "#EBF5FF", borderRadius: 12, fontSize: 12, color: "#1A5BA6", fontWeight: 600 }}>{m}</span>
              ))}
            </div>
          </div>
        )}

        {entry.recommendation && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 6 }}>推薦文</p>
            <div style={{ background: "#F7FAFF", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#0D2B5E", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {entry.recommendation}
            </div>
          </div>
        )}

        {entry.interviewDates && entry.interviewDates.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 6 }}>面接候補日</p>
            {entry.interviewDates.filter(Boolean).map((d, i) => (
              <p key={i} style={{ fontSize: 12, color: "#0D2B5E", marginBottom: 3 }}>
                <span style={{ color: "#9CAAB8", marginRight: 6 }}>{i + 1}.</span>
                {new Date(d).toLocaleString("ja-JP")}
              </p>
            ))}
          </div>
        )}

        {(entry.resumeUrl || entry.careerUrl) && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 6 }}>書類</p>
            <div style={{ display: "flex", gap: 10 }}>
              {entry.resumeUrl && (
                <a href={entry.resumeUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "#1A5BA6", textDecoration: "underline" }}>📄 履歴書</a>
              )}
              {entry.careerUrl && (
                <a href={entry.careerUrl} target="_blank" rel="noreferrer"
                  style={{ fontSize: 12, color: "#1A5BA6", textDecoration: "underline" }}>📋 職務経歴書</a>
              )}
            </div>
          </div>
        )}

        <div style={{ borderTop: "1px solid #EBF2FC", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, color: "#9CAAB8", marginBottom: 2 }}>依頼日</p>
            <p style={{ fontSize: 12, color: "#4A6FA5" }}>{formatDate(entry.createdAt)}</p>
          </div>
          <StatusDropdown entry={entry} onUpdate={(id, status) => { onUpdate(id, status); onClose(); }} />
        </div>
      </div>
    </div>
  );
}

// ── Candidate Card ────────────────────────────────────────────────────────────
function CandidateCard({ entry, onUpdate }: {
  entry: EntryRequest;
  onUpdate: (id: string, status: EntryRequest["status"]) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const days = daysSince(entry.createdAt);
  const stalled = isStalled(entry);
  const st = ENTRY_STATUS[entry.status] ?? ENTRY_STATUS.pending;

  return (
    <>
      <div
        id={`entry-${entry.id}`}
        style={{
          background: stalled ? "#FFFBF0" : "#fff",
          border: `1px solid ${stalled ? "#FCA5A5" : "#C8DFF5"}`,
          borderRadius: 10,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          transition: "box-shadow 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 12px rgba(59,143,212,0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
      >
        {/* Left */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E", marginBottom: 2 }}>
            {entry.candidateName}
            {stalled && <span style={{ marginLeft: 8, fontSize: 10, color: "#991B1B", fontWeight: 600 }}>⚠ 要対応</span>}
          </p>
          <p style={{ fontSize: 11, color: "#9CAAB8", marginBottom: 1 }}>担当 CA: {entry.caName ?? "—"}</p>
          <p style={{ fontSize: 11, color: "#4A6FA5", fontWeight: 600 }}>{entry.companyName}</p>
        </div>

        {/* Center */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: st.bg, color: st.text }}>{st.label}</span>
          <span style={{ fontSize: 11, color: days > 7 ? "#991B1B" : "#9CAAB8", fontWeight: days > 7 ? 700 : 400 }}>
            {days}日経過
          </span>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <StatusDropdown entry={entry} onUpdate={onUpdate} />
          <button
            onClick={() => setShowDetail(true)}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#fff", color: "#0D2B5E", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            詳細
          </button>
          <button
            onClick={async () => {
              await updateEntryStatus(entry.id, "done");
              onUpdate(entry.id, "done");
            }}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #C8DFF5", background: "#F7FAFF", color: "#4A6FA5", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            完了
          </button>
        </div>
      </div>

      {showDetail && (
        <DetailModal entry={entry} onClose={() => setShowDetail(false)} onUpdate={onUpdate} />
      )}
    </>
  );
}

// ── Tab: CandidateManagementTab ───────────────────────────────────────────────
function CandidateManagementTab({
  entries,
  onUpdate,
}: {
  entries: EntryRequest[];
  onUpdate: (id: string, status: EntryRequest["status"]) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const alertRef = useRef<HTMLDivElement>(null);

  const stalled = entries.filter(isStalled);

  const statusCounts: Record<string, number> = {};
  for (const e of entries) {
    statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
  }

  const filtered = statusFilter === "all"
    ? entries
    : entries.filter((e) => e.status === statusFilter);

  const scrollToFirstStalled = () => {
    // Find first stalled entry in the current filtered list
    const firstStalled = filtered.find(isStalled) ?? stalled[0];
    if (!firstStalled) return;
    const el = document.getElementById(`entry-${firstStalled.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div>
      {/* Status bar */}
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20,
        background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, padding: "14px 16px",
      }}>
        <button
          onClick={() => setStatusFilter("all")}
          style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: statusFilter === "all" ? 700 : 500,
            border: statusFilter === "all" ? "2px solid #0D2B5E" : "1px solid #C8DFF5",
            background: statusFilter === "all" ? "#EBF5FF" : "#F7FAFF",
            color: "#0D2B5E", cursor: "pointer",
          }}
        >
          すべて <b>{entries.length}</b>
        </button>
        {STATUS_OPTIONS.filter(({ value }) => value !== "all").map(({ value, label }) => {
          const count = statusCounts[value] ?? 0;
          const s = ENTRY_STATUS[value];
          const active = statusFilter === value;
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: active ? 700 : 500,
                border: active ? `2px solid ${s.text}` : "1px solid #C8DFF5",
                background: active ? s.bg : "#F7FAFF",
                color: active ? s.text : "#4A6FA5", cursor: "pointer",
              }}
            >
              {label} <b>{count}</b>
            </button>
          );
        })}
      </div>

      {/* Alert banner */}
      {stalled.length > 0 && (
        <div
          ref={alertRef}
          style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10,
            padding: "12px 16px", marginBottom: 18, cursor: "pointer",
          }}
          onClick={scrollToFirstStalled}
        >
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>
              対応が必要な候補者が {stalled.length} 名います
            </p>
            <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
              {stalled.map((e) => (
                <li key={e.id} style={{ fontSize: 12, color: "#DC2626", marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{e.candidateName}</span>
                  {" / "}{e.companyName}
                  {" — "}
                  {e.status === "stopped"
                    ? "「進んでいない」ステータス"
                    : `エントリーから ${daysSince(e.createdAt)} 日経過`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CAAB8", fontSize: 14 }}>
          該当する候補者がいません
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((entry) => (
            <CandidateCard key={entry.id} entry={entry} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: EntryListTab ─────────────────────────────────────────────────────────
function EntryListTab({
  entries,
  staffList,
  onUpdate,
}: {
  entries: EntryRequest[];
  staffList: Staff[];
  onUpdate: (id: string, status: EntryRequest["status"]) => void;
}) {
  const [caFilter, setCaFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const stalled = entries.filter(isStalled);

  const filtered = entries.filter((e) => {
    const matchCA = caFilter === "all" || e.caId === caFilter;
    const matchStatus = statusFilter === "all" || e.status === statusFilter;
    return matchCA && matchStatus;
  });

  return (
    <div>
      {stalled.length > 0 && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10,
          padding: "12px 16px", marginBottom: 18,
        }}>
          <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 4 }}>
              停滞しているエントリーが {stalled.length} 件あります
            </p>
            <ul style={{ margin: 0, padding: "0 0 0 16px", listStyle: "disc" }}>
              {stalled.map((e) => (
                <li key={e.id} style={{ fontSize: 12, color: "#DC2626", marginBottom: 2 }}>
                  <span style={{ fontWeight: 600 }}>{e.candidateName}</span>
                  {" / "}{e.companyName}
                  {" — "}
                  {e.status === "stopped"
                    ? "「進んでいない」ステータス"
                    : `エントリーから ${daysSince(e.createdAt)} 日経過`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={caFilter}
          onChange={(e) => setCaFilter(e.target.value)}
          style={{ padding: "7px 10px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, color: "#0D2B5E", background: "#fff", cursor: "pointer" }}
        >
          <option value="all">全CA</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "7px 10px", border: "1px solid #C8DFF5", borderRadius: 8, fontSize: 13, color: "#0D2B5E", background: "#fff", cursor: "pointer" }}
        >
          <option value="all">全ステータス</option>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CAAB8", alignSelf: "center" }}>
          {filtered.length} 件
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#9CAAB8", fontSize: 14 }}>
          エントリー依頼がありません
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #C8DFF5", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F7FAFF", borderBottom: "1px solid #C8DFF5" }}>
                {["候補者名", "応募企業", "担当CA", "媒体", "ステータス", "経過", "依頼日"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#4A6FA5", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const days = daysSince(entry.createdAt);
                const stl = isStalled(entry);
                return (
                  <tr key={entry.id} style={{ borderBottom: "1px solid #EBF2FC", background: stl ? "#FFFBF0" : "transparent" }}>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#0D2B5E", fontWeight: 600 }}>
                      {entry.candidateName}
                      {stl && <span style={{ marginLeft: 6, fontSize: 10, color: "#991B1B", fontWeight: 600 }}>⚠ 停滞</span>}
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 13, color: "#4A6FA5" }}>{entry.companyName}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "#4A6FA5" }}>{entry.caName ?? "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      {entry.media && entry.media.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {entry.media.map((m) => (
                            <span key={m} style={{ padding: "1px 6px", background: "#EBF2FC", borderRadius: 4, fontSize: 10, color: "#1D4ED8" }}>{m}</span>
                          ))}
                        </div>
                      ) : <span style={{ color: "#C8DFF5", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <StatusDropdown entry={entry} onUpdate={onUpdate} />
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: days > 7 ? "#991B1B" : "#9CAAB8" }}>
                      {days}日前
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: "#9CAAB8" }}>{formatDate(entry.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EntryManagementPage() {
  const [tab, setTab] = useState<"entries" | "candidates">("entries");
  const [entries, setEntries] = useState<EntryRequest[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchEntryRequests(), fetchStaff()])
      .then(([ents, staff]) => {
        setEntries(ents);
        setStaffList(staff);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = (id: string, status: EntryRequest["status"]) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status } : e));
  };

  const TABS = [
    { key: "entries" as const, label: "エントリー依頼一覧", icon: ClipboardList },
    { key: "candidates" as const, label: "候補者管理", icon: Users },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F3F7FC", padding: "28px 28px 60px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D2B5E" }}>エントリー管理</h1>
        <p style={{ fontSize: 13, color: "#4A6FA5", marginTop: 4 }}>全CAのエントリー依頼を一括管理</p>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #E0ECF8", marginBottom: 24 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 18px", fontSize: 13, fontWeight: tab === key ? 700 : 500,
              color: tab === key ? "#0D2B5E" : "#9CAAB8",
              background: "none", border: "none", cursor: "pointer",
              borderBottom: tab === key ? "2px solid #0D2B5E" : "2px solid transparent",
              marginBottom: -2,
              transition: "color 0.15s",
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
          <Loader2 size={24} style={{ color: "#3B8FD4", animation: "spin 1s linear infinite" }} />
        </div>
      ) : tab === "entries" ? (
        <EntryListTab entries={entries} staffList={staffList} onUpdate={handleUpdate} />
      ) : (
        <CandidateManagementTab entries={entries} onUpdate={handleUpdate} />
      )}
    </div>
  );
}

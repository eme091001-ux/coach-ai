"use client";
import { useState, useEffect } from "react";
import { fetchEntryRequests, updateEntryStatus, fetchStaff } from "@/lib/db";
import { EntryRequest } from "@/lib/db";
import { Staff } from "@/types";
import { AlertTriangle, ClipboardList, BarChart2, Loader2, ChevronDown } from "lucide-react";

// ── Status config ─────────────────────────────────────────────────────────────
const ENTRY_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "依頼中",        bg: "#FEF9C3", text: "#854D0E" },
  entered:   { label: "エントリー済",  bg: "#DBEAFE", text: "#1D4ED8" },
  adjusting: { label: "日程調整中",    bg: "#FED7AA", text: "#92400E" },
  confirmed: { label: "確定面接待ち",  bg: "#D1FAE5", text: "#065F46" },
  stopped:   { label: "進んでいない",  bg: "#FEE2E2", text: "#991B1B" },
};

const STATUS_OPTIONS = Object.entries(ENTRY_STATUS).map(([value, { label }]) => ({ value, label }));

// An entry is "stalled" if:
// - status is 'stopped', OR
// - status is 'pending' or 'entered' AND created more than 7 days ago
function isStalled(entry: EntryRequest): boolean {
  if (entry.status === "stopped") return true;
  if (entry.status === "pending" || entry.status === "entered") {
    const created = new Date(entry.createdAt).getTime();
    const now = Date.now();
    return now - created > 7 * 24 * 60 * 60 * 1000;
  }
  return false;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EntryRequest["status"] }) {
  const s = ENTRY_STATUS[status] ?? ENTRY_STATUS.pending;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
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

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={updating}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: ENTRY_STATUS[entry.status]?.bg ?? "#F1F0E8",
          color: ENTRY_STATUS[entry.status]?.text ?? "#5F5E5A",
          border: "none", cursor: "pointer",
        }}
      >
        {ENTRY_STATUS[entry.status]?.label ?? entry.status}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 20, marginTop: 4,
          background: "#fff", border: "1px solid #C8DFF5", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 130, overflow: "hidden",
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

// ── EntryRow ──────────────────────────────────────────────────────────────────
function EntryRow({
  entry,
  stalled,
  onUpdate,
}: {
  entry: EntryRequest;
  stalled: boolean;
  onUpdate: (id: string, status: EntryRequest["status"]) => void;
}) {
  const days = daysSince(entry.createdAt);
  return (
    <tr style={{ borderBottom: "1px solid #EBF2FC", background: stalled ? "#FFFBF0" : "transparent" }}>
      <td style={{ padding: "10px 16px", fontSize: 13, color: "#0D2B5E", fontWeight: 600 }}>
        {entry.candidateName}
        {stalled && (
          <span style={{ marginLeft: 6, fontSize: 10, color: "#991B1B", fontWeight: 600 }}>⚠ 停滞</span>
        )}
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
      {/* Stalled alert banner */}
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

      {/* Filters */}
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

      {/* Table */}
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
              {filtered.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  stalled={isStalled(entry)}
                  onUpdate={onUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: CandidateManagementTab (placeholder) ─────────────────────────────────
function CandidateManagementTab() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", flexDirection: "column", gap: 12 }}>
      <BarChart2 size={40} color="#C8DFF5" />
      <p style={{ fontSize: 15, fontWeight: 600, color: "#9CAAB8" }}>候補者管理</p>
      <p style={{ fontSize: 13, color: "#C8DFF5" }}>プロンプトBで実装</p>
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
    { key: "candidates" as const, label: "候補者管理", icon: BarChart2 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#F3F7FC", padding: "28px 28px 60px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0D2B5E" }}>エントリー管理</h1>
        <p style={{ fontSize: 13, color: "#4A6FA5", marginTop: 4 }}>全CAのエントリー依頼を一括管理</p>
      </div>

      {/* Tabs */}
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
        <CandidateManagementTab />
      )}
    </div>
  );
}

"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  fetchFeedbackSessions,
  fetchCAProfiles,
  fetchUserRole,
} from "@/lib/db";
import { FeedbackSession, CAProfile, InterviewPhase } from "@/types";
import { formatDate, scoreColor } from "@/lib/utils";
import { Plus, Loader2 } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const PHASES: (InterviewPhase | "all")[] = [
  "all",
  "1次面談",
  "2次面談",
  "求人提案",
  "内定後フォロー",
];
const PHASE_LABELS: Record<string, string> = { all: "すべて" };

const CA_COLORS = [
  { bg: "#C8DFF5", text: "#0D2B5E" },
  { bg: "#DCFCE7", text: "#166534" },
  { bg: "#FEF9C3", text: "#854D0E" },
  { bg: "#FEE2E2", text: "#991B1B" },
  { bg: "#EDE9FE", text: "#5B21B6" },
];

const PHASE_BADGE: Record<string, { bg: string; text: string }> = {
  "1次面談":       { bg: "#E8F2FC", text: "#1A5BA6" },
  "2次面談":       { bg: "#DCFCE7", text: "#166534" },
  "求人提案":      { bg: "#FEF9C3", text: "#854D0E" },
  "内定後フォロー": { bg: "#FEE2E2", text: "#991B1B" },
};

const DEFAULT_PHASE_COLOR = { bg: "#F3F4F6", text: "#6B7280" };

function getCAColor(index: number) {
  return CA_COLORS[Math.min(index, CA_COLORS.length - 1)];
}

function initials(name: string) {
  return name.replace(/\s+/g, "").slice(0, 2);
}

function getThisMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getLastMonth() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
  };
}

// ── Summary Cards ─────────────────────────────────────────────────────────────
function SummaryCards({ sessions }: { sessions: FeedbackSession[] }) {
  const thisMonthStart = getThisMonth();
  const { start: lastStart, end: lastEnd } = getLastMonth();

  const thisMonth = sessions.filter(
    (s) => new Date(s.createdAt) >= thisMonthStart
  );
  const lastMonth = sessions.filter((s) => {
    const d = new Date(s.createdAt);
    return d >= lastStart && d <= lastEnd;
  });

  const thisCount = thisMonth.length;
  const lastCount = lastMonth.length;
  const countDiff = thisCount - lastCount;

  const thisAvg =
    thisMonth.length > 0
      ? Math.round(
          thisMonth.reduce((a, s) => a + s.totalScore, 0) / thisMonth.length
        )
      : 0;
  const lastAvg =
    lastMonth.length > 0
      ? Math.round(
          lastMonth.reduce((a, s) => a + s.totalScore, 0) / lastMonth.length
        )
      : 0;
  const avgDiff = thisAvg - lastAvg;

  const proposalCount = sessions.filter(
    (s) => s.interviewPhase === "求人提案"
  ).length;
  const offerCount = sessions.filter(
    (s) => s.interviewPhase === "内定後フォロー"
  ).length;

  const cards = [
    {
      label: "今月の面談件数",
      value: String(thisCount),
      sub:
        lastCount > 0
          ? `${countDiff >= 0 ? "▲" : "▼"} 前月比 ${Math.abs(countDiff)}件`
          : "前月データなし",
      subColor: countDiff >= 0 ? "#3B8FD4" : "#EF4444",
    },
    {
      label: "平均スコア",
      value: String(thisAvg) || "—",
      sub:
        lastAvg > 0
          ? `${avgDiff >= 0 ? "▲" : "▼"} 前月比 ${Math.abs(avgDiff)}pt`
          : "前月データなし",
      subColor: avgDiff >= 0 ? "#3B8FD4" : "#EF4444",
    },
    {
      label: "求人提案中",
      value: String(proposalCount),
      sub: "名の求職者",
      subColor: "#7A96C2",
    },
    {
      label: "内定後フォロー",
      value: String(offerCount),
      sub: "名の求職者",
      subColor: "#7A96C2",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-[10px] p-4"
          style={{ background: "#fff", border: "1px solid #D0DFF5" }}
        >
          <p
            className="mb-1.5 uppercase"
            style={{ fontSize: 11, color: "#7A96C2", letterSpacing: "0.04em" }}
          >
            {c.label}
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#0D2B5E", lineHeight: 1.1 }}>
            {c.value}
          </p>
          <p style={{ fontSize: 11, color: c.subColor, marginTop: 4 }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session }: { session: FeedbackSession }) {
  const router = useRouter();
  const phaseBadge = session.interviewPhase
    ? PHASE_BADGE[session.interviewPhase] ?? DEFAULT_PHASE_COLOR
    : null;
  const avatarColor = phaseBadge ?? DEFAULT_PHASE_COLOR;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/feedback/${session.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/feedback/${session.id}`)}
      className="flex items-center gap-4 px-5 py-4 border-b last:border-0 transition-all cursor-pointer group"
      style={{ borderColor: "#EEF2F8" }}
    >
      {/* Avatar */}
      <div
        className="shrink-0 flex items-center justify-center rounded-[10px] text-sm font-bold"
        style={{
          width: 44,
          height: 44,
          background: avatarColor.bg,
          color: avatarColor.text,
        }}
      >
        {initials(session.candidateName)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{ fontSize: 14, fontWeight: 700, color: "#0D2B5E" }}
        >
          {session.candidateName}
        </p>
        <p className="truncate" style={{ fontSize: 12, color: "#7A96C2", marginTop: 2 }}>
          {session.staffName} · {formatDate(session.meetingDate)}
        </p>
      </div>

      {/* Right: phase badge + score */}
      <div className="flex items-center gap-3 shrink-0">
        {phaseBadge && session.interviewPhase && (
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-md"
            style={{ background: phaseBadge.bg, color: phaseBadge.text }}
          >
            {session.interviewPhase}
          </span>
        )}
        <span
          className={scoreColor(session.totalScore)}
          style={{ fontSize: 20, fontWeight: 800, minWidth: 32, textAlign: "right" }}
        >
          {session.totalScore}
        </span>
      </div>
    </div>
  );
}

// ── Inner Page (uses useSearchParams) ────────────────────────────────────────
function FeedbackPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: authSession } = useSession();

  const selectedCA = searchParams.get("ca") ?? "all";
  const selectedPhase = searchParams.get("phase") ?? "all";

  const [allSessions, setAllSessions] = useState<FeedbackSession[]>([]);
  const [caProfiles, setCAProfiles] = useState<CAProfile[]>([]);
  const [userRole, setUserRole] = useState<"admin" | "manager" | "ca">("admin");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load CA profiles + sessions + user role
  useEffect(() => {
    Promise.all([fetchFeedbackSessions(), fetchCAProfiles()]).then(
      ([sessions, profiles]) => {
        setAllSessions(sessions);
        setCAProfiles(profiles);
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    const email = authSession?.user?.email ?? null;
    setCurrentUserEmail(email);
    if (email) {
      fetchUserRole(email).then(setUserRole);
    }
  }, [authSession]);

  // Update URL params
  const setFilter = (ca: string, phase: string) => {
    const params = new URLSearchParams();
    if (ca !== "all") params.set("ca", ca);
    if (phase !== "all") params.set("phase", phase);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Which CAs to show as tabs
  const visibleCAProfiles = useMemo(() => {
    if (userRole === "ca" && currentUserEmail) {
      const own = caProfiles.find(
        (p) => p.email?.toLowerCase() === currentUserEmail.toLowerCase()
      );
      return own ? [own] : caProfiles;
    }
    return caProfiles;
  }, [caProfiles, userRole, currentUserEmail]);

  // Count per CA (key = id OR name for mock data)
  const caCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of allSessions) {
      const key = s.staffId ?? s.staffName ?? "";
      if (key) m[key] = (m[key] ?? 0) + 1;
    }
    return m;
  }, [allSessions]);

  const getCACount = (profile: CAProfile) =>
    caCountMap[profile.id] ?? caCountMap[profile.name] ?? 0;

  // Filtered sessions for display
  const filteredSessions = useMemo(() => {
    let result = allSessions;
    if (selectedCA !== "all") {
      const profile = caProfiles.find((p) => p.id === selectedCA);
      result = result.filter(
        (s) =>
          s.staffId === selectedCA ||
          (profile && s.staffName === profile.name)
      );
    }
    if (selectedPhase !== "all") {
      result = result.filter((s) => s.interviewPhase === selectedPhase);
    }
    return result;
  }, [allSessions, selectedCA, selectedPhase, caProfiles]);

  // If CA role with auto-select: default to own tab
  useEffect(() => {
    if (
      userRole === "ca" &&
      currentUserEmail &&
      selectedCA === "all" &&
      visibleCAProfiles.length === 1
    ) {
      const id = visibleCAProfiles[0].id;
      setFilter(id, selectedPhase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, currentUserEmail, visibleCAProfiles]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ── */}
      <div
        className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{ background: "#fff", borderBottom: "1px solid #D0DFF5" }}
      >
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#0D2B5E" }}>
            面談一覧
          </h1>
          <p style={{ fontSize: 12, color: "#7A96C2", marginTop: 2 }}>
            全CAの面談履歴・フィードバックを管理
          </p>
        </div>
        <Link href="/new">
          <button
            className="flex items-center gap-1.5 text-white text-sm font-medium px-4 py-2.5 transition-colors hover:opacity-90"
            style={{ background: "#0D2B5E", borderRadius: 8 }}
          >
            <Plus size={14} /> 新規面談
          </button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* ── CA Tabs ── */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* All tab */}
          <button
            onClick={() => setFilter("all", selectedPhase)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={
              selectedCA === "all"
                ? { background: "#0D2B5E", border: "1.5px solid #0D2B5E", color: "#fff" }
                : { background: "#fff", border: "1.5px solid #D0DFF5", color: "#4A6FA5" }
            }
          >
            <span
              className="flex items-center justify-center text-[11px] font-bold rounded-full"
              style={{
                width: 22,
                height: 22,
                background: selectedCA === "all" ? "rgba(255,255,255,0.2)" : "#E8F2FC",
                color: selectedCA === "all" ? "#fff" : "#0D2B5E",
              }}
            >
              全
            </span>
            すべて
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full"
              style={{
                background: selectedCA === "all" ? "rgba(255,255,255,0.2)" : "#EEF2F8",
                color: selectedCA === "all" ? "#fff" : "#7A96C2",
              }}
            >
              {allSessions.length}
            </span>
          </button>

          {/* Per-CA tabs */}
          {visibleCAProfiles.map((profile, idx) => {
            const color = getCAColor(idx);
            const isActive = selectedCA === profile.id;
            const count = getCACount(profile);
            return (
              <button
                key={profile.id}
                onClick={() => setFilter(profile.id, selectedPhase)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={
                  isActive
                    ? { background: "#0D2B5E", border: "1.5px solid #0D2B5E", color: "#fff" }
                    : { background: "#fff", border: "1.5px solid #D0DFF5", color: "#4A6FA5" }
                }
              >
                <span
                  className="flex items-center justify-center text-[11px] font-bold rounded-full shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    background: isActive ? "rgba(255,255,255,0.2)" : color.bg,
                    color: isActive ? "#fff" : color.text,
                  }}
                >
                  {profile.name.replace(/\s+/g, "").slice(0, 1)}
                </span>
                {profile.name.split(/\s+/)[0]}
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? "rgba(255,255,255,0.2)" : "#EEF2F8",
                    color: isActive ? "#fff" : "#7A96C2",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Phase pills ── */}
        <div className="flex flex-wrap gap-2 mb-5">
          {PHASES.map((phase) => {
            const label = PHASE_LABELS[phase] ?? phase;
            const isActive = selectedPhase === phase;
            return (
              <button
                key={phase}
                onClick={() => setFilter(selectedCA, phase)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={
                  isActive
                    ? { background: "#3B8FD4", border: "1px solid #3B8FD4", color: "#fff" }
                    : { background: "#fff", border: "1px solid #C8DFF5", color: "#4A6FA5" }
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Summary Cards ── */}
        <SummaryCards sessions={filteredSessions} />

        {/* ── Session list ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={22} className="animate-spin text-gray-300" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div
            className="rounded-xl py-16 text-center"
            style={{ border: "1px solid #D0DFF5", background: "#fff" }}
          >
            <p style={{ fontSize: 14, color: "#7A96C2" }}>
              該当する面談がありません
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid #D0DFF5", background: "#fff" }}
          >
            <div
              className="px-5 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid #EEF2F8" }}
            >
              <p style={{ fontSize: 12, color: "#7A96C2" }}>
                {filteredSessions.length}件
              </p>
            </div>
            {filteredSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page export (Suspense required for useSearchParams) ────────────────────────
export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 size={22} className="animate-spin text-gray-300" />
        </div>
      }
    >
      <FeedbackPageInner />
    </Suspense>
  );
}

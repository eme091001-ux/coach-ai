"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Plus,
  FileText,
  TrendingUp,
  BarChart2,
  Users,
  Settings,
  LogOut,
  LucideIcon,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFeedbackSessions, fetchUserRole } from "@/lib/db";

// ── Logo ──────────────────────────────────────────────────────────────────────
function HexLogo() {
  return (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <polygon
        points="18,2.5 32,10 32,26 18,33.5 4,26 4,10"
        fill="rgba(59,143,212,0.3)"
        stroke="rgba(59,143,212,0.5)"
        strokeWidth="1.5"
      />
      <text
        x="18"
        y="23.5"
        textAnchor="middle"
        fill="white"
        fontSize="13"
        fontWeight="700"
        fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
      >
        F
      </text>
    </svg>
  );
}

// ── Nav data ──────────────────────────────────────────────────────────────────
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
  exact?: boolean;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "メイン",
    items: [
      { href: "/", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
      { href: "/feedback", label: "面談一覧", icon: MessageSquare, badge: true },
      { href: "/new", label: "新規面談", icon: Plus, exact: true },
      { href: "/documents", label: "書類作成", icon: FileText },
    ],
  },
  {
    label: "分析",
    items: [
      { href: "/growth", label: "成長トラッキング", icon: TrendingUp },
      { href: "/manager", label: "チーム比較", icon: BarChart2 },
    ],
  },
  {
    label: "管理",
    items: [
      { href: "/ca-management", label: "CA管理", icon: Users },
      { href: "/entry-management", label: "エントリー管理", icon: ClipboardList },
      { href: "/settings", label: "設定", icon: Settings },
    ],
  },
];

// ── NavLink component ─────────────────────────────────────────────────────────
function NavLink({
  item,
  isActive,
  badgeCount,
}: {
  item: NavItem;
  isActive: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-[13px] transition-all relative",
        isActive
          ? "font-medium text-white"
          : "text-white/55 hover:text-white/85 hover:bg-white/[0.06]"
      )}
      style={isActive ? { background: "rgba(59,143,212,0.2)" } : {}}
    >
      {isActive && (
        <span
          style={{
            position: "absolute",
            left: -8,
            top: "50%",
            transform: "translateY(-50%)",
            width: 3,
            height: 16,
            background: "#3B8FD4",
            borderRadius: "0 2px 2px 0",
          }}
        />
      )}
      <item.icon size={14} className="shrink-0" />
      <span className="flex-1 min-w-0 truncate">{item.label}</span>
      {item.badge && badgeCount !== undefined && badgeCount > 0 && (
        <span
          className="text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          style={{ background: "rgba(59,143,212,0.8)", lineHeight: 1.4 }}
        >
          {badgeCount}
        </span>
      )}
    </Link>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sessionCount, setSessionCount] = useState(0);
  const [userRoleLabel, setUserRoleLabel] = useState("メンバー");

  useEffect(() => {
    fetchFeedbackSessions().then((s) => setSessionCount(s.length));
  }, []);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetchUserRole(session.user.email).then((role) => {
      const labels: Record<string, string> = {
        admin: "Admin",
        manager: "Manager",
        ca: "CA",
      };
      setUserRoleLabel(labels[role] ?? "メンバー");
    });
  }, [session]);

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside
      className="flex flex-col h-screen shrink-0"
      style={{ width: 220, background: "#0D2B5E" }}
    >
      {/* ── Logo ── */}
      <div
        className="px-5 pt-6 pb-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        <div className="flex items-center gap-3">
          <HexLogo />
          <div>
            <p
              style={{
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.2,
              }}
            >
              Funrix AI Coach
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginTop: 3,
              }}
            >
              Career Platform
            </p>
          </div>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 py-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <p
              className="px-5 mb-1.5"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontSize: 9.5,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {section.label}
            </p>
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item)}
                badgeCount={item.badge ? sessionCount : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      {session?.user && (
        <div
          className="px-4 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        >
          <div className="flex items-center gap-2.5">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                width={34}
                height={34}
                className="rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div
                className="shrink-0 rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                style={{ width: 34, height: 34, background: "#1A5BA6" }}
              >
                {(session.user.name?.[0] ?? session.user.email?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="truncate"
                style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}
              >
                {session.user.name ?? "ユーザー"}
              </p>
              <p
                className="truncate"
                style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
              >
                {userRoleLabel}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 transition-colors"
              style={{ color: "rgba(255,255,255,0.35)" }}
              title="ログアウト"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

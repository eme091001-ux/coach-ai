"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Plus,
  Users,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/feedback", label: "フィードバック一覧", icon: MessageSquare },
  { href: "/growth", label: "成長トラッキング", icon: TrendingUp },
  { href: "/manager", label: "上司レビュー", icon: UserCheck },
  { href: "/staff", label: "担当者管理", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside
      className="w-56 shrink-0 flex flex-col"
      style={{ background: "linear-gradient(135deg, #0D2B5E 0%, #1A5BA6 60%, #2E7FC4 100%)" }}
    >
      <div className="px-4 py-5 border-b border-white/10">
        <p className="text-sm font-bold text-white tracking-tight">Funrix</p>
        <p className="text-xs text-white/50 mt-0.5">AI Coach</p>
      </div>

      <nav className="flex-1 py-3">
        <p className="px-4 text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1">
          メニュー
        </p>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-white/15 text-white font-medium"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon size={15} className="shrink-0" />
            {label}
          </Link>
        ))}

        <p className="px-4 text-[10px] font-medium text-white/40 uppercase tracking-wider mt-4 mb-1">
          アクション
        </p>
        <Link
          href="/new"
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
            pathname === "/new"
              ? "bg-white/15 text-white font-medium"
              : "text-white/65 hover:bg-white/10 hover:text-white"
          )}
        >
          <Plus size={15} className="shrink-0" />
          面談を登録
        </Link>
      </nav>

      {/* User info */}
      {session?.user && (
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-medium shrink-0">
                {session.user.name?.[0] ?? "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                {session.user.name}
              </p>
              <p className="text-[10px] text-white/50 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            <LogOut size={11} />
            ログアウト
          </button>
        </div>
      )}
    </aside>
  );
}

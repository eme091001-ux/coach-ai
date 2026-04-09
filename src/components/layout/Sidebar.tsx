"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, TrendingUp, UserCheck, Plus, Users } from "lucide-react";
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

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">CoachAI</p>
        <p className="text-xs text-gray-400 mt-0.5">面談フィードバック</p>
      </div>

      <nav className="flex-1 py-3">
        <p className="px-4 text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
          メニュー
        </p>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-emerald-50 text-emerald-800 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon size={15} className="shrink-0" />
            {label}
          </Link>
        ))}

        <p className="px-4 text-[10px] font-medium text-gray-400 uppercase tracking-wider mt-4 mb-1">
          アクション
        </p>
        <Link
          href="/new"
          className={cn(
            "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
            pathname === "/new"
              ? "bg-emerald-50 text-emerald-800 font-medium"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <Plus size={15} className="shrink-0" />
          面談を登録
        </Link>
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">自社内テナント</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">tenant_001</p>
      </div>
    </aside>
  );
}

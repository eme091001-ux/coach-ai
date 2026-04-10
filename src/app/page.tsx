"use client";
import Link from "next/link";
import { MOCK_SESSIONS } from "@/lib/mockData";
import { scoreColor, scoreBadge, formatDate, cn } from "@/lib/utils";
import { AlertTriangle, TrendingUp, Users, FileText, Plus } from "lucide-react";

const TEAM_STATS = [
  { name: "田中 美咲", avg: 84, count: 11, color: "bg-teal-100 text-teal-800" },
  { name: "鈴木 健太", avg: 78, count: 9,  color: "bg-blue-100 text-blue-800" },
  { name: "佐藤 優",   avg: 61, count: 14, color: "bg-amber-100 text-amber-800" },
  { name: "松本 大輝", avg: 54, count: 13, color: "bg-orange-100 text-orange-800" },
];

const THEME_RANK = [
  { theme: "クロージング力", count: 9, pct: 90 },
  { theme: "ヒアリング力",   count: 7, pct: 70 },
  { theme: "次アクション設定", count: 5, pct: 50 },
  { theme: "信頼関係構築",   count: 3, pct: 30 },
];

function initials(name: string) { return name.replace(" ", "").slice(0, 2); }

export default function DashboardPage() {
  const unconfirmed = MOCK_SESSIONS.filter((s) => s.status === "未確認").length;
  const avgScore = Math.round(MOCK_SESSIONS.reduce((a, s) => a + s.totalScore, 0) / MOCK_SESSIONS.length);
  const lowSessions = [...MOCK_SESSIONS].sort((a, b) => a.totalScore - b.totalScore).slice(0, 2);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">ダッシュボード</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-brand-pale text-brand-navy px-3 py-1 rounded-full">2026年4月</span>
          <Link href="/new">
            <button className="flex items-center gap-1.5 text-sm bg-brand-navy hover:bg-brand-blue text-white px-4 py-2 rounded-lg transition-colors">
              <Plus size={14} /> 面談を登録
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "今月の面談数", value: "47", sub: "▲ 前月比 +12%", subColor: "text-brand-sky", icon: FileText },
          { label: "平均スコア", value: String(avgScore), sub: "▲ 前月比 +4pt", subColor: "text-brand-sky", icon: TrendingUp },
          { label: "承諾率（平均）", value: "38%", sub: "▼ 目標 45%", subColor: "text-red-500", icon: Users },
          { label: "未確認FB", value: String(unconfirmed) + "件", sub: "要確認", subColor: "text-amber-600", icon: AlertTriangle },
        ].map(({ label, value, sub, subColor, icon: Icon }) => (
          <div key={label} className="bg-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">{label}</p>
              <Icon size={14} className="text-gray-400" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            <p className={cn("text-xs mt-1", subColor)}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <p className="text-sm font-medium text-gray-900">担当者別 平均スコア</p>
          </div>
          {TEAM_STATS.map((s) => (
            <div key={s.name} className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0", s.color)}>
                {initials(s.name)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{s.name}</p>
                <p className="text-xs text-gray-400">今月 {s.count}面談</p>
              </div>
              <span className={cn("text-xl font-semibold", scoreColor(s.avg))}>{s.avg}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">チーム改善テーマ（上位）</p>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">最多: クロージング力</span>
            <p className="text-xs text-gray-400 mt-1 mb-3">9名 / 全担当者の56%</p>
            {THEME_RANK.map((t) => (
              <div key={t.theme} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">{t.theme}</span>
                  <span className="font-medium">{t.count}件</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", t.pct >= 70 ? "bg-red-400" : t.pct >= 50 ? "bg-amber-400" : "bg-brand-sky")} style={{ width: t.pct + "%" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">最近の低評価面談</p>
            {lowSessions.map((s) => {
              const badge = scoreBadge(s.totalScore);
              return (
                <Link key={s.id} href={"/feedback/" + s.id}>
                  <div className={cn("p-3 rounded-lg mb-2 border-l-4 cursor-pointer hover:opacity-80", s.totalScore < 55 ? "bg-red-50 border-red-400" : "bg-amber-50 border-amber-400")}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-800">{s.staffName} — {s.meetingType}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", badge.className)}>{s.totalScore}点</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{s.nextTheme} が課題</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

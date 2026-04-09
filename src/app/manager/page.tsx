"use client";
import Link from "next/link";
import { MOCK_SESSIONS } from "@/lib/mockData";
import { scoreColor, scoreBadge, formatDate, cn } from "@/lib/utils";
import { AlertTriangle, Clock, ChevronRight } from "lucide-react";

const ATTENTION = [
  { name: "松本 大輝", color: "bg-orange-100 text-orange-800", issue: "3ヶ月連続60点以下 ・ クロージング / 次アクション", badge: "要介入", badgeClass: "bg-red-100 text-red-700" },
  { name: "佐藤 優",   color: "bg-amber-100 text-amber-800",  issue: "2ヶ月改善停滞 ・ 課題抽出 / 提案力", badge: "要観察", badgeClass: "bg-amber-100 text-amber-700" },
];

function initials(name: string) { return name.replace(" ", "").slice(0, 2); }

export default function ManagerPage() {
  const unconfirmed = MOCK_SESSIONS.filter((s) => s.status === "未確認");
  const all = [...MOCK_SESSIONS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">上司レビュー</h1>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">未確認フィードバック</p>
          <p className="text-2xl font-semibold text-red-500">{unconfirmed.length}件</p>
          <p className="text-xs text-gray-400 mt-1">今週中に確認推奨</p>
        </div>
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">1on1 要フォロー</p>
          <p className="text-2xl font-semibold text-amber-600">{ATTENTION.length}名</p>
          <p className="text-xs text-gray-400 mt-1">低スコア継続中</p>
        </div>
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">今月レビュー完了率</p>
          <p className="text-2xl font-semibold text-gray-900">68%</p>
          <p className="text-xs text-gray-400 mt-1">32件 / 47件</p>
        </div>
      </div>

      {/* 要1on1 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" />
          <p className="text-sm font-medium text-gray-900">要1on1 — 低スコア継続担当者</p>
        </div>
        {ATTENTION.map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium shrink-0", a.color)}>
              {initials(a.name)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{a.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{a.issue}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2.5 py-1 rounded-full", a.badgeClass)}>{a.badge}</span>
              <button className="text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                <Clock size={11} /> 1on1設定
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 未確認フィードバック */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-medium text-gray-900">未確認フィードバック</p>
        </div>
        {unconfirmed.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">すべて確認済みです</div>
        ) : (
          unconfirmed.map((s) => {
            const badge = scoreBadge(s.totalScore);
            return (
              <Link key={s.id} href={`/feedback/${s.id}`}>
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-700 shrink-0">
                    {initials(s.staffName)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{s.staffName} ・ {s.meetingType}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.meetingDate)} ・ {s.id}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", badge.className)}>{badge.label}</span>
                    <span className={cn("text-xl font-semibold w-10 text-right", scoreColor(s.totalScore))}>{s.totalScore}</span>
                    <button className="text-xs bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors">
                      確認する
                    </button>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* 全フィードバック */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-medium text-gray-900">全フィードバック（直近）</p>
        </div>
        {all.map((s) => {
          const badge = scoreBadge(s.totalScore);
          return (
            <Link key={s.id} href={`/feedback/${s.id}`}>
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-700 shrink-0">
                  {initials(s.staffName)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{s.staffName} ・ {s.meetingType}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.meetingDate)} ・ {s.candidateName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", badge.className)}>{badge.label}</span>
                  <span className={cn("text-xl font-semibold w-10 text-right", scoreColor(s.totalScore))}>{s.totalScore}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full",
                    s.status === "未確認" ? "bg-red-100 text-red-700" :
                    s.status === "確認済" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                  )}>{s.status}</span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

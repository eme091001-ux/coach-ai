"use client";
import { useState } from "react";
import { STAFF_LIST } from "@/lib/mockData";
import { SCORE_LABELS, cn } from "@/lib/utils";

const MONTHLY_DATA: Record<string, number[]> = {
  "田中 美咲": [66, 71, 76, 84],
  "鈴木 健太": [70, 72, 75, 78],
  "佐藤 優":   [55, 57, 59, 61],
  "松本 大輝": [60, 55, 52, 54],
};

const SCORE_DATA: Record<string, Record<string, number>> = {
  "田中 美咲": { trust: 9, hearing: 8, extraction: 8, proposal: 7, closing: 5, nextAction: 6, communication: 8, initiative: 9 },
  "鈴木 健太": { trust: 8, hearing: 7, extraction: 7, proposal: 8, closing: 7, nextAction: 7, communication: 7, initiative: 7 },
  "佐藤 優":   { trust: 7, hearing: 6, extraction: 4, proposal: 3, closing: 4, nextAction: 4, communication: 7, initiative: 5 },
  "松本 大輝": { trust: 6, hearing: 5, extraction: 5, proposal: 6, closing: 2, nextAction: 3, communication: 6, initiative: 4 },
};

const THEMES: Record<string, { theme: string; status: "改善済" | "改善中" | "未着手"; month: string }[]> = {
  "田中 美咲": [
    { theme: "信頼関係構築", status: "改善済", month: "1月" },
    { theme: "ヒアリングの深さ", status: "改善済", month: "2月" },
    { theme: "クロージング力", status: "改善中", month: "4月" },
  ],
  "鈴木 健太": [
    { theme: "提案力", status: "改善済", month: "2月" },
    { theme: "クロージング力", status: "改善中", month: "3月" },
  ],
  "佐藤 優": [
    { theme: "課題抽出力", status: "改善中", month: "3月" },
    { theme: "提案力", status: "未着手", month: "—" },
  ],
  "松本 大輝": [
    { theme: "クロージング力", status: "改善中", month: "4月" },
    { theme: "次アクション設定", status: "未着手", month: "—" },
  ],
};

const MONTHS = ["1月", "2月", "3月", "4月"];
const MAX_H = 120;

export default function GrowthPage() {
  const [selected, setSelected] = useState("田中 美咲");
  const scores = MONTHLY_DATA[selected];
  const itemScores = SCORE_DATA[selected];
  const themes = THEMES[selected];
  const latest = scores[scores.length - 1];
  const oldest = scores[0];
  const diff = latest - oldest;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">成長トラッキング</h1>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {STAFF_LIST.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">直近スコア</p>
          <p className="text-2xl font-semibold text-gray-900">{latest}<span className="text-sm text-gray-400">/100</span></p>
        </div>
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">3ヶ月の変化</p>
          <p className={cn("text-2xl font-semibold", diff > 0 ? "text-emerald-600" : "text-red-500")}>
            {diff > 0 ? "+" : ""}{diff}pt
          </p>
        </div>
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">改善テーマ達成</p>
          <p className="text-2xl font-semibold text-gray-900">
            {themes.filter((t) => t.status === "改善済").length}
            <span className="text-sm text-gray-400">/{themes.length}件</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* 月別スコア推移（SVGグラフ） */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-900 mb-4">月別スコア推移</p>
          <div className="relative" style={{ height: MAX_H + 40 }}>
            <svg width="100%" height={MAX_H + 40} viewBox={`0 0 300 ${MAX_H + 40}`}>
              {/* Grid lines */}
              {[50, 60, 70, 80, 90, 100].map((v) => {
                const y = MAX_H - ((v - 50) / 50) * MAX_H + 10;
                return (
                  <g key={v}>
                    <line x1="30" y1={y} x2="290" y2={y} stroke="#f3f4f6" strokeWidth="1" />
                    <text x="25" y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">{v}</text>
                  </g>
                );
              })}
              {/* Line */}
              <polyline
                points={scores.map((s, i) => {
                  const x = 30 + (i / (scores.length - 1)) * 260;
                  const y = MAX_H - ((s - 50) / 50) * MAX_H + 10;
                  return `${x},${y}`;
                }).join(" ")}
                fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              {/* Dots + labels */}
              {scores.map((s, i) => {
                const x = 30 + (i / (scores.length - 1)) * 260;
                const y = MAX_H - ((s - 50) / 50) * MAX_H + 10;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="#10b981" />
                    <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fill="#374151" fontWeight="500">{s}</text>
                    <text x={x} y={MAX_H + 28} textAnchor="middle" fontSize="10" fill="#9ca3af">{MONTHS[i]}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 項目別スコア */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-900 mb-3">項目別スコア</p>
          <div className="space-y-2.5">
            {(Object.keys(SCORE_LABELS) as (keyof typeof SCORE_LABELS)[]).map((key) => {
              const val = itemScores[key] || 0;
              const pct = (val / 10) * 100;
              const color = val >= 7 ? "bg-emerald-500" : val >= 5 ? "bg-amber-400" : "bg-red-400";
              return (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{SCORE_LABELS[key]}</span>
                    <span className="font-medium text-gray-800">{val}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 改善テーマ履歴 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-medium text-gray-900">改善テーマ履歴</p>
        </div>
        {themes.map((t, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{t.theme}</p>
              <p className="text-xs text-gray-400">{t.month} 設定</p>
            </div>
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full",
              t.status === "改善済" ? "bg-emerald-100 text-emerald-700" :
              t.status === "改善中" ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-500"
            )}>
              {t.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

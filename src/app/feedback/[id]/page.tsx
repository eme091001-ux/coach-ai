"use client";
import { use, useState } from "react";
import { notFound } from "next/navigation";
import { MOCK_SESSIONS } from "@/lib/mockData";
import { ScoreBar, ScoreCircle } from "@/components/ui/ScoreBar";
import { SCORE_LABELS, formatDate, cn } from "@/lib/utils";
import { CheckCircle, AlertCircle, XCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";

const TABS = ["フィードバック", "スコア", "KPI影響", "上司コメント"] as const;
type Tab = typeof TABS[number];

export default function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = MOCK_SESSIONS.find((s) => s.id === id);
  if (!session) notFound();

  const [tab, setTab] = useState<Tab>("フィードバック");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/feedback" className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft size={16} className="text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">
            {session.staffName} — {session.meetingType}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatDate(session.meetingDate)} ・ {session.candidateName} ・ {session.id}
          </p>
        </div>
        <span className={cn(
          "text-xs px-2.5 py-1 rounded-full",
          session.status === "未確認" ? "bg-red-100 text-red-700" :
          session.status === "確認済" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
        )}>
          {session.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm border-b-2 transition-colors",
              tab === t
                ? "border-emerald-500 text-emerald-700 font-medium"
                : "border-transparent text-gray-400 hover:text-gray-700"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">

          {tab === "フィードバック" && (
            <>
              {/* 良かった点 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-500" /> 良かった点 — 再現すべき行動
                </h2>
                <div className="space-y-2">
                  {session.goodPoints.map((p, i) => (
                    <div key={i} className="text-sm text-gray-700 bg-emerald-50 border-l-4 border-emerald-400 px-4 py-2.5 rounded-r-lg leading-relaxed">
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* 改善点 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-500" /> 改善点
                </h2>
                <div className="space-y-2">
                  {session.improvements.map((p, i) => (
                    <div key={i} className="text-sm text-gray-700 bg-amber-50 border-l-4 border-amber-400 px-4 py-2.5 rounded-r-lg leading-relaxed">
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              {/* 致命的改善ポイント */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <XCircle size={15} className="text-red-500" /> 致命的な改善ポイント
                </h2>
                {session.criticalPoints.map((p, i) => (
                  <div key={i} className="text-sm text-gray-700 bg-red-50 border-l-4 border-red-500 px-4 py-2.5 rounded-r-lg leading-relaxed">
                    {p}
                  </div>
                ))}
              </div>

              {/* セリフ改善例 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3">セリフ改善例</h2>
                <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed font-mono">
                  {session.scriptExample}
                </pre>
              </div>

              {/* トップ営業との差分 */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3">トップ営業との差分</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{session.topPerformerGap}</p>
              </div>
            </>
          )}

          {tab === "スコア" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">スコア詳細（各10点満点）</h2>
              {(Object.keys(session.scores) as (keyof typeof session.scores)[]).map((key) => (
                <ScoreBar key={key} label={SCORE_LABELS[key]} score={session.scores[key]} />
              ))}
            </div>
          )}

          {tab === "KPI影響" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">KPIへの影響分析</h2>
              <div className="space-y-3">
                {[
                  { label: "承諾率", value: session.kpiImpact.acceptance },
                  { label: "応募率", value: session.kpiImpact.application },
                  { label: "面接率", value: session.kpiImpact.interview },
                  { label: "内定承諾率", value: session.kpiImpact.offer },
                  { label: "売上", value: session.kpiImpact.revenue },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-4 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-medium text-gray-500 w-24 shrink-0">{label}</span>
                    <span className="text-sm text-gray-800 leading-relaxed">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "上司コメント" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">上司向けコメント</h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-5">{session.managerComment}</p>
              <div className="border-t border-gray-100 pt-4">
                <label className="text-xs font-medium text-gray-500 block mb-2">コメントを追加</label>
                <textarea
                  className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  rows={4}
                  placeholder="1on1の記録、追加指導事項など..."
                />
                <button className="mt-2 text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors">
                  保存する
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex justify-center mb-3">
              <ScoreCircle score={session.totalScore} size="lg" />
            </div>
            <p className="text-center text-xs text-gray-500 mb-1">総合スコア</p>
            <p className="text-center text-sm text-gray-700 leading-relaxed">{session.summary}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-1">次回改善テーマ</p>
            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">{session.nextTheme}</span>
          </div>

          {/* スコアサマリー */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">スコアサマリー</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(session.scores) as (keyof typeof session.scores)[]).map((key) => {
                const val = session.scores[key];
                const color = val >= 7 ? "text-emerald-600" : val >= 5 ? "text-amber-600" : "text-red-500";
                return (
                  <div key={key} className="text-center bg-gray-50 rounded-lg py-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">{SCORE_LABELS[key]}</p>
                    <p className={cn("text-lg font-semibold", color)}>{val}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

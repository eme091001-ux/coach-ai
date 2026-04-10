"use client";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchFeedbackSession, fetchManagerComments } from "@/lib/db";
import { FeedbackSession, ManagerComment } from "@/types";
import { ScoreBar, ScoreCircle, ScoreDetailBar } from "@/components/ui/ScoreBar";
import { SCORE_LABELS, formatDate, cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronLeft,
  Loader2,
  Copy,
  Download,
  Check,
} from "lucide-react";
import Link from "next/link";

const TABS = ["フィードバック", "スコア", "書類生成", "KPI影響", "上司コメント"] as const;
type Tab = (typeof TABS)[number];

const DOC_TABS = ["CA議事録", "求職者サマリー"] as const;
type DocTab = (typeof DOC_TABS)[number];

function buildMinutes(session: FeedbackSession): string {
  return [
    "# 面談議事録",
    "",
    `日付　　: ${formatDate(session.meetingDate)}`,
    `担当CA　: ${session.staffName}`,
    `求職者　: ${session.candidateName}`,
    `面談種別: ${session.meetingType}`,
    `記録ID　: ${session.id}`,
    "",
    "## 総合評価",
    `スコア: ${session.totalScore}点`,
    session.summary,
    "",
    "## 良かった点",
    ...session.goodPoints.map((p, i) => `${i + 1}. ${p}`),
    "",
    "## 改善点",
    ...session.improvements.map((p, i) => `${i + 1}. ${p}`),
    ...(session.criticalPoints.length > 0
      ? ["", "## 要改善（優先）", ...session.criticalPoints.map((p, i) => `${i + 1}. ${p}`)]
      : []),
    "",
    "## 改善提案（セリフ例）",
    session.scriptExample,
    "",
    "## 次回改善テーマ",
    session.nextTheme,
    "",
    "## 面談文字起こし（抜粋）",
    session.transcript.slice(0, 800) + (session.transcript.length > 800 ? "\n..." : ""),
  ].join("\n");
}

function buildCandidateSummary(session: FeedbackSession): string {
  return [
    "# 求職者サマリー",
    "",
    `求職者　: ${session.candidateName}`,
    `面談日　: ${formatDate(session.meetingDate)}`,
    `担当CA　: ${session.staffName}`,
    `面談種別: ${session.meetingType}`,
    "",
    "## 面談印象・特徴",
    session.summary,
    "",
    "## ヒアリング内容（要約）",
    session.transcript.slice(0, 600) + (session.transcript.length > 600 ? "\n..." : ""),
    "",
    "## トップ営業との差分（参考）",
    session.topPerformerGap,
    "",
    "## 次回面談に向けたアクション",
    session.nextTheme,
  ].join("\n");
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<FeedbackSession | null>(null);
  const [comments, setComments] = useState<ManagerComment[]>([]);
  const [tab, setTab] = useState<Tab>("フィードバック");
  const [docTab, setDocTab] = useState<DocTab>("CA議事録");
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchFeedbackSession(id)
      .then((s) => {
        if (!s) { router.push("/feedback"); return; }
        setSession(s);
      })
      .finally(() => setLoading(false));

    fetchManagerComments(id).then(setComments);
  }, [id, router]);

  const handleSaveComment = async () => {
    if (!newComment.trim()) return;
    setSavingComment(true);
    try {
      const res = await fetch(`/api/feedback/${id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: newComment }),
      });
      if (res.ok) {
        const saved = await res.json();
        setComments((prev) => [
          {
            id: saved.id,
            feedbackId: id,
            comment: saved.comment,
            createdAt: saved.created_at,
          },
          ...prev,
        ]);
        setNewComment("");
        setCommentSaved(true);
        setTimeout(() => setCommentSaved(false), 3000);
      }
    } finally {
      setSavingComment(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!session) return null;

  const minutesText = buildMinutes(session);
  const summaryText = buildCandidateSummary(session);
  const activeDocText = docTab === "CA議事録" ? minutesText : summaryText;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link
          href="/feedback"
          className="mt-1 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={16} className="text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-gray-900">
            {session.staffName} — {session.meetingType}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatDate(session.meetingDate)} ・ {session.candidateName} ・{" "}
            {session.id}
          </p>
        </div>
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full",
            session.status === "未確認"
              ? "bg-red-100 text-red-700"
              : session.status === "確認済"
              ? "bg-blue-100 text-blue-700"
              : "bg-brand-pale text-brand-navy"
          )}
        >
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
                ? "border-brand-sky text-brand-navy font-medium"
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
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle size={15} className="text-brand-sky" />{" "}
                  良かった点 — 再現すべき行動
                </h2>
                <div className="space-y-2">
                  {session.goodPoints.map((p, i) => (
                    <div
                      key={i}
                      className="text-sm text-gray-700 bg-brand-pale border-l-4 border-brand-sky px-4 py-2.5 rounded-r-lg leading-relaxed"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-500" /> 改善点
                </h2>
                <div className="space-y-2">
                  {session.improvements.map((p, i) => (
                    <div
                      key={i}
                      className="text-sm text-gray-700 bg-amber-50 border-l-4 border-amber-400 px-4 py-2.5 rounded-r-lg leading-relaxed"
                    >
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <XCircle size={15} className="text-red-500" />{" "}
                  致命的な改善ポイント
                </h2>
                {session.criticalPoints.length === 0 ? (
                  <p className="text-sm text-gray-400">該当なし</p>
                ) : (
                  session.criticalPoints.map((p, i) => (
                    <div
                      key={i}
                      className="text-sm text-gray-700 bg-red-50 border-l-4 border-red-500 px-4 py-2.5 rounded-r-lg leading-relaxed"
                    >
                      {p}
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3">
                  セリフ改善例
                </h2>
                <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed font-mono">
                  {session.scriptExample}
                </pre>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3">
                  トップ営業との差分
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {session.topPerformerGap}
                </p>
              </div>
            </>
          )}

          {tab === "スコア" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                スコア詳細
              </h2>

              {session.scoreDetails && session.scoreDetails.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400 mb-4">
                    各項目の▼をクリックすると採点根拠と改善ポイントを確認できます
                  </p>
                  {session.scoreDetails.map((detail, i) => (
                    <ScoreDetailBar key={i} detail={detail} />
                  ))}
                  {(session.totalBasis || session.totalImprovement) && (
                    <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
                      {session.totalBasis && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">総合評価の根拠</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{session.totalBasis}</p>
                        </div>
                      )}
                      {session.totalImprovement && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">最優先改善アクション</p>
                          <p className="text-xs text-brand-navy bg-brand-pale rounded-lg px-3 py-2 leading-relaxed">{session.totalImprovement}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-4">各10点満点</p>
                  {(
                    Object.keys(session.scores) as (keyof typeof session.scores)[]
                  ).map((key) => (
                    <ScoreBar
                      key={key}
                      label={SCORE_LABELS[key]}
                      score={session.scores[key]}
                    />
                  ))}
                </>
              )}
            </div>
          )}

          {tab === "書類生成" && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Doc sub-tabs */}
              <div className="flex border-b border-gray-100 px-5 pt-5">
                {DOC_TABS.map((dt) => (
                  <button
                    key={dt}
                    onClick={() => { setDocTab(dt); setCopied(false); }}
                    className={cn(
                      "px-4 py-2 text-sm border-b-2 transition-colors mr-2",
                      docTab === dt
                        ? "border-brand-sky text-brand-navy font-medium"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                    )}
                  >
                    {dt}
                  </button>
                ))}
                <div className="flex-1" />
                <div className="flex items-center gap-2 pb-2">
                  <button
                    onClick={() => handleCopy(activeDocText)}
                    className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {copied ? <Check size={12} className="text-brand-sky" /> : <Copy size={12} />}
                    {copied ? "コピー済" : "コピー"}
                  </button>
                  <button
                    onClick={() =>
                      downloadText(
                        activeDocText,
                        docTab === "CA議事録"
                          ? `minutes_${session.id}.txt`
                          : `candidate_${session.id}.txt`
                      )
                    }
                    className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download size={12} /> ダウンロード
                  </button>
                </div>
              </div>
              <div className="p-5">
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed font-mono overflow-y-auto max-h-[500px]">
                  {activeDocText}
                </pre>
              </div>
            </div>
          )}

          {tab === "KPI影響" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">
                KPIへの影響分析
              </h2>
              <div className="space-y-3">
                {[
                  { label: "承諾率", value: session.kpiImpact.acceptance },
                  { label: "応募率", value: session.kpiImpact.application },
                  { label: "面接率", value: session.kpiImpact.interview },
                  { label: "内定承諾率", value: session.kpiImpact.offer },
                  { label: "売上", value: session.kpiImpact.revenue },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex gap-4 py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-500 w-24 shrink-0">
                      {label}
                    </span>
                    <span className="text-sm text-gray-800 leading-relaxed">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "上司コメント" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">
                AIコメント（自動生成）
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-5">
                {session.managerComment}
              </p>

              {comments.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    保存済みコメント
                  </p>
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="bg-brand-pale border border-brand-light rounded-lg px-4 py-3"
                      >
                        <p className="text-sm text-gray-800 leading-relaxed">
                          {c.comment}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {c.createdAt.slice(0, 10)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <label className="text-xs font-medium text-gray-500 block mb-2">
                  コメントを追加
                </label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-brand-sky resize-none"
                  rows={4}
                  placeholder="1on1の記録、追加指導事項など..."
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleSaveComment}
                    disabled={savingComment || !newComment.trim()}
                    className="flex items-center gap-1.5 text-sm bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-brand-blue transition-colors disabled:opacity-50"
                  >
                    {savingComment && <Loader2 size={13} className="animate-spin" />}
                    保存する
                  </button>
                  {commentSaved && (
                    <span className="text-xs text-brand-sky">
                      保存しました
                    </span>
                  )}
                </div>
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
            <p className="text-center text-sm text-gray-700 leading-relaxed">
              {session.summary}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-1">
              次回改善テーマ
            </p>
            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
              {session.nextTheme}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">
              スコアサマリー
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                Object.keys(session.scores) as (keyof typeof session.scores)[]
              ).map((key) => {
                const val = session.scores[key];
                const color =
                  val >= 7
                    ? "text-brand-sky"
                    : val >= 5
                    ? "text-amber-600"
                    : "text-red-500";
                return (
                  <div key={key} className="text-center bg-gray-50 rounded-lg py-2">
                    <p className="text-[10px] text-gray-400 mb-0.5">
                      {SCORE_LABELS[key]}
                    </p>
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

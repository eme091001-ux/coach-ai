"use client";
import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchFeedbackSession, fetchManagerComments } from "@/lib/db";
import { FeedbackSession, ManagerComment, InterviewPhase } from "@/types";
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
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

const TABS = ["フィードバック", "スコア", "書類生成", "KPI影響", "上司コメント"] as const;
type Tab = (typeof TABS)[number];

const DOC_TABS = ["CA議事録", "求職者向けまとめ"] as const;
type DocTab = (typeof DOC_TABS)[number];

const PHASES: InterviewPhase[] = ["1次面談", "2次面談", "求人提案", "内定後フォロー"];

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

  // Document generation state
  const [selectedPhase, setSelectedPhase] = useState<InterviewPhase | null>(null);
  const [generatedMinutes, setGeneratedMinutes] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [docGenerating, setDocGenerating] = useState(false);
  const [docError, setDocError] = useState("");

  useEffect(() => {
    fetchFeedbackSession(id)
      .then((s) => {
        if (!s) { router.push("/feedback"); return; }
        setSession(s);
        if (s.interviewPhase) setSelectedPhase(s.interviewPhase);
      })
      .finally(() => setLoading(false));

    fetchManagerComments(id).then(setComments);
  }, [id, router]);

  const handleSelectPhase = useCallback(
    async (phase: InterviewPhase) => {
      if (!session) return;
      setSelectedPhase(phase);
      setDocGenerating(true);
      setDocError("");
      setGeneratedMinutes("");
      setGeneratedSummary("");
      setCopied(false);

      // Save phase to Supabase (fire-and-forget)
      fetch(`/api/feedback/${id}/phase`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase }),
      }).catch(() => {/* non-fatal */});

      try {
        const res = await fetch(`/api/feedback/${id}/document`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase,
            staffName: session.staffName,
            candidateName: session.candidateName,
            meetingDate: session.meetingDate,
            transcript: session.transcript,
          }),
        });
        if (!res.ok) throw new Error("generation failed");
        const { minutes, summary } = await res.json();
        setGeneratedMinutes(minutes);
        setGeneratedSummary(summary);
      } catch {
        setDocError("書類の生成に失敗しました。再度お試しください。");
      } finally {
        setDocGenerating(false);
      }
    },
    [session, id]
  );

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
          { id: saved.id, feedbackId: id, comment: saved.comment, createdAt: saved.created_at },
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

  const activeDocText = docTab === "CA議事録" ? generatedMinutes : generatedSummary;
  const hasDocuments = generatedMinutes || generatedSummary;

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
          session.status === "確認済" ? "bg-blue-100 text-blue-700" :
          "bg-brand-pale text-brand-navy"
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

          {/* ── フィードバック ── */}
          {tab === "フィードバック" && (
            <>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle size={15} className="text-brand-sky" />
                  良かった点 — 再現すべき行動
                </h2>
                <div className="space-y-2">
                  {session.goodPoints.map((p, i) => (
                    <div key={i} className="text-sm text-gray-700 bg-brand-pale border-l-4 border-brand-sky px-4 py-2.5 rounded-r-lg leading-relaxed">
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
                    <div key={i} className="text-sm text-gray-700 bg-amber-50 border-l-4 border-amber-400 px-4 py-2.5 rounded-r-lg leading-relaxed">
                      {p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <XCircle size={15} className="text-red-500" /> 致命的な改善ポイント
                </h2>
                {session.criticalPoints.length === 0 ? (
                  <p className="text-sm text-gray-400">該当なし</p>
                ) : (
                  session.criticalPoints.map((p, i) => (
                    <div key={i} className="text-sm text-gray-700 bg-red-50 border-l-4 border-red-500 px-4 py-2.5 rounded-r-lg leading-relaxed">
                      {p}
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3">セリフ改善例</h2>
                <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed font-mono">
                  {session.scriptExample}
                </pre>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h2 className="text-sm font-medium text-gray-900 mb-3">トップ営業との差分</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{session.topPerformerGap}</p>
              </div>
            </>
          )}

          {/* ── スコア ── */}
          {tab === "スコア" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">スコア詳細</h2>
              {session.scoreDetails && session.scoreDetails.length > 0 ? (
                <>
                  <p className="text-xs text-gray-400 mb-4">▼ をクリックすると採点根拠と改善ポイントを確認できます</p>
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
                  {(Object.keys(session.scores) as (keyof typeof session.scores)[]).map((key) => (
                    <ScoreBar key={key} label={SCORE_LABELS[key]} score={session.scores[key]} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── 書類生成 ── */}
          {tab === "書類生成" && (
            <div className="space-y-4">
              {/* Phase selection */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-medium text-gray-900">面談フェーズを選択</h2>
                    <p className="text-xs text-gray-400 mt-0.5">選択するとCA向け議事録と求職者向けまとめを自動生成します</p>
                  </div>
                  {selectedPhase && hasDocuments && (
                    <button
                      onClick={() => handleSelectPhase(selectedPhase)}
                      disabled={docGenerating}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={11} className={docGenerating ? "animate-spin" : ""} />
                      再生成
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {PHASES.map((phase) => (
                    <button
                      key={phase}
                      onClick={() => handleSelectPhase(phase)}
                      disabled={docGenerating}
                      className={cn(
                        "px-3 py-2.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40",
                        selectedPhase === phase
                          ? "border-brand-sky bg-brand-pale text-brand-navy shadow-sm"
                          : "border-gray-200 text-gray-600 hover:border-brand-sky hover:bg-brand-pale/50 hover:text-brand-navy"
                      )}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>

              {/* Loading */}
              {docGenerating && (
                <div className="bg-white rounded-xl border border-gray-100 p-10 flex flex-col items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-brand-sky" />
                  <p className="text-sm text-gray-500">
                    <span className="font-medium text-brand-navy">{selectedPhase}</span> の書類を生成中...
                  </p>
                  <p className="text-xs text-gray-400">CA議事録と求職者向けまとめを同時生成しています</p>
                </div>
              )}

              {/* Error */}
              {docError && !docGenerating && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
                  {docError}
                </div>
              )}

              {/* Generated documents */}
              {!docGenerating && hasDocuments && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* Sub-tabs + actions */}
                  <div className="flex items-center border-b border-gray-100 px-5 pt-4 pb-0">
                    <div className="flex">
                      {DOC_TABS.map((dt) => (
                        <button
                          key={dt}
                          onClick={() => { setDocTab(dt); setCopied(false); }}
                          className={cn(
                            "px-4 py-2.5 text-sm border-b-2 transition-colors mr-1",
                            docTab === dt
                              ? "border-brand-sky text-brand-navy font-medium"
                              : "border-transparent text-gray-400 hover:text-gray-700"
                          )}
                        >
                          {dt}
                        </button>
                      ))}
                    </div>
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
                              ? `minutes_${id}.txt`
                              : `summary_${id}.txt`
                          )
                        }
                        className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Download size={12} /> ダウンロード
                      </button>
                    </div>
                  </div>
                  <div className="p-5">
                    <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 whitespace-pre-wrap leading-relaxed font-mono overflow-y-auto max-h-[560px]">
                      {activeDocText || "（このタブの書類は生成されていません）"}
                    </pre>
                  </div>
                </div>
              )}

              {/* Idle state — no phase selected yet */}
              {!docGenerating && !hasDocuments && !docError && (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                  <p className="text-sm text-gray-400">上のフェーズを選択すると書類が自動生成されます</p>
                </div>
              )}
            </div>
          )}

          {/* ── KPI影響 ── */}
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

          {/* ── 上司コメント ── */}
          {tab === "上司コメント" && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-3">AIコメント（自動生成）</h2>
              <p className="text-sm text-gray-700 leading-relaxed mb-5">{session.managerComment}</p>

              {comments.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-medium text-gray-500 mb-2">保存済みコメント</p>
                  <div className="space-y-2">
                    {comments.map((c) => (
                      <div key={c.id} className="bg-brand-pale border border-brand-light rounded-lg px-4 py-3">
                        <p className="text-sm text-gray-800 leading-relaxed">{c.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">{c.createdAt.slice(0, 10)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4">
                <label className="text-xs font-medium text-gray-500 block mb-2">コメントを追加</label>
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
                  {commentSaved && <span className="text-xs text-brand-sky">保存しました</span>}
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
            <p className="text-center text-sm text-gray-700 leading-relaxed">{session.summary}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-1">次回改善テーマ</p>
            <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
              {session.nextTheme}
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-900 mb-3">スコアサマリー</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(session.scores) as (keyof typeof session.scores)[]).map((key) => {
                const val = session.scores[key];
                const color = val >= 7 ? "text-brand-sky" : val >= 5 ? "text-amber-600" : "text-red-500";
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

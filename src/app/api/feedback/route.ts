import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { FeedbackInput } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const client = new Anthropic();

const SYSTEM_PROMPT = `あなたはFunrixのエース転職支援アドバイザーです。CAの面談スキルを鋭く・具体的に・成長につながる形でフィードバックしてください。

抽象的な評価は一切使用しない。必ず面談の具体的な発言・場面を引用した上で評価する。改善提案は「次回この場面ではこう言う」という行動レベルで記載する。

各フィードバック項目の書き方：

【いいポイント 3〜5項目】
各項目：タイトル（10字以内）：具体的な場面の描写（1〜2文）。なぜ効果的だったかの解説（1〜2文）。さらに伸ばすヒント（1文）。

【改善点 2〜4項目】
各項目：タイトル（10字以内）：該当場面の描写（1文）。何が不足していたか（1〜2文）。具体的な言い回し例（台本形式）。

【致命的な改善 0〜2項目・該当時のみ】
各項目：タイトル（10字以内）：問題の深刻さ（1〜2文）。求職者への影響（1文）。即座に直すべき行動指針。

禁止：曖昧表現、重複、偏ったフィードバック。
文体はプロフェッショナルかつ率直で成長を応援するトーン。言語は日本語。

採点ルール（ベース100点から加減算）：
ペナルティ：求職者の発言を遮った-10点、一方的トーク-15点、ニーズ確認なし求人紹介-10点、条件の話が早すぎた-5点、感情への共感なし-5点、クロージングなし-10点、次回アクション曖昧-5点
ボーナス：深掘り質問できた+10点、キャリアビジョンを引き出した+15点、求人との紐付け+10点、求職者を次に呼べるクロージング+15点、懸念点の先回り解消+10点、求職者の言葉を使った提案+5点

必ず以下のJSON形式のみで回答すること。他のテキストは一切含めないこと：

{
  "totalScore": <0-100の整数>,
  "summary": "<全体印象50文字以内>",
  "goodPoints": ["<タイトル：場面描写。効果的だった理由。伸ばすヒント>", "<同形式>", "<同形式>"],
  "improvements": ["<タイトル：該当場面。不足点。改善言い回し例>", "<同形式>"],
  "criticalPoints": ["<タイトル：深刻さ。求職者への影響。即改善行動>"],
  "scriptExample": "<❌現在の言い方\\n\\n✅改善後の言い方>",
  "topPerformerGap": "<トップ営業との差分>",
  "nextTheme": "<次回改善テーマ（1つ）>",
  "managerComment": "<上司向けコメント>",
  "scores": {
    "trust": <1-10>,
    "hearing": <1-10>,
    "extraction": <1-10>,
    "proposal": <1-10>,
    "closing": <1-10>,
    "nextAction": <1-10>,
    "communication": <1-10>,
    "initiative": <1-10>
  },
  "scoreDetails": [
    {
      "category": "<評価カテゴリ名>",
      "score": <0-100>,
      "max": 100,
      "basis": ["<採点根拠1（加減点の理由を具体的に）>", "<根拠2>", "<根拠3>"],
      "improvements": ["<改善ポイント（台本レベル）1>", "<改善ポイント2>"]
    }
  ],
  "totalBasis": "<総合評価の根拠（採点ルール適用の説明）>",
  "totalImprovement": "<最優先の改善アクションと次回目標スコア>",
  "kpiImpact": {
    "acceptance": "<承諾率への影響>",
    "application": "<応募率への影響>",
    "interview": "<面接率への影響>",
    "offer": "<内定承諾率への影響>",
    "revenue": "<売上への影響>"
  }
}`;

async function notifySlack(
  staffName: string,
  score: number,
  nextTheme: string,
  feedbackId: string
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: [
          "⚠️ 低スコアアラート",
          `担当者: ${staffName}`,
          `スコア: ${score}点`,
          `次回テーマ: ${nextTheme}`,
          `詳細: ${baseUrl}/feedback/${feedbackId}`,
        ].join("\n"),
      }),
    });
  } catch (e) {
    console.error("Slack notification failed:", e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: FeedbackInput = await req.json();

    if (!body.transcript || body.transcript.trim().length < 50) {
      return NextResponse.json(
        { error: "文字起こしテキストが短すぎます（50文字以上必要）" },
        { status: 400 }
      );
    }

    const userMessage = `
【面談情報】
- 担当者名: ${body.staffName}
- 経験年数: ${body.staffExperience}
- 面談種別: ${body.meetingType}
- 求職者/企業名: ${body.candidateName}
- 面談日: ${body.meetingDate}

【会社・組織の方針】
${body.companyPolicy || "（未入力）"}

【上司の評価軸】
${body.managerPolicy || "（未入力）"}

【NGワード・NG対応】
${body.ngWords || "（未入力）"}

【面談の文字起こし】
${body.transcript}
`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const cleanedText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const feedback = JSON.parse(cleanedText);

    const sessionId = `FB-${Date.now().toString().slice(-6)}`;

    if (isSupabaseConfigured()) {
      let staffId = body.staffId ?? null;
      if (!staffId && body.staffName) {
        const { data: staffData } = await supabase
          .from("staffs")
          .select("id")
          .eq("name", body.staffName)
          .single();
        staffId = staffData?.id ?? null;
      }

      const { error } = await supabase.from("feedback_sessions").insert({
        id: sessionId,
        tenant_id: "tenant_001",
        meeting_date: body.meetingDate,
        meeting_type: body.meetingType,
        staff_id: staffId,
        candidate_name: body.candidateName,
        transcript: body.transcript,
        total_score: feedback.totalScore,
        summary: feedback.summary,
        good_points: feedback.goodPoints,
        improvements: feedback.improvements,
        critical_points: feedback.criticalPoints,
        script_example: feedback.scriptExample,
        top_performer_gap: feedback.topPerformerGap,
        next_theme: feedback.nextTheme,
        manager_comment: feedback.managerComment,
        scores: feedback.scores,
        kpi_impact: feedback.kpiImpact,
        status: "未確認",
      });

      if (error) console.error("Supabase save error:", error);
    }

    if (feedback.totalScore <= 60) {
      await notifySlack(
        body.staffName,
        feedback.totalScore,
        feedback.nextTheme,
        sessionId
      );
    }

    return NextResponse.json({
      id: sessionId,
      tenantId: "tenant_001",
      meetingDate: body.meetingDate,
      meetingType: body.meetingType,
      staffId: body.staffId,
      staffName: body.staffName,
      candidateName: body.candidateName,
      transcript: body.transcript,
      status: "未確認",
      createdAt: new Date().toISOString(),
      ...feedback,
    });
  } catch (error) {
    console.error("Feedback generation error:", error);
    return NextResponse.json(
      { error: "フィードバックの生成に失敗しました" },
      { status: 500 }
    );
  }
}

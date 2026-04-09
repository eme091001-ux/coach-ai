import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { FeedbackInput } from "@/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `あなたはトップクラスの営業マネージャーであり、人材紹介事業における営業・面談改善のプロフェッショナルです。

入力された面談の文字起こしをもとに、担当者の面談・営業活動に対して、具体的かつ再現性のあるフィードバックを生成してください。

目的は「売上・KPI改善につながる行動変容」を起こすことです。
抽象論ではなく、実際に現場で使えるレベルまで具体化してください。

以下の厳格なルールを守ること：
- 抽象論は禁止。必ず具体例を書く
- セリフベースで改善提案する
- KPIと紐づける
- 優しさだけでなく改善を促す内容にする
- 評価と行動改善をセットで出す
- 文字起こしの内容に基づかない推測は避ける

必ず以下のJSON形式のみで回答すること。他のテキストは一切含めないこと：

{
  "totalScore": <0-100の整数>,
  "summary": "<一言で全体印象 50文字以内>",
  "goodPoints": ["<良かった点1>", "<良かった点2>", "<良かった点3>"],
  "improvements": ["<改善点1>", "<改善点2>", "<改善点3>"],
  "criticalPoints": ["<致命的改善ポイント1つ>"],
  "scriptExample": "<❌現在の言い方\\n\\n✅改善後の言い方>",
  "topPerformerGap": "<トップ営業との差分の説明>",
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
  "kpiImpact": {
    "acceptance": "<承諾率への影響>",
    "application": "<応募率への影響>",
    "interview": "<面接率への影響>",
    "offer": "<内定承諾率への影響>",
    "revenue": "<売上への影響>"
  }
}`;

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
      max_tokens: 2000,
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

    // 面談IDを生成して返す
    const sessionId = `FB-${Date.now().toString().slice(-4)}`;

    return NextResponse.json({
      id: sessionId,
      tenantId: "tenant_001",
      meetingDate: body.meetingDate,
      meetingType: body.meetingType,
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

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { candidate, company, caName, feedbackSummaries } = await req.json();

    const incomeStr = (val?: number) =>
      val ? `${val}万円` : "未記入";

    const prompt = `以下の求職者情報と企業情報をもとに、採用担当者が「会いたい」と思える推薦文を作成してください。

【求職者情報】
氏名：${candidate.name}
年齢：${candidate.age ?? "未記入"}歳
最終学歴：${candidate.education ?? "未記入"}
現年収：${incomeStr(candidate.currentIncome)}
希望年収：${incomeStr(candidate.desiredIncome)}
希望職種：${(candidate.desiredJobs ?? []).join("、") || "未記入"}
現職：${candidate.currentCompany ?? "未記入"}
フェーズ：${candidate.phase}
メモ：${candidate.memo ?? "なし"}

【面談フィードバックのいいポイント（直近）】
${feedbackSummaries && feedbackSummaries.length > 0
  ? feedbackSummaries.map((s: string) => `・${s}`).join("\n")
  : "（面談記録なし）"}

【応募企業】
企業名：${company.name}
業種：${company.industry ?? "未記入"}
職種：${company.jobType ?? "未記入"}
年収レンジ：${incomeStr(company.minIncome)}〜${incomeStr(company.maxIncome)}

【担当CA】
${caName}

以下の形式で推薦文を作成してください。他のテキストは不要です：

株式会社${company.name} 採用ご担当者様

この度は、${candidate.name}様をご紹介させていただきます。

（求職者の強み・経歴を2〜3段落で。現年収・希望年収・希望職種・最終学歴・面談内容のいいポイントを反映して具体的に書く）

ぜひ一度お会いいただけますと幸いです。

株式会社Funrix
担当CA：${caName}`;

    const message = await client.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 1200,
      system: "あなたはFunrixのキャリアアドバイザーとして、求職者を企業に推薦する推薦文を作成します。採用担当者が読んで「会いたい」と思える、具体的で魅力的な推薦文を作成してください。指定されたフォーマット以外のテキストは出力しないでください。",
      messages: [{ role: "user", content: prompt }],
    });

    const recommendation =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ recommendation });
  } catch (err) {
    console.error("Recommendation generation error:", err);
    return NextResponse.json(
      { error: "推薦文の生成に失敗しました" },
      { status: 500 }
    );
  }
}

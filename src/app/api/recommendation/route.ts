import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(params: {
  candidateName: string;
  companyName: string;
  jobType?: string;
  age?: number;
  education?: string;
  currentIncome?: number;
  desiredIncome?: number;
  desiredJobs?: string[];
  memo?: string;
}): string {
  const {
    candidateName, companyName, jobType,
    age, education, currentIncome, desiredIncome, desiredJobs, memo,
  } = params;

  const lines = [
    `求職者名: ${candidateName}`,
    age ? `年齢: ${age}歳` : null,
    education ? `最終学歴: ${education}` : null,
    currentIncome ? `現年収: ${currentIncome}万円` : null,
    desiredIncome ? `希望年収: ${desiredIncome}万円` : null,
    desiredJobs?.length ? `希望職種: ${desiredJobs.join("、")}` : null,
    jobType ? `応募職種: ${jobType}` : null,
    memo ? `備考・メモ: ${memo}` : null,
  ].filter(Boolean).join("\n");

  return `あなたは転職エージェントです。以下の求職者情報をもとに、${companyName}への推薦文を作成してください。

${lines}

応募企業: ${companyName}

条件：
- 200〜300文字程度
- 求職者の強みや転職意欲を具体的にアピール
- 企業担当者に向けた推薦スタイル（丁寧・簡潔）

推薦文のみ出力してください。前置きや説明は不要です。`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      candidateName: string;
      companyName: string;
      jobType?: string;
      age?: number;
      education?: string;
      currentIncome?: number;
      desiredIncome?: number;
      desiredJobs?: string[];
      memo?: string;
    };

    const { candidateName, companyName } = body;
    if (!candidateName || !companyName) {
      return NextResponse.json(
        { error: "candidateName and companyName are required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[recommendation/generate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

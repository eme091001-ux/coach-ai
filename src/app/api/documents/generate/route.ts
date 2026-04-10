import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Resume (履歴書) ────────────────────────────────────────────────────────────
function buildResumePrompt(candidateName: string, transcript: string): string {
  return `あなたは転職支援のプロフェッショナルです。以下の面談トランスクリプトから、求職者の情報を抽出して履歴書の各フィールドを補完してください。

求職者名: ${candidateName}
面談トランスクリプト:
${transcript.slice(0, 4000)}

以下のJSONフォーマットで出力してください（推測できない場合は空文字）：
{
  "furigana": "読み仮名（カタカナ）",
  "birthdate": "生年月日（YYYY-MM-DD形式、推測可能な場合）",
  "gender": "性別（男・女・その他）",
  "address": "現住所（都道府県まで）",
  "phone": "電話番号",
  "email": "メールアドレス",
  "education": [
    { "year": "年", "month": "月", "school": "学校名", "faculty": "学部・学科", "type": "入学|卒業" }
  ],
  "workHistory": [
    { "year": "年", "month": "月", "company": "会社名", "detail": "入社・退社・業務内容", "type": "入社|退社|担当" }
  ],
  "licenses": [
    { "year": "年", "month": "月", "name": "資格・免許名" }
  ],
  "motivation": "志望動機（200文字程度）",
  "selfPR": "自己PR（200文字程度）",
  "hobbies": "趣味・特技",
  "commute": "通勤時間（分）",
  "dependents": "扶養家族数（配偶者除く）",
  "spouse": "配偶者（有・無）",
  "spouseDependency": "配偶者の扶養義務（有・無）"
}

JSONのみを出力してください。他のテキストは含めないでください。`;
}

// ── Career (職務経歴書) ────────────────────────────────────────────────────────
function buildCareerPrompt(candidateName: string, transcript: string): string {
  return `あなたは転職支援のプロフェッショナルです。以下の面談トランスクリプトから、求職者の職務経歴書を作成してください。

求職者名: ${candidateName}
面談トランスクリプト:
${transcript.slice(0, 4000)}

以下のJSONフォーマットで出力してください（推測できない場合は空文字）：
{
  "summary": "職務要約（300文字程度）",
  "companies": [
    {
      "name": "会社名",
      "industry": "業種",
      "employees": "従業員数（例：500名）",
      "startYear": "入社年",
      "startMonth": "入社月",
      "endYear": "退社年（在職中の場合は現在）",
      "endMonth": "退社月",
      "positions": [
        {
          "title": "役職・ポジション",
          "period": "期間（例：2020年4月〜2022年3月）",
          "description": "業務内容（箇条書きで3〜5点）",
          "achievements": "実績・成果（具体的な数字を含めて）"
        }
      ]
    }
  ],
  "skills": {
    "technical": ["技術・ツールスキル（例：Excel、Salesforce等）"],
    "language": ["語学スキル（例：英語 ビジネスレベル）"],
    "other": ["その他スキル"]
  },
  "pr": "自己PR（400文字程度、強みと転職意欲を含む）"
}

JSONのみを出力してください。他のテキストは含めないでください。`;
}

// ── Interview prep (面接対策) ──────────────────────────────────────────────────
function buildInterviewPrompt(
  candidateName: string,
  transcript: string,
  industry: string,
  jobType: string
): string {
  return `あなたは転職面接対策の専門家です。以下の求職者情報と面談内容をもとに、${industry}・${jobType}の面接でよく出る質問と模範回答を作成してください。

求職者名: ${candidateName}
業界: ${industry}
職種: ${jobType}
面談トランスクリプト:
${transcript.slice(0, 3000)}

以下のJSONフォーマットで8〜10問出力してください：
{
  "questions": [
    {
      "number": 1,
      "category": "質問カテゴリ（例：自己紹介・志望動機・強み・経験・転職理由・将来像等）",
      "question": "面接質問",
      "answer": "この求職者に合った模範回答（200〜300文字）",
      "tip": "回答のポイント・注意事項（50文字程度）"
    }
  ]
}

JSONのみを出力してください。他のテキストは含めないでください。`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, candidateName, transcript, industry, jobType } = body as {
      type: "resume" | "career" | "interview";
      candidateName: string;
      transcript: string;
      industry?: string;
      jobType?: string;
    };

    if (!type || !candidateName || !transcript) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let prompt: string;
    if (type === "resume") {
      prompt = buildResumePrompt(candidateName, transcript);
    } else if (type === "career") {
      prompt = buildCareerPrompt(candidateName, transcript);
    } else {
      if (!industry || !jobType) {
        return NextResponse.json({ error: "industry and jobType required for interview type" }, { status: 400 });
      }
      prompt = buildInterviewPrompt(candidateName, transcript, industry, jobType);
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text;

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("[documents/generate]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

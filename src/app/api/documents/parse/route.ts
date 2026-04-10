import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_PROMPT = `この書類から情報を抽出してください。以下のJSON形式で返してください（抽出できない項目は空文字または空配列にしてください）：

{
  "documentType": "resume または career（履歴書→resume、職務経歴書→career）",
  "name": "氏名",
  "furigana": "ふりがな",
  "birthdate": "生年月日（例: 1990年1月1日）",
  "age": "年齢",
  "gender": "性別",
  "postalCode": "郵便番号",
  "address": "現住所",
  "phone": "電話番号",
  "email": "メールアドレス",
  "education": [{ "year": "年（数字のみ）", "month": "月（数字のみ）", "content": "学歴内容（例: ○○大学 ○○学部 卒業）" }],
  "career": [{ "year": "年（数字のみ）", "month": "月（数字のみ）", "content": "職歴内容（例: 株式会社○○ 入社）" }],
  "qualifications": [{ "year": "年（数字のみ）", "month": "月（数字のみ）", "content": "資格・免許名" }],
  "motivation": "志望動機",
  "pr": "自己PR",
  "wish": "本人希望欄",
  "summary": "職務要約",
  "companies": [{
    "name": "会社名",
    "period": "在籍期間",
    "industry": "業種",
    "duties": "業務内容",
    "achievements": "実績・成果"
  }],
  "skills": "スキル",
  "selfPR": "自己PR（職務経歴書の場合）"
}

JSONのみを出力してください。説明文や前置きは不要です。`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let messages: Anthropic.MessageParam[];

    if (file.type === "application/pdf") {
      // Use pdf-parse to extract text
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      const pdfData = await (pdfParse as (buf: Buffer) => Promise<{ text: string }>)(buffer);
      messages = [{
        role: "user",
        content: [
          { type: "text", text: PARSE_PROMPT },
          { type: "text", text: `\n\n--- 書類内容 ---\n${pdfData.text}` },
        ],
      }];
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      // Use mammoth to extract text from DOCX
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buffer as Buffer });
      messages = [{
        role: "user",
        content: [
          { type: "text", text: PARSE_PROMPT },
          { type: "text", text: `\n\n--- 書類内容 ---\n${result.value}` },
        ],
      }];
    } else if (file.type.startsWith("image/")) {
      const base64 = buffer.toString("base64");
      const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
      messages = [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: PARSE_PROMPT },
        ],
      }];
    } else {
      return NextResponse.json({ error: "対応していないファイル形式です（PDF・Word・画像のみ）" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages,
    });

    const raw = (message.content[0] as { type: string; text: string }).text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AIの応答を解析できませんでした" }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ data: parsed });
  } catch (err) {
    console.error("[documents/parse]", err);
    return NextResponse.json({ error: "内部エラーが発生しました" }, { status: 500 });
  }
}

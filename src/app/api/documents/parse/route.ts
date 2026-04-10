import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PARSE_PROMPT = `この書類（履歴書または職務経歴書）を読み取り、必ず以下のJSON形式のみで返答してください。前後に説明文やバッククォートは不要です。

{
  "documentType": "resume",
  "name": "氏名",
  "furigana": "ふりがな",
  "birthdate": "生年月日",
  "age": "年齢",
  "gender": "性別",
  "postalCode": "郵便番号",
  "address": "現住所",
  "phone": "電話番号",
  "email": "メールアドレス",
  "education": [{ "year": "年", "month": "月", "content": "学歴内容" }],
  "career": [{ "year": "年", "month": "月", "content": "職歴内容" }],
  "qualifications": [{ "year": "年", "month": "月", "content": "資格名" }],
  "motivation": "志望動機",
  "pr": "自己PR",
  "wish": "本人希望欄",
  "commuteTime": "通勤時間",
  "dependents": "扶養家族数",
  "spouse": "配偶者の有無",
  "spouseSupport": "配偶者の扶養義務",
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
}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { file: string; mediaType: string; fileName: string };
    const { file, mediaType, fileName } = body;

    if (!file) {
      return NextResponse.json({ error: 'ファイルがありません' }, { status: 400 });
    }

    let messages: Anthropic.MessageParam[];

    if (mediaType === 'application/pdf') {
      // PDFはClaudeのdocumentタイプで直接解析
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: file,
              },
            },
            {
              type: 'text',
              text: PARSE_PROMPT,
            },
          ],
        },
      ];
    } else if (
      mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName?.endsWith('.docx')
    ) {
      // DOCXはmammothでテキスト抽出してからClaudeに送信
      const buffer = Buffer.from(file, 'base64');
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: PARSE_PROMPT },
            { type: 'text', text: `\n\n--- 書類内容 ---\n${result.value}` },
          ],
        },
      ];
    } else if (mediaType.startsWith('image/')) {
      // 画像はvision APIで解析
      const imageMediaType = mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: imageMediaType, data: file },
            },
            { type: 'text', text: PARSE_PROMPT },
          ],
        },
      ];
    } else {
      return NextResponse.json(
        { error: '対応していないファイル形式です（PDF・Word・画像のみ）' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2000,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AIの応答を解析できませんでした' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'ファイルの読み込みに失敗しました', detail: String(error) },
      { status: 500 }
    );
  }
}

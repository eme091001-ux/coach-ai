import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT_AI = `あなたは転職エージェントのCAアシスタントです。提供された書類・メモから履歴書と職務経歴書のフォームを自動入力してください。日本語で回答し、JSONフォーマットで返してください。前後に説明文やバッククォートは不要です。`;

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
    const body = await req.json() as { file?: string; mediaType?: string; fileName?: string; memo?: string };
    const { file, mediaType, fileName, memo } = body;

    console.log('[parse] mediaType:', mediaType, '| fileName:', fileName, '| fileSize:', file ? Math.round(file.length * 0.75 / 1024) + 'KB' : 'none', '| hasMemo:', !!memo);

    if (!file && !memo) {
      return NextResponse.json({ error: 'ファイルまたはメモが必要です' }, { status: 400 });
    }

    const memoText = memo ? `\n\n--- 面談メモ・議事録 ---\n${memo}` : '';

    // メモのみの場合
    if (!file) {
      const messages: Anthropic.MessageParam[] = [{
        role: 'user',
        content: [
          { type: 'text', text: PARSE_PROMPT },
          { type: 'text', text: memoText },
        ],
      }];
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT_AI,
        messages,
      });
      const text = response.content.filter((b) => b.type === 'text').map((b) => (b as { type: 'text'; text: string }).text).join('');
      const clean = text.replace(/```json|```/g, '').trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return NextResponse.json({ error: 'AIの応答を解析できませんでした' }, { status: 500 });
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }

    let messages: Anthropic.MessageParam[];

    if (mediaType === 'application/pdf') {
      const buffer = Buffer.from(file, 'base64');
      console.log('[parse] PDF buffer size:', buffer.length, 'bytes');

      let pdfText = '';
      try {
        const pdfData = await pdfParse(buffer);
        pdfText = pdfData.text || '';
        console.log('[parse] PDF extracted text length:', pdfText.length, '| preview:', pdfText.slice(0, 200).replace(/\n/g, '\\n'));
      } catch (pdfError) {
        console.error('[parse] pdf-parse error:', pdfError);
        return NextResponse.json(
          { error: 'PDFの解析に失敗しました。ファイルが破損していないか確認してください。', detail: String(pdfError) },
          { status: 500 }
        );
      }

      if (!pdfText.trim()) {
        return NextResponse.json(
          { error: 'このPDFは画像PDFのため文字抽出できません。スキャンPDFの場合は画像（jpg・png）でアップロードしてください。' },
          { status: 422 }
        );
      }

      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: PARSE_PROMPT },
            { type: 'text', text: `\n\n--- 書類内容 ---\n${pdfText}${memoText}` },
          ],
        },
      ];

    } else if (
      mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName?.endsWith('.docx')
    ) {
      const buffer = Buffer.from(file, 'base64');
      console.log('[parse] Word buffer size:', buffer.length, 'bytes');

      let wordText = '';
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        wordText = result.value || '';
        console.log('[parse] Word extracted text length:', wordText.length, '| preview:', wordText.slice(0, 200).replace(/\n/g, '\\n'));
      } catch (wordError) {
        console.error('[parse] mammoth error:', wordError);
        return NextResponse.json(
          { error: 'Wordファイルの解析に失敗しました。.docx形式のファイルをアップロードしてください。', detail: String(wordError) },
          { status: 500 }
        );
      }

      if (!wordText.trim()) {
        return NextResponse.json(
          { error: 'Wordファイルからテキストを抽出できませんでした。ファイルが正しい.docx形式か確認してください。' },
          { status: 422 }
        );
      }

      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: PARSE_PROMPT },
            { type: 'text', text: `\n\n--- 書類内容 ---\n${wordText}${memoText}` },
          ],
        },
      ];

    } else if (mediaType && mediaType.startsWith('image/')) {
      const imageMediaType = mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
      console.log('[parse] Image type:', imageMediaType, '| size:', Math.round(file.length * 0.75 / 1024), 'KB');
      messages = [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: file } },
            { type: 'text', text: PARSE_PROMPT + memoText },
          ],
        },
      ];
    } else {
      console.warn('[parse] Unsupported mediaType:', mediaType);
      return NextResponse.json(
        { error: '対応していないファイル形式です（PDF・Word・画像のみ）' },
        { status: 400 }
      );
    }

    console.log('[parse] Sending to Claude...');
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2000,
      system: memo ? SYSTEM_PROMPT_AI : undefined,
      messages,
    });

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    console.log('[parse] Claude response length:', text.length, '| preview:', text.slice(0, 100));

    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[parse] Failed to extract JSON from:', clean.slice(0, 200));
      return NextResponse.json({ error: 'AIの応答を解析できませんでした' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[parse] Success. Keys:', Object.keys(parsed));
    return NextResponse.json(parsed);

  } catch (error) {
    console.error('[parse] Unexpected error:', error);
    return NextResponse.json(
      { error: 'ファイルの読み込みに失敗しました', detail: String(error) },
      { status: 500 }
    );
  }
}

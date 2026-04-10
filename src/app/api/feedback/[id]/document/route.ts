import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { InterviewPhase } from "@/types";

const client = new Anthropic();

function buildMinutesSystem(
  phase: InterviewPhase,
  staffName: string,
  candidateName: string,
  meetingDate: string
): string {
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const phaseExtra: Record<InterviewPhase, string> = {
    "1次面談": "",
    "2次面談": `
## 転職の軸・前回からの変化
- 前回と変わった点：
- 新たに出てきた本音：
- 優先順位（一番大事にしていること）：

## 求人の方向性すり合わせ
- 興味ある業界・企業規模：
- 次回提案に向けた条件整理：`,
    "求人提案": `
## 紹介求人と反応
| 求人名 | 選定理由（未来軸との紐付け） | 求職者の反応 | 反応の理由 |
|--------|--------------------------|------------|----------|
| （文字起こしから抽出） | | 興味あり / なし / 保留 | |

## 次回提案に向けたCAメモ
（未来軸から逆算して次回どんな求人を持っていくべきかを記載）`,
    "内定後フォロー": `
## 内定情報
| 項目 | 内容 |
|------|------|
| 内定企業名 | |
| 提示年収 | 万円／年 |
| 入社予定日 | |
| 他社選考状況 | |

## 意思決定の状況
- 迷いのポイント・懸念点：
- CAの対応・アドバイス内容：
- 辞退リスク：あり / なし / 要観察`,
  };

  return `あなたはFunrixのCA向け議事録を作成するAIです。
面談フェーズ：${phase}

以下の面談情報と文字起こしをもとに、指定フォーマットで議事録を生成してください。

ルール：
- 出力はMarkdownテキストのみ。JSONやコードブロック（\`\`\`）は絶対に使わない
- 文字起こしから読み取れる情報を積極的に埋める
- 不明な項目は「（要確認）」と記載
- 求職者の印象的な発言は必ず「」で引用する

---

# 面談議事録｜${phase}
**面談日時：** ${meetingDate}
**担当CA：** ${staffName}
**求職者名：** ${candidateName}
**面談回数：**（文字起こしから判断）
**面談形式：**（文字起こしから判断。Zoom / 対面 / 電話）

## 基本情報
※2次面談以降は変更があった項目のみ更新
| 項目 | 内容 |
|------|------|
| 年齢 | |
| 現住所 | |
| 希望勤務地 | |
| 現職・会社名 | |
| 現在の給与 | 万円／年 |
| 希望給与 | 万円／年（差分：△〇万円アップ） |
| 希望職種 | |
| 休日希望 | |

## 転職の軸・未来軸
- 転職理由（表向き）：
- 転職理由（本音）：
- 未来どうなりたいか：
- 譲れない条件：
- 妥協できる条件：

## 面談議事録
（時系列で記載。求職者の印象的な発言は「」で引用すること）

## CA所感
- 転職意欲の熱量：高い / 普通 / 低い
- 信頼関係：取れている / まだこれから / 要注意
- 懸念点：
- 次回で掘り下げるポイント：

## ネクストアクション
| # | アクション内容 | 担当 | 期限 |
|---|--------------|------|------|${phaseExtra[phase]}

---
作成：Funrix AI Coach｜${today}`;
}

function buildSummarySystem(
  phase: InterviewPhase,
  staffName: string,
  candidateName: string,
  meetingDate: string
): string {
  const phaseExtra: Record<InterviewPhase, string> = {
    "1次面談": `
## あなたのことを教えてください（整理）
（今回の面談で見えてきた転職の軸と未来像を、求職者の言葉を使って整理する）

## あなたの強み（CAから見て）
（3つ、市場価値と紐付けて具体的に。本人が気づいていない強みも入れる）

## CAからの一言
（初回なので特に「安心感」を伝える。その人固有のエピソードを必ず入れる。一人称は「私」）

## 次回までにお願いしたいこと
（求職者側のネクストアクションのみ。期限明記）`,
    "2次面談": `
## 転職の軸・整理できてきたこと
（前回から深まった部分を中心にまとめる）

## あなたの強み（さらに見えてきたこと）
（前回と重複しない新たな強みを中心に）

## CAからの一言
（軸が明確になってきたことへの前向きなメッセージ。一人称は「私」）

## 次回までにお願いしたいこと
（求職者側のネクストアクションのみ。期限明記）`,
    "求人提案": `
## ご紹介求人と選定理由
| 求人名 | 選定理由 |
|--------|---------|
| （文字起こしから抽出） | あなたの転職の軸に合うため（具体的に記載） |

※必ず未来軸と紐付けた理由を添える。「条件が合うから」は禁止。

## CAからの一言
（求人への期待感と求職者への応援メッセージ。一人称は「私」）

## 次回までにお願いしたいこと
（求職者側のネクストアクションのみ。期限明記）`,
    "内定後フォロー": `
## 内定おめでとうございます
（お祝いの言葉と、ここまでの頑張りを労う。具体的なエピソードを入れる）

## 意思決定に向けて
（迷っているポイントに寄り添い、判断の整理をサポートする内容）

## CAからの一言
（どんな決断でも応援するという安心感を伝える。一人称は「私」）

## 次のステップ
（意思決定の期限と、入社後も含めたフォロー予定）`,
  };

  return `あなたはFunrixの担当CAとして、求職者に共有する面談まとめを作成するAIです。
面談フェーズ：${phase}
求職者が「このCAに任せて大丈夫だ」と感じられる温かみのある文体で作成してください。

ルール：
- 出力はMarkdownテキストのみ。JSONやコードブロック（\`\`\`）は絶対に使わない
- 求職者の生の言葉を必ず1つ以上引用する
- 強みは「〇〇な経験が△△で活きる」という市場価値の形で表現する
- CAからの一言はその人固有の内容にする。定型文・テンプレ感は禁止
- ネクストアクションは期限と内容を具体的に
- 専門用語・業界用語は使わない

---

# 面談まとめ｜${candidateName} 様
**面談日：** ${meetingDate}
**担当CA：** ${staffName}（Funrix）
**面談フェーズ：** ${phase}

## 本日のアジェンダ
（求職者目線でわかりやすく箇条書き。専門用語は使わない）

## 面談内容まとめ
（時系列でわかりやすく。求職者の言葉を必ず1つ以上引用する）

---
${phaseExtra[phase]}

---
Funrix｜このまとめはAIが生成しました。ご質問は担当CAまでご連絡ください。`;
}

interface DocumentRequest {
  phase: InterviewPhase;
  staffName: string;
  candidateName: string;
  meetingDate: string;
  transcript: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await params; // consume params (id not needed for generation)
  try {
    const body: DocumentRequest = await req.json();
    const { phase, staffName, candidateName, meetingDate, transcript } = body;

    if (!phase || !transcript) {
      return NextResponse.json(
        { error: "フェーズと文字起こしは必須です" },
        { status: 400 }
      );
    }

    const userContent = `【面談文字起こし】\n${transcript}`;

    const [minutesMsg, summaryMsg] = await Promise.all([
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: buildMinutesSystem(phase, staffName, candidateName, meetingDate),
        messages: [{ role: "user", content: userContent }],
      }),
      client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: buildSummarySystem(phase, staffName, candidateName, meetingDate),
        messages: [{ role: "user", content: userContent }],
      }),
    ]);

    const minutes =
      minutesMsg.content[0].type === "text" ? minutesMsg.content[0].text : "";
    const summary =
      summaryMsg.content[0].type === "text" ? summaryMsg.content[0].text : "";

    return NextResponse.json({ minutes, summary });
  } catch (error) {
    console.error("Document generation error:", error);
    return NextResponse.json(
      { error: "書類生成に失敗しました" },
      { status: 500 }
    );
  }
}

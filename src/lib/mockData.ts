import { FeedbackSession } from "@/types";

export const MOCK_SESSIONS: FeedbackSession[] = [
  {
    id: "FB-0041",
    tenantId: "tenant_001",
    meetingDate: "2026-04-07",
    meetingType: "初回面談",
    staffName: "田中 美咲",
    candidateName: "山本 健一",
    transcript: "（文字起こしサンプル）",
    totalScore: 84,
    summary: "ヒアリング力が高く信頼関係の構築が速い。クロージングのタイムライン確認が課題。",
    goodPoints: [
      "求職者の転職動機を3段階で深掘りし「将来やりたいこと」まで引き出した。信頼関係構築のスピードが速い。",
      "求人提案のタイミングが適切。課題を整理した後に具体企業を提示することで説得力が増している。",
      "面談終わりに「次回までにやること」を求職者に確認させることで主体性を持たせている。",
    ],
    improvements: [
      "年収提示の前に「なぜその年収を期待しているか」を確認していない。承諾率の低下につながる可能性がある。",
      "面談の30分過ぎから話すスピードが上がり、求職者が考える間が少なくなっていた。テンポの調整が必要。",
      "競合比較の質問を受けた際に曖昧な返答になっている。「なぜ弊社経由か」のトークを準備すること。",
    ],
    criticalPoints: [
      "クロージングで「いつまでに決めたいですか？」を聞いていない。タイムラインが不明なまま終了しており、放置すると内定後の辞退リスクが高まる。",
    ],
    scriptExample:
      "❌ 現在:「では次回また連絡します」\n\n✅ 改善:「山本さんは、いつ頃を目安に転職したいとお考えですか？逆算すると今月中に応募先を絞りたいですよね。今週中に3社リストを送るので、金曜の夜に30分だけ時間もらえますか？」",
    topPerformerGap:
      "トップ営業は面談の最後15分で必ずタイムラインと次回アクションの合意を取る。この習慣がないことが承諾率に直結している。",
    nextTheme: "クロージング力",
    managerComment:
      "ヒアリングは申し分ない。次の1on1ではクロージングのロールプレイに時間を割くこと。",
    scores: {
      trust: 9,
      hearing: 8,
      extraction: 8,
      proposal: 7,
      closing: 5,
      nextAction: 6,
      communication: 8,
      initiative: 9,
    },
    kpiImpact: {
      acceptance: "クロージング未完了により承諾率-10%リスク",
      application: "提案力は高く応募率への影響は軽微",
      interview: "面接対策の準備は良好",
      offer: "タイムライン未確認が内定承諾率を下げる可能性あり",
      revenue: "クロージング改善で月間売上+15%の試算",
    },
    status: "確認済",
    createdAt: "2026-04-07T18:00:00Z",
  },
  {
    id: "FB-0042",
    tenantId: "tenant_001",
    meetingDate: "2026-04-07",
    meetingType: "初回面談",
    staffName: "佐藤 優",
    candidateName: "中村 さくら",
    transcript: "（文字起こしサンプル）",
    totalScore: 59,
    summary: "傾聴姿勢はあるが課題の深掘りが浅く、提案フェーズに進めていない。",
    goodPoints: [
      "求職者の話をよく聞いており傾聴姿勢は良好。",
      "言葉遣いが丁寧で安心感を与えている。",
    ],
    improvements: [
      "「なぜ転職を考えたのか」の一次回答で止まっており、背景まで掘り下げていない。",
      "求人提案に進む前に面談が終了してしまっている。時間配分を意識すること。",
      "次回アクションが「また連絡します」のみで具体性がない。",
    ],
    criticalPoints: [
      "課題抽出ができていないため求人提案に進めず、承諾率・応募率の両方に悪影響が出る。",
    ],
    scriptExample:
      "❌ 現在:「転職を考えた理由は何ですか？」\n\n✅ 改善:「転職を考えた理由は何ですか？（聴く）→ それはいつ頃から感じていましたか？→ 今の状況が続くと、1年後どうなっていると思いますか？」と3段階で深掘りする。",
    topPerformerGap:
      "トップ営業は課題抽出に面談時間の40%を使い、求職者自身が「変わりたい」と言語化できる状態を作ってから提案に入る。",
    nextTheme: "課題抽出力",
    managerComment:
      "傾聴はできているので次のステップは深掘りの型を教える。ロープレで「なぜ3回聞き」を練習させること。",
    scores: {
      trust: 7,
      hearing: 6,
      extraction: 4,
      proposal: 3,
      closing: 4,
      nextAction: 4,
      communication: 7,
      initiative: 5,
    },
    kpiImpact: {
      acceptance: "提案まで進めないため承諾率への影響なし（機会損失）",
      application: "応募率0%（提案未実施）",
      interview: "影響なし",
      offer: "影響なし",
      revenue: "このままでは売上貢献度が低い状態が続く",
    },
    status: "未確認",
    createdAt: "2026-04-07T15:00:00Z",
  },
  {
    id: "FB-0043",
    tenantId: "tenant_001",
    meetingDate: "2026-04-08",
    meetingType: "内定承諾",
    staffName: "松本 大輝",
    candidateName: "高橋 誠",
    transcript: "（文字起こしサンプル）",
    totalScore: 48,
    summary: "クロージングと次アクション設定が致命的に不足。辞退リスクが高い。",
    goodPoints: [
      "企業の魅力を丁寧に説明している。",
    ],
    improvements: [
      "「他社と比較してどう思いますか？」を聞いていない。懸念を放置している。",
      "承諾の意思確認が曖昧で「考えます」で終了してしまった。",
      "次回の連絡日時を設定していない。",
    ],
    criticalPoints: [
      "内定承諾面談でタイムラインと意思確認ができていない。このまま放置すると辞退率が高まる。緊急フォローが必要。",
    ],
    scriptExample:
      "❌ 現在:「ご検討ください」\n\n✅ 改善:「今の気持ちを10点満点で言うと何点ですか？（聴く）→ 何点になったら承諾できますか？→ その点数に届くために私に何かできることはありますか？」",
    topPerformerGap:
      "トップ営業はこの面談で必ず数値で意思を確認し、懸念を全て言語化させてから次のアクションを決める。",
    nextTheme: "クロージング力",
    managerComment:
      "緊急介入が必要。明日中にマネージャーが直接求職者にフォロー連絡を入れること。松本には今週ロープレ必須。",
    scores: {
      trust: 6,
      hearing: 5,
      extraction: 5,
      proposal: 6,
      closing: 2,
      nextAction: 3,
      communication: 6,
      initiative: 4,
    },
    kpiImpact: {
      acceptance: "承諾率に直接マイナス影響。辞退リスク高",
      application: "影響なし",
      interview: "影響なし",
      offer: "内定承諾率-30%リスク",
      revenue: "1件の辞退で売上-100万円以上の損失",
    },
    status: "未確認",
    createdAt: "2026-04-08T17:00:00Z",
  },
];

export const STAFF_LIST = ["田中 美咲", "鈴木 健太", "佐藤 優", "松本 大輝"];

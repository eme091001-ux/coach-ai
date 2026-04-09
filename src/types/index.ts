export type MeetingType =
  | "初回面談"
  | "求人提案"
  | "面接対策"
  | "内定承諾"
  | "法人営業"
  | "商談";

export type FeedbackStatus =
  | "未確認"
  | "確認済"
  | "1on1済"
  | "改善中";

export interface ScoreBreakdown {
  trust: number;        // 信頼関係
  hearing: number;      // ヒアリング
  extraction: number;   // 課題抽出
  proposal: number;     // 提案力
  closing: number;      // クロージング
  nextAction: number;   // 次アクション設定
  communication: number; // 話し方
  initiative: number;   // 主体性
}

export interface KpiImpact {
  acceptance: string;   // 承諾率
  application: string;  // 応募率
  interview: string;    // 面接率
  offer: string;        // 内定承諾率
  revenue: string;      // 売上
}

export interface FeedbackSession {
  id: string;
  tenantId: string;
  meetingDate: string;
  meetingType: MeetingType;
  staffName: string;
  candidateName: string;
  transcript: string;
  totalScore: number;
  summary: string;
  goodPoints: string[];
  improvements: string[];
  criticalPoints: string[];
  scriptExample: string;
  topPerformerGap: string;
  nextTheme: string;
  managerComment: string;
  scores: ScoreBreakdown;
  kpiImpact: KpiImpact;
  status: FeedbackStatus;
  createdAt: string;
}

export interface FeedbackInput {
  meetingDate: string;
  meetingType: MeetingType;
  staffName: string;
  staffExperience: string;
  candidateName: string;
  transcript: string;
  companyPolicy: string;
  managerPolicy: string;
  ngWords: string;
}

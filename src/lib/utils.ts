import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ScoreBreakdown } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-brand-sky";
  if (score >= 60) return "text-amber-600";
  return "text-red-500";
}

export function scoreBarColor(score: number): string {
  if (score >= 7) return "bg-brand-sky";
  if (score >= 5) return "bg-amber-400";
  return "bg-red-400";
}

export function scoreBadge(score: number): { label: string; className: string } {
  if (score >= 80) return { label: "優秀", className: "bg-brand-pale text-brand-navy" };
  if (score >= 65) return { label: "良好", className: "bg-blue-100 text-blue-800" };
  if (score >= 50) return { label: "要改善", className: "bg-amber-100 text-amber-800" };
  return { label: "緊急改善", className: "bg-red-100 text-red-800" };
}

export function avgScore(scores: ScoreBreakdown): number {
  const vals = Object.values(scores);
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const SCORE_LABELS: Record<keyof ScoreBreakdown, string> = {
  trust: "信頼関係",
  hearing: "ヒアリング",
  extraction: "課題抽出",
  proposal: "提案力",
  closing: "クロージング",
  nextAction: "次アクション",
  communication: "話し方",
  initiative: "主体性",
};

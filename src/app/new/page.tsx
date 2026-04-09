"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { FeedbackInput, MeetingType, Staff } from "@/types";
import { fetchStaff } from "@/lib/db";
import { Loader2, Sparkles, Upload } from "lucide-react";

const MEETING_TYPES: MeetingType[] = [
  "初回面談",
  "求人提案",
  "面接対策",
  "内定承諾",
  "法人営業",
  "商談",
];

const SAMPLE_TRANSCRIPT = `CA: 本日はお時間いただきありがとうございます。まず、転職を考えたきっかけを聞かせてもらえますか？
求職者: 今の会社で3年働いてて、なんとなく将来が不安で。
CA: そうですか、不安というのはどういった点でしょうか？
求職者: 給与があまり上がらないし、キャリアアップできるか心配で。
CA: なるほど。ちなみに今どのくらいの年収をお考えですか？
求職者: できれば500万円以上希望します。
CA: わかりました。では弊社でいくつか求人を紹介しますね。この会社はどうですか？
求職者: 良さそうですね。
CA: では応募の方向で進めましょう。また連絡します。`;

export default function NewFeedbackPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FeedbackInput>({
    meetingDate: new Date().toISOString().split("T")[0],
    meetingType: "初回面談",
    staffId: undefined,
    staffName: "",
    staffExperience: "1〜2年",
    candidateName: "",
    transcript: "",
    companyPolicy: "求職者ファーストで長期的な関係構築を重視。承諾率45%以上が目標。",
    managerPolicy: "ヒアリングの深さとクロージングのタイムライン確認を特に重視。",
    ngWords: "とりあえず、なんとなく、たぶん",
  });

  useEffect(() => {
    fetchStaff().then((list) => {
      setStaffList(list);
      if (list.length > 0) {
        setForm((prev) => ({
          ...prev,
          staffId: list[0].id,
          staffName: list[0].name,
          staffExperience: list[0].experience,
        }));
      }
    });
  }, []);

  const set = (key: keyof FeedbackInput, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleStaffChange = (staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    if (staff) {
      setForm((prev) => ({
        ...prev,
        staffId: staff.id,
        staffName: staff.name,
        staffExperience: staff.experience,
      }));
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("PDFファイルを選択してください");
      return;
    }
    setPdfLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/pdf", { method: "POST", body: fd });
      if (!res.ok) throw new Error("PDF解析失敗");
      const { text } = await res.json();
      set("transcript", text);
    } catch {
      setError("PDFの読み込みに失敗しました");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.transcript.trim()) {
      setError("文字起こしテキストを入力してください");
      return;
    }
    if (!form.candidateName.trim()) {
      setError("求職者名を入力してください");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("生成失敗");
      const data = await res.json();
      router.push(`/feedback/${data.id}`);
    } catch {
      setError(
        "フィードバックの生成に失敗しました。APIキーを確認してください。"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-lg font-semibold text-gray-900 mb-6">面談を登録</h1>

      <div className="grid grid-cols-2 gap-5">
        {/* 左：面談情報 */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">面談情報</h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">面談日</label>
                <input
                  type="date"
                  value={form.meetingDate}
                  onChange={(e) => set("meetingDate", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">面談種別</label>
                <select
                  value={form.meetingType}
                  onChange={(e) => set("meetingType", e.target.value as MeetingType)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {MEETING_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">担当者名</label>
                <select
                  value={form.staffId ?? ""}
                  onChange={(e) => handleStaffChange(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">経験年数</label>
                <select
                  value={form.staffExperience}
                  onChange={(e) => set("staffExperience", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {["1年未満", "1〜2年", "3〜5年", "5年以上"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  求職者名 / 企業名
                </label>
                <input
                  type="text"
                  value={form.candidateName}
                  onChange={(e) => set("candidateName", e.target.value)}
                  placeholder="山本 健一"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-4">評価軸・方針</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  会社の営業方針
                </label>
                <textarea
                  value={form.companyPolicy}
                  onChange={(e) => set("companyPolicy", e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  上司の評価軸
                </label>
                <textarea
                  value={form.managerPolicy}
                  onChange={(e) => set("managerPolicy", e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">NGワード</label>
                <input
                  type="text"
                  value={form.ngWords}
                  onChange={(e) => set("ngWords", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 右：文字起こし */}
        <div className="flex flex-col gap-5">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex-1">
            {/* PDFアップロード */}
            <div className="mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePdfUpload(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 w-full justify-center text-sm border border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:text-emerald-600 rounded-lg px-3 py-2.5 transition-colors disabled:opacity-50"
              >
                {pdfLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> PDF解析中...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> PDFをアップロードしてテキスト抽出
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-gray-900">
                文字起こしテキスト
              </h2>
              <button
                onClick={() => set("transcript", SAMPLE_TRANSCRIPT)}
                className="text-xs text-emerald-600 hover:text-emerald-700 underline"
              >
                サンプルを使う
              </button>
            </div>
            <textarea
              value={form.transcript}
              onChange={(e) => set("transcript", e.target.value)}
              rows={18}
              placeholder="面談の文字起こしテキストをここに貼り付けてください..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
            />
            <p className="text-xs text-gray-400 mt-1">{form.transcript.length}文字</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium py-3.5 rounded-xl transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> AIフィードバックを生成中...
              </>
            ) : (
              <>
                <Sparkles size={16} /> AIフィードバックを生成する
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

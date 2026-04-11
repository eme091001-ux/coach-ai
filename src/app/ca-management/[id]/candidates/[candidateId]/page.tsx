"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.candidateId as string;
  const caId = params?.id as string;
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidateId) {
      setError("candidateId is undefined");
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase
      .from("candidates")
      .select("*")
      .eq("id", candidateId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Supabase error:", error);
          setError(error.message);
        } else {
          setCandidate(data);
        }
        setLoading(false);
      });
  }, [candidateId]);

  if (loading) return <div style={{padding:40}}>読み込み中...</div>;
  if (error) return <div style={{padding:40, color:"red"}}>エラー：{error}<br/><button onClick={() => router.back()}>戻る</button></div>;
  if (!candidate) return <div style={{padding:40, color:"red"}}>求職者が見つかりません（ID: {candidateId}）<br/><button onClick={() => router.back()}>戻る</button></div>;

  return (
    <div style={{padding:40}}>
      <h1>{candidate.name}</h1>
      <pre>{JSON.stringify(candidate, null, 2)}</pre>
    </div>
  );
}

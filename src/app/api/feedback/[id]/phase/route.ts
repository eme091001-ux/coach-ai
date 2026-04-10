import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { InterviewPhase } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { phase }: { phase: InterviewPhase } = await req.json();

    if (!phase) {
      return NextResponse.json({ error: "phase is required" }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from("feedback_sessions")
        .update({ interview_phase: phase })
        .eq("id", id);

      if (error) {
        console.error("Phase save error:", error);
        // Non-fatal: return success anyway (column may not exist yet)
      }
    }

    return NextResponse.json({ id, phase });
  } catch (error) {
    console.error("Phase PATCH error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}

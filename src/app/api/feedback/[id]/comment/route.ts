import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json([]);
  }

  const { data, error } = await supabase
    .from("manager_comments")
    .select("*")
    .eq("feedback_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { comment } = await req.json();

  if (!comment?.trim()) {
    return NextResponse.json(
      { error: "コメントを入力してください" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      id: `mock-${Date.now()}`,
      feedback_id: id,
      comment,
      created_at: new Date().toISOString(),
    });
  }

  const { data, error } = await supabase
    .from("manager_comments")
    .insert({ feedback_id: id, comment: comment.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

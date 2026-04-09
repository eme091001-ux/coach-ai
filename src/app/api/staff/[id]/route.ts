import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_STAFF } from "@/lib/mockData";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    const staff = MOCK_STAFF.find((s) => s.id === id);
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(staff);
  }

  const { data, error } = await supabase
    .from("staffs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabaseが設定されていません" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("staffs")
    .update({
      name: body.name,
      experience: body.experience,
      role: body.role,
      email: body.email,
      avatar_color: body.avatarColor,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabaseが設定されていません" },
      { status: 503 }
    );
  }

  const { error } = await supabase.from("staffs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

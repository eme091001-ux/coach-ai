import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { MOCK_STAFF } from "@/lib/mockData";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      MOCK_STAFF.map((s) => ({
        id: s.id,
        tenant_id: s.tenantId,
        name: s.name,
        experience: s.experience,
        role: s.role,
        email: s.email,
        avatar_color: s.avatarColor,
        created_at: s.createdAt,
      }))
    );
  }

  const { data, error } = await supabase
    .from("staffs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      MOCK_STAFF.map((s) => ({
        id: s.id,
        tenant_id: s.tenantId,
        name: s.name,
        experience: s.experience,
        role: s.role,
        email: s.email,
        avatar_color: s.avatarColor,
        created_at: s.createdAt,
      }))
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabaseが設定されていません" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("staffs")
    .insert({
      name: body.name,
      experience: body.experience,
      role: body.role,
      email: body.email ?? "",
      avatar_color: body.avatarColor ?? "bg-gray-100 text-gray-700",
      tenant_id: "tenant_001",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

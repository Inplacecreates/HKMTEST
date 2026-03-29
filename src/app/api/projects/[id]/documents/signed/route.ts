import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requirePermission("projects:read");
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");
    if (!path) return NextResponse.json({ error: "path required" }, { status: 400 });

    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase.storage
      .from("hkm-documents")
      .createSignedUrl(path, 300); // 5 min expiry

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    tenantId: user.tenantId,
    fullName: user.fullName,
    role: user.role,
    email: user.email,
    approvalLimit: user.approvalLimit,
  });
}

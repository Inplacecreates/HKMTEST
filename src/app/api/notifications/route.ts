import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guards";
import { NotificationService } from "@/services/notification.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const notifications = await NotificationService.getAll(user.id);
    return NextResponse.json(notifications);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

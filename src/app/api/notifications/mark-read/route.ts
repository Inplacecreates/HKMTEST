import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth/guards";
import { NotificationService } from "@/services/notification.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    if (body.all) {
      await NotificationService.markAllAsRead(user.id);
    } else if (body.ids && Array.isArray(body.ids)) {
      await NotificationService.markAsRead(body.ids);
    } else {
      return NextResponse.json({ error: "Provide { all: true } or { ids: [...] }" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

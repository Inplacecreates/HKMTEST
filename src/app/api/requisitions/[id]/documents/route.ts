import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission("requisitions:read");
    const documents = await prisma.document.findMany({
      where: { tenantId: user.tenantId, requisitionId: params.id },
      include: { uploader: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission("requisitions:read");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("type") as string) || "RECEIPT";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and image files are allowed" },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${user.tenantId}/requisitions/${params.id}/receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("hkm-documents")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage error: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const document = await prisma.document.create({
      data: {
        tenantId: user.tenantId,
        requisitionId: params.id,
        type: docType as import("@/generated/prisma").DocumentType,
        fileName: storagePath.split("/").pop()!,
        originalName: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: user.id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error("Receipt upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const user = await requirePermission("projects:read");
    const documents = await prisma.document.findMany({
      where: { tenantId: user.tenantId, projectId: params.id },
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
    const user = await requirePermission("projects:update");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("type") as string) || "OTHER";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const maxSize = 20 * 1024 * 1024; // 20 MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
    }

    const allowedTypes = [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const supabase = createAdminSupabaseClient();
    const ext = file.name.split(".").pop() || "bin";
    const storagePath = `${user.tenantId}/projects/${params.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("hkm-documents")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: `Storage error: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const document = await prisma.document.create({
      data: {
        tenantId: user.tenantId,
        projectId: params.id,
        type: docType as import("@/generated/prisma").DocumentType,
        fileName: storagePath.split("/").pop()!,
        originalName: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: user.id,
      },
      include: { uploader: { select: { fullName: true } } },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission("projects:update");
    const { searchParams } = new URL(req.url);
    const docId = searchParams.get("docId");
    if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 });

    const doc = await prisma.document.findFirst({
      where: { id: docId, tenantId: user.tenantId, projectId: params.id },
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const supabase = createAdminSupabaseClient();
    await supabase.storage.from("hkm-documents").remove([doc.storagePath]);
    await prisma.document.delete({ where: { id: docId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError)
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

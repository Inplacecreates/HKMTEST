import { NextResponse } from "next/server";
import { requirePermission, AuthError } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma/client";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET = "hkm-documents";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: Request) {
  try {
    const user = await requirePermission("documents:upload");

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "OTHER";
    const projectId = formData.get("projectId") as string | null;
    const requisitionId = formData.get("requisitionId") as string | null;
    const purchaseOrderId = formData.get("purchaseOrderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
    }

    const validTypes = ["RECEIPT", "PLAN", "DRAWING", "PHOTO", "INVOICE", "OTHER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    // Generate a unique storage path
    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.tenantId}/${timestamp}_${safeFileName}`;

    // Upload to Supabase Storage using admin client (bypasses storage RLS)
    const adminClient = createAdminSupabaseClient();
    const fileBuffer = await file.arrayBuffer();

    const { error: storageError } = await adminClient.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { error: `Storage error: ${storageError.message}` },
        { status: 500 }
      );
    }

    // Insert document record via Prisma (direct DB connection, bypasses RLS)
    const document = await prisma.document.create({
      data: {
        tenantId: user.tenantId,
        type: type as import("@/generated/prisma").DocumentType,
        fileName: safeFileName,
        originalName: file.name,
        storagePath,
        fileSize: file.size,
        mimeType: file.type || `application/octet-stream`,
        uploadedBy: user.id,
        ...(projectId ? { projectId } : {}),
        ...(requisitionId ? { requisitionId } : {}),
        ...(purchaseOrderId ? { purchaseOrderId } : {}),
      },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        storagePath: true,
        fileSize: true,
        mimeType: true,
        type: true,
        createdAt: true,
        uploader: { select: { id: true, fullName: true } },
      },
    });

    // Get public URL for the uploaded file
    const { data: urlData } = adminClient.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({ ...document, publicUrl: urlData?.publicUrl }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const user = await requirePermission("documents:read");
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const requisitionId = searchParams.get("requisitionId");
    const purchaseOrderId = searchParams.get("purchaseOrderId");

    const documents = await prisma.document.findMany({
      where: {
        tenantId: user.tenantId,
        ...(projectId ? { projectId } : {}),
        ...(requisitionId ? { requisitionId } : {}),
        ...(purchaseOrderId ? { purchaseOrderId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        storagePath: true,
        fileSize: true,
        mimeType: true,
        type: true,
        createdAt: true,
        uploader: { select: { id: true, fullName: true } },
      },
    });

    // Attach public URLs
    const adminClient = createAdminSupabaseClient();
    const withUrls = documents.map((doc) => {
      const { data } = adminClient.storage.from(BUCKET).getPublicUrl(doc.storagePath);
      return { ...doc, publicUrl: data?.publicUrl };
    });

    return NextResponse.json(withUrls);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

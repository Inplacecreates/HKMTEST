"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Upload, FileText, Image, Trash2, Download, File } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";

const DOC_TYPES = ["OTHER", "RECEIPT", "PLAN", "DRAWING", "PHOTO", "INVOICE"];

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType === "application/pdf") return FileText;
  return File;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ProjectDocumentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [docType, setDocType] = useState("OTHER");
  const [project, setProject] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`);
      if (res.ok) setDocuments(await res.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(() => {});
    loadDocuments();
  }, [projectId, loadDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", docType);
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        await loadDocuments();
      } else {
        const data = await res.json();
        setUploadError(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    const res = await fetch(
      `/api/projects/${projectId}/documents?docId=${docId}`,
      { method: "DELETE" }
    );
    if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const getDownloadUrl = async (doc: any) => {
    // Get a signed URL from Supabase for download
    const res = await fetch(`/api/projects/${projectId}/documents/signed?path=${encodeURIComponent(doc.storagePath)}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-gray-500">{project?.name}</p>
        </div>
      </div>

      {/* Upload section */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                onChange={handleUpload}
                className="hidden"
                id="doc-upload"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Uploading…" : "Upload File"}
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              PDF, JPEG, PNG, Word, Excel · max 20 MB
            </p>
          </div>
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
        </CardContent>
      </Card>

      {/* Documents list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc: any) => {
            const Icon = fileIcon(doc.mimeType);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border bg-white p-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {doc.type.charAt(0) + doc.type.slice(1).toLowerCase()} ·{" "}
                      {formatBytes(doc.fileSize)} ·{" "}
                      {doc.uploader?.fullName} ·{" "}
                      {formatRelativeTime(new Date(doc.createdAt))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => getDownloadUrl(doc)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(doc.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

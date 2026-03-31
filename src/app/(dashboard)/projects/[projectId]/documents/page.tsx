"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ArrowLeft, FileText, Upload, Download, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

const DOC_TYPE_LABELS: Record<string, string> = {
  RECEIPT: "Receipt",
  PLAN: "Plan",
  DRAWING: "Drawing",
  PHOTO: "Photo",
  INVOICE: "Invoice",
  OTHER: "Other",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  RECEIPT: "bg-green-100 text-green-700",
  PLAN: "bg-blue-100 text-blue-700",
  DRAWING: "bg-purple-100 text-purple-700",
  PHOTO: "bg-yellow-100 text-yellow-700",
  INVOICE: "bg-orange-100 text-orange-700",
  OTHER: "bg-gray-100 text-gray-700",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDocumentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("OTHER");
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/upload?projectId=${projectId}`);
      if (res.ok) setDocuments(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", uploadType);
      formData.append("projectId", projectId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setUploadError(data.error || "Upload failed");
        return;
      }

      await loadDocuments();
    } catch {
      setUploadError("Network error during upload");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Project Documents</h1>
          <p className="text-sm text-gray-500">{documents.length} file{documents.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadError && (
            <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {uploadError}
            </div>
          )}
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Document Type</label>
              <Select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-36"
              >
                {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">File</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="doc-upload-input"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip"
              />
              <Button
                asChild
                disabled={uploading}
                variant="outline"
              >
                <label htmlFor="doc-upload-input" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading…" : "Choose File"}
                </label>
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Supported: PDF, Word, Excel, Images, ZIP. Max 20MB.
          </p>
        </CardContent>
      </Card>

      {/* Documents List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload plans, drawings, invoices, receipts, or photos for this project."
        />
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.originalName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`text-xs ${DOC_TYPE_COLORS[doc.type] || "bg-gray-100 text-gray-700"}`}>
                        {DOC_TYPE_LABELS[doc.type] || doc.type}
                      </Badge>
                      <span className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
                      <span className="text-xs text-gray-400">{formatDate(new Date(doc.createdAt))}</span>
                      {doc.uploader && (
                        <span className="text-xs text-gray-400">by {doc.uploader.fullName}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  {doc.publicUrl && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={doc.publicUrl} target="_blank" rel="noopener noreferrer" download={doc.originalName}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

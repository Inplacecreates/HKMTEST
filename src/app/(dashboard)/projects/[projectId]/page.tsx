"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/utils/constants";
import { formatKES, formatDate } from "@/lib/utils/format";
import {
  ArrowLeft, MapPin, Phone, Mail, Plus,
  FileText, AlertTriangle, Archive, Trash2, ArchiveRestore, X,
} from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Sites
  const [showAddSite, setShowAddSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteAddress, setNewSiteAddress] = useState("");
  const [addingSite, setAddingSite] = useState(false);
  const [siteError, setSiteError] = useState("");

  const loadProject = () => {
    fetch(`/api/projects/${params.projectId}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProject(); }, [params.projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const handleArchive = async () => {
    setActioning(true);
    try {
      const res = await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (res.ok) router.push("/projects");
    } finally {
      setActioning(false);
    }
  };

  const handleUnarchive = async () => {
    setActioning(true);
    try {
      const res = await fetch(`/api/projects/${params.projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      if (res.ok) loadProject();
    } finally {
      setActioning(false);
    }
  };

  const handleAddSite = async () => {
    if (!newSiteName.trim()) return;
    setAddingSite(true);
    setSiteError("");
    try {
      const res = await fetch(`/api/projects/${params.projectId}/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSiteName, address: newSiteAddress }),
      });
      if (res.ok) {
        setNewSiteName("");
        setNewSiteAddress("");
        setShowAddSite(false);
        loadProject();
      } else {
        const data = await res.json();
        setSiteError(data.error || "Failed to add site");
      }
    } finally {
      setAddingSite(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("Remove this site?")) return;
    const res = await fetch(`/api/projects/${params.projectId}/sites?siteId=${siteId}`, {
      method: "DELETE",
    });
    if (res.ok) loadProject();
    else {
      const data = await res.json();
      alert(data.error || "Cannot remove site");
    }
  };

  const handleDelete = async () => {
    setActioning(true);
    try {
      const res = await fetch(`/api/projects/${params.projectId}`, { method: "DELETE" });
      if (res.ok) router.push("/projects");
      else {
        const data = await res.json();
        alert(data.error || "Cannot delete project");
      }
    } finally {
      setActioning(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!project) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Project not found"
        description="This project does not exist or you do not have access."
        action={<Link href="/projects"><Button variant="outline">Back to Projects</Button></Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge className={PROJECT_STATUS_COLORS[project.status as keyof typeof PROJECT_STATUS_COLORS]}>
                {PROJECT_STATUS_LABELS[project.status as keyof typeof PROJECT_STATUS_LABELS]}
              </Badge>
            </div>
            <p className="text-muted-foreground">Code: {project.code} | Client: {project.clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.status === "ARCHIVED" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnarchive}
              disabled={actioning}
            >
              <ArchiveRestore className="mr-1.5 h-4 w-4" />
              Unarchive
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={actioning}
              >
                <Archive className="mr-1.5 h-4 w-4" />
                Archive
              </Button>
              {!showDeleteConfirm ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5">
                  <span className="text-xs text-red-700">Delete permanently?</span>
                  <Button size="sm" variant="destructive" onClick={handleDelete} disabled={actioning}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="text-xl font-bold">{formatKES(project.totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Allocated</p>
            <p className="text-xl font-bold">{formatKES(project.allocatedBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Sites</p>
            <p className="text-xl font-bold">{project.sites?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Requisitions</p>
            <p className="text-xl font-bold">{project._count?.requisitions ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Client info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{project.clientName}</p>
          {project.clientPhone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />{project.clientPhone}
            </div>
          )}
          {project.clientEmail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />{project.clientEmail}
            </div>
          )}
          {project.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />{project.address}
            </div>
          )}
          <div className="flex gap-4 text-sm text-muted-foreground pt-2">
            {project.startDate && <span>Started: {formatDate(project.startDate)}</span>}
            {project.targetEndDate && <span>Target: {formatDate(project.targetEndDate)}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Sites */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Sites ({project.sites?.length ?? 0})</CardTitle>
          {!showAddSite && (
            <Button size="sm" variant="outline" onClick={() => { setShowAddSite(true); setSiteError(""); }}>
              <Plus className="mr-1 h-3.5 w-3.5" />Add Site
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddSite && (
            <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  autoFocus
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Site name *"
                  className="rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
                />
                <input
                  value={newSiteAddress}
                  onChange={(e) => setNewSiteAddress(e.target.value)}
                  placeholder="Address (optional)"
                  className="rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
                />
              </div>
              {siteError && <p className="text-xs text-red-600">{siteError}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddSite} disabled={addingSite || !newSiteName.trim()}>
                  {addingSite ? "Adding…" : "Add"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddSite(false); setNewSiteName(""); setNewSiteAddress(""); setSiteError(""); }}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
          {project.sites?.length > 0 ? (
            <div className="space-y-2">
              {project.sites.map((site: any) => (
                <div key={site.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{site.name}</p>
                    {site.address && <p className="text-sm text-muted-foreground">{site.address}</p>}
                    {site.siteManager && (
                      <p className="text-sm text-muted-foreground">Manager: {site.siteManager.fullName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={site.status === "ACTIVE" ? "default" : "secondary"}>
                      {site.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => handleDeleteSite(site.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !showAddSite && <p className="text-sm text-muted-foreground">No sites added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`/finance?projectId=${project.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <FileText className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="font-medium">Budget</p>
                <p className="text-sm text-muted-foreground">Track spending</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects/${project.id}/documents`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <FileText className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="font-medium">Documents</p>
                <p className="text-sm text-muted-foreground">{project._count?.documents ?? 0} files</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/projects/${project.id}/snag-list`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <p className="font-medium">Snag List</p>
                <p className="text-sm text-muted-foreground">{project._count?.snagItems ?? 0} items</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

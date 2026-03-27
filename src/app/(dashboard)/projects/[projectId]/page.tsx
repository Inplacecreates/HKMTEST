"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  FileText, AlertTriangle,
} from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${params.projectId}`)
      .then((r) => r.json())
      .then(setProject)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.projectId]);

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
      <div className="flex items-start justify-between">
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
          <Button size="sm" variant="outline" disabled>
            <Plus className="mr-1 h-3.5 w-3.5" />Add Site
          </Button>
        </CardHeader>
        <CardContent>
          {project.sites?.length > 0 ? (
            <div className="space-y-3">
              {project.sites.map((site: any) => (
                <div key={site.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{site.name}</p>
                    {site.address && <p className="text-sm text-muted-foreground">{site.address}</p>}
                    {site.siteManager && (
                      <p className="text-sm text-muted-foreground">Manager: {site.siteManager.fullName}</p>
                    )}
                  </div>
                  <Badge variant={site.status === "ACTIVE" ? "default" : "secondary"}>
                    {site.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sites added yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`/projects/${project.id}/budget`}>
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

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, ClipboardList } from "lucide-react";
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "@/lib/utils/constants";
import { formatKES, formatDate } from "@/lib/utils/format";
import type { ProjectStatus } from "@/generated/prisma";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    code: string;
    clientName: string;
    address?: string | null;
    status: ProjectStatus;
    totalBudget: string | number;
    startDate?: string | null;
    _count: { sites: number; requisitions: number };
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{project.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{project.clientName}</p>
            </div>
            <Badge className={PROJECT_STATUS_COLORS[project.status]}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{project.address}</span>
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{project._count.sites} sites</span>
            </div>
            <div className="flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              <span>{project._count.requisitions} requisitions</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <span className="text-muted-foreground">Budget</span>
            <span className="font-medium">{formatKES(project.totalBudget)}</span>
          </div>
          {project.startDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Started</span>
              <span>{formatDate(project.startDate)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

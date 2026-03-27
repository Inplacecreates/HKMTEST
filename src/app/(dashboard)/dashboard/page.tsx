"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderKanban,
  ClipboardList,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma";

export default function DashboardPage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setRole(data.role);
        setFullName(data.fullName);
      })
      .catch(() => {});
  }, []);

  if (!role) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {fullName.split(" ")[0]}</h1>
        <p className="text-muted-foreground">Here is what is happening across your projects today.</p>
      </div>

      {/* CEO / PM Dashboard */}
      {(role === "CEO" || role === "PROJECT_MANAGER") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Active Projects" value="0" icon={FolderKanban} subtitle="Across all sites" />
            <StatCard title="Open Requisitions" value="0" icon={ClipboardList} subtitle="Awaiting action" />
            <StatCard title="Pending Approvals" value="0" icon={Clock} subtitle="Needs your attention" />
            <StatCard title="Total Spend (Month)" value="KES 0" icon={DollarSign} subtitle="March 2026" />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No activity yet. Create your first project to get started.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Budget Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Budget data will appear here once projects are set up.</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Site Manager Dashboard */}
      {role === "SITE_MANAGER" && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="My Requisitions" value="0" icon={ClipboardList} subtitle="Active requests" />
            <StatCard title="Pending Deliveries" value="0" icon={Truck} subtitle="En route to site" />
            <StatCard title="Items to Verify" value="0" icon={CheckCircle2} subtitle="Awaiting your check" />
            <StatCard title="Low Stock Items" value="0" icon={AlertTriangle} subtitle="Need reordering" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requisition Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Your requisition pipeline will appear here. Create a material request to get started.</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Driver Dashboard */}
      {(role === "DRIVER" || role === "CO_DRIVER") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Today's Collections" value="0" icon={ShoppingCart} subtitle="Assigned to you" />
            <StatCard title="Completed This Week" value="0" icon={CheckCircle2} subtitle="Deliveries made" />
            <StatCard title="Pending" value="0" icon={Clock} subtitle="Awaiting collection" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">My Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No purchase orders assigned yet. Assignments will appear here when a Project Manager creates them.</p>
            </CardContent>
          </Card>
        </>
      )}

      {/* QS / Architect Dashboard */}
      {(role === "QS" || role === "ARCHITECT") && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Active Projects" value="0" icon={FolderKanban} subtitle="In progress" />
            <StatCard title="Documents" value="0" icon={ClipboardList} subtitle="Plans & drawings" />
            <StatCard title="Open Snag Items" value="0" icon={AlertTriangle} subtitle="Pending resolution" />
          </div>
        </>
      )}
    </div>
  );
}

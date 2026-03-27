"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { RequisitionCard } from "@/components/requisitions/requisition-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import type { RequisitionStatus } from "@/generated/prisma";
import { REQUISITION_STATUS_LABELS } from "@/lib/utils/constants";

interface UserInfo {
  id: string;
  role: string;
  tenantId: string;
}

export default function RequisitionsPage() {
  const [requisitions, setRequisitions] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(setUser)
      .catch(() => {});
  }, []);

  const loadRequisitions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/requisitions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRequisitions(data.requisitions || []);
        setTotal(data.total || 0);
      }
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadRequisitions();
  }, [loadRequisitions]);

  const canCreate = user?.role === "SITE_MANAGER" || user?.role === "CEO";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Requisitions</h1>
          <p className="text-sm text-gray-500">
            {total} requisition{total !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link href="/requisitions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Requisition
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-48"
        >
          <option value="">All Statuses</option>
          {(Object.keys(REQUISITION_STATUS_LABELS) as RequisitionStatus[]).map((status) => (
            <option key={status} value={status}>
              {REQUISITION_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      {/* Requisition list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : requisitions.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No requisitions found"
          description={
            statusFilter
              ? "No requisitions match the selected filter."
              : canCreate
                ? "Create your first material requisition to get started."
                : "No requisitions have been submitted yet."
          }
        />
      ) : (
        <div className="space-y-3">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {requisitions.map((req: any) => (
            <RequisitionCard key={req.id} requisition={req} />
          ))}
        </div>
      )}
    </div>
  );
}

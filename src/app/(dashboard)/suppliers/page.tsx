"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Plus, Building2, Phone, Mail, Star, Hash } from "lucide-react";

interface UserInfo {
  role: string;
}

export default function SuppliersPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then(setUser).catch(() => {});
  }, []);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const canManage = user?.role === "CEO" || user?.role === "PROJECT_MANAGER";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-gray-500">{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}</p>
        </div>
        {canManage && (
          <Link href="/suppliers/new">
            <Button><Plus className="mr-2 h-4 w-4" />Add Supplier</Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No suppliers yet"
          description="Add your first supplier to start managing your supply chain."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier: any) => (
            <Link key={supplier.id} href={`/suppliers/${supplier.id}`}>
              <div className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                  {supplier.rating && (
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-xs font-medium">{Number(supplier.rating).toFixed(1)}</span>
                    </div>
                  )}
                </div>
                {supplier.contactPerson && (
                  <p className="text-sm text-gray-600 mt-1">{supplier.contactPerson}</p>
                )}
                <div className="mt-3 space-y-1">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone className="h-3 w-3" />{supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Mail className="h-3 w-3" />{supplier.email}
                    </div>
                  )}
                  {supplier.kraPin && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Hash className="h-3 w-3" />KRA: {supplier.kraPin}
                    </div>
                  )}
                </div>
                {supplier.categories?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {supplier.categories.slice(0, 3).map((cat: string) => (
                      <span key={cat} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-3 text-xs text-gray-400">
                  <span>{supplier._count?.purchaseOrders || 0} POs</span>
                  <span>{supplier._count?.requisitionItems || 0} items</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

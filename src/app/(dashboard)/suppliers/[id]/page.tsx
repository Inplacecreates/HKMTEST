"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDate } from "@/lib/utils/format";
import { ArrowLeft, Phone, Mail, MapPin, Star } from "lucide-react";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSupplier = useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}`);
      if (res.ok) setSupplier(await res.json());
      else if (res.status === 404) router.push("/suppliers");
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { loadSupplier(); }, [loadSupplier]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!supplier) return <div>Supplier not found</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/suppliers">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{supplier.name}</h1>
            {supplier.rating && (
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">{Number(supplier.rating).toFixed(1)}</span>
              </div>
            )}
          </div>
          {supplier.contactPerson && (
            <p className="text-sm text-gray-500">{supplier.contactPerson}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {supplier.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${supplier.phone}`} className="text-primary-600 hover:underline">{supplier.phone}</a>
              </div>
            )}
            {supplier.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${supplier.email}`} className="text-primary-600 hover:underline">{supplier.email}</a>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{supplier.address}</span>
              </div>
            )}
            {supplier.paymentTerms && (
              <div className="text-sm">
                <span className="text-gray-500">Payment Terms:</span>{" "}
                <span className="font-medium">{supplier.paymentTerms}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Purchase Orders</span>
              <span className="font-semibold">{supplier._count?.purchaseOrders || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Items Supplied</span>
              <span className="font-semibold">{supplier._count?.requisitionItems || 0}</span>
            </div>
            {supplier.categories?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Categories</p>
                <div className="flex flex-wrap gap-1">
                  {supplier.categories.map((cat: string) => (
                    <span key={cat} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{cat}</span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price History */}
      {supplier.priceHistory?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Price History</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-600">Item</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Unit</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Price</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {supplier.priceHistory.map((ph: any) => (
                  <tr key={ph.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{ph.itemName}</td>
                    <td className="px-3 py-2 text-gray-600">{ph.unit}</td>
                    <td className="px-3 py-2 text-right">{formatKES(Number(ph.price))}</td>
                    <td className="px-3 py-2 text-gray-600">{formatDate(new Date(ph.quotedDate))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

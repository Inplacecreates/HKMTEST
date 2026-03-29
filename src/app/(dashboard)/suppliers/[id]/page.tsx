"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKES, formatDate } from "@/lib/utils/format";
import { ArrowLeft, Phone, Mail, MapPin, Star, Pencil, X, Check, Eye, EyeOff } from "lucide-react";

// KRA PIN validation: letter + 9 digits + letter  e.g. A123456789B
function validateKraPin(pin: string): boolean {
  return /^[A-Z]\d{9}[A-Z]$/.test(pin.toUpperCase());
}

function maskKraPin(pin: string): string {
  if (!pin || pin.length < 4) return pin;
  return pin.slice(0, 3) + "*".repeat(pin.length - 4) + pin.slice(-1);
}

const SUPPLIER_CATEGORIES = [
  "cement", "building materials", "steel", "roofing", "timber", "plywood",
  "plumbing", "pipes", "electrical", "wiring", "finishing", "paint",
  "hardware", "tiles", "doors", "windows", "consumables", "other",
];

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [kraVisible, setKraVisible] = useState(false);
  const [form, setForm] = useState({
    name: "", contactPerson: "", phone: "", email: "",
    address: "", town: "", paymentTerms: "", kraPin: "",
    rating: "", notes: "", categories: [] as string[],
  });
  const [pinError, setPinError] = useState("");

  const loadSupplier = useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSupplier(data);
        setForm({
          name: data.name ?? "",
          contactPerson: data.contactPerson ?? "",
          phone: data.phone ?? "",
          email: data.email ?? "",
          address: data.address ?? "",
          town: data.town ?? "",
          paymentTerms: data.paymentTerms ?? "Net 30",
          kraPin: data.kraPin ?? "",
          rating: data.rating != null ? String(data.rating) : "",
          notes: data.notes ?? "",
          categories: data.categories ?? [],
        });
      } else if (res.status === 404) router.push("/suppliers");
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => { loadSupplier(); }, [loadSupplier]);

  function toggleCategory(cat: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setSaveError("Company name is required."); return; }
    if (form.kraPin && !validateKraPin(form.kraPin)) {
      setPinError("KRA PIN must be in the format A123456789B (letter, 9 digits, letter).");
      return;
    }
    setPinError("");
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          rating: form.rating ? parseFloat(form.rating) : null,
          kraPin: form.kraPin ? form.kraPin.toUpperCase() : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSaveError(d.error ?? "Failed to save");
        return;
      }
      setShowEdit(false);
      loadSupplier();
    } catch { setSaveError("Network error"); } finally { setSaving(false); }
  }

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
      <div className="flex items-center justify-between">
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
        <Button onClick={() => setShowEdit(!showEdit)} variant={showEdit ? "outline" : "default"}>
          {showEdit ? <><X className="mr-1 h-4 w-4" />Cancel</> : <><Pencil className="mr-1 h-4 w-4" />Edit</>}
        </Button>
      </div>

      {/* Edit Form */}
      {showEdit && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader><CardTitle className="text-base">Edit Supplier</CardTitle></CardHeader>
          <CardContent>
            {saveError && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{saveError}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Company Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Town / City</Label>
                <Input value={form.town} onChange={(e) => setForm({ ...form, town: e.target.value })} placeholder="Nairobi" />
              </div>
              <div className="sm:col-span-2">
                <Label>Physical Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Select value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Net 7">Net 7</option>
                  <option value="Net 14">Net 14</option>
                  <option value="Net 30">Net 30</option>
                </Select>
              </div>
              <div>
                <Label>Rating (1–5)</Label>
                <Input
                  type="number" min="1" max="5" step="0.5"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  placeholder="4.5"
                />
              </div>
              <div>
                <Label>KRA PIN</Label>
                <Input
                  value={form.kraPin}
                  onChange={(e) => { setForm({ ...form, kraPin: e.target.value }); setPinError(""); }}
                  placeholder="A123456789B"
                  className={pinError ? "border-red-500" : ""}
                />
                {pinError && <p className="text-xs text-red-500 mt-1">{pinError}</p>}
                <p className="text-xs text-gray-400 mt-1">Format: Letter + 9 digits + Letter (e.g. A123456789B)</p>
              </div>
              <div className="sm:col-span-2">
                <Label>Categories</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {SUPPLIER_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.categories.includes(cat) ? "bg-primary-100 text-primary-700 border-primary-300" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Additional notes about this supplier…"
                  className="h-20"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEdit(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                <Check className="mr-1 h-4 w-4" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            {(supplier.address || supplier.town) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{[supplier.address, supplier.town].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {supplier.paymentTerms && (
              <div className="text-sm">
                <span className="text-gray-500">Payment Terms:</span>{" "}
                <span className="font-medium">{supplier.paymentTerms}</span>
              </div>
            )}
            {supplier.kraPin && (
              <div className="text-sm flex items-center gap-2">
                <span className="text-gray-500">KRA PIN:</span>
                <span className="font-mono font-medium">
                  {kraVisible ? supplier.kraPin : maskKraPin(supplier.kraPin)}
                </span>
                <button
                  type="button"
                  onClick={() => setKraVisible(!kraVisible)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {kraVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            {supplier.notes && (
              <div className="text-sm text-gray-600 border-t pt-2 mt-2">{supplier.notes}</div>
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

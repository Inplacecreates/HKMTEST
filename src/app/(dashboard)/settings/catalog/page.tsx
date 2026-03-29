"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Pencil, X, Check, PackageSearch, ChevronLeft, ChevronRight } from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  defaultUnit: string;
  category: string;
  sku: string | null;
  averagePrice: number | null;
  isActive: boolean;
}

const CATEGORIES = [
  "Concrete & Masonry", "Steel & Ironmongery", "Timber & Board", "Roofing",
  "Plumbing", "Electrical", "Finishes", "Doors & Windows", "Consumables", "Other",
];

const UNITS = [
  "bags", "pieces", "metres", "sq.m", "cu.m", "kg", "tonnes",
  "litres", "rolls", "sheets", "trips", "boxes", "sets", "bundles", "pairs", "tins",
];

const EMPTY_FORM = {
  name: "", description: "", defaultUnit: "pieces", category: "Concrete & Masonry",
  sku: "", averagePrice: "",
};

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search ? { search } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
      });
      // Include inactive items for management
      const res = await fetch(`/api/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(item: CatalogItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description ?? "",
      defaultUnit: item.defaultUnit,
      category: item.category,
      sku: item.sku ?? "",
      averagePrice: item.averagePrice != null ? String(item.averagePrice) : "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.defaultUnit || !form.category) {
      setFormError("Name, unit, and category are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description || null,
        defaultUnit: form.defaultUnit,
        category: form.category,
        sku: form.sku || null,
        averagePrice: form.averagePrice ? form.averagePrice : null,
      };
      const res = editingId
        ? await fetch(`/api/items/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error ?? "Failed to save");
        return;
      }
      setShowForm(false);
      setPage(1);
      load();
    } catch {
      setFormError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id: string, isActive: boolean) {
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    load();
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Item Catalog</h1>
          <p className="text-sm text-gray-500">Manage construction materials and their default prices</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit Item" : "New Catalog Item"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Label>Item Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cement (Bamburi OPC 42.5R)"
                />
              </div>
              <div>
                <Label>SKU / Item Code</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="CEM-BAM-42"
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Default Unit *</Label>
                <Select
                  value={form.defaultUnit}
                  onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Default Price (KES)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.averagePrice}
                  onChange={(e) => setForm({ ...form, averagePrice: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional notes about this item…"
                  className="h-16"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Check className="mr-1 h-4 w-4" />
                {saving ? "Saving…" : "Save Item"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search items…"
            className="pl-8"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="w-52"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <PackageSearch className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No items found</p>
              <p className="text-sm text-gray-400">Try changing your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Unit</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Price (KES)</th>
                    <th className="px-4 py-3 font-medium text-gray-600">SKU</th>
                    <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className={`border-b hover:bg-gray-50 ${!item.isActive ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="text-xs bg-blue-50 text-blue-700 border-0">
                          {item.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{item.defaultUnit}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {item.averagePrice != null
                          ? Number(item.averagePrice).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {item.sku ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(item)}
                            className="h-7 px-2 text-xs"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(item.id, item.isActive)}
                            className="h-7 px-2 text-xs text-gray-500"
                          >
                            {item.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} items</span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

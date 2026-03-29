"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, Search, Loader2 } from "lucide-react";
import Link from "next/link";

interface ItemRow {
  id: string;
  itemName: string;
  catalogItemId: string | null;
  description: string;
  unit: string;
  qtyRequested: string;
  unitPrice: string;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface SiteOption {
  id: string;
  name: string;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  averagePrice: number | null;
}

const UNITS = [
  "bags", "pieces", "metres", "sq.m", "cu.m", "kg", "tonnes",
  "litres", "rolls", "sheets", "trips", "boxes", "sets", "bundles", "pairs",
];

function createEmptyItem(): ItemRow {
  return {
    id: crypto.randomUUID(),
    itemName: "",
    catalogItemId: null,
    description: "",
    unit: "pieces",
    qtyRequested: "",
    unitPrice: "",
  };
}

// Searchable catalog item input
function ItemSearchInput({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (item: CatalogItem | null, typedName: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/items?search=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.items ?? []);
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onSelect(null, "");
          }}
          onFocus={() => { if (query) setOpen(true); }}
          placeholder="Search or type item name..."
          className="pl-8"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>
      {open && (query.length > 0) && (
        <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-52 overflow-y-auto">
          {results.length > 0 ? (
            <>
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(item.name);
                    setOpen(false);
                    onSelect(item, item.name);
                  }}
                >
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    {item.category} · {item.defaultUnit}
                    {item.averagePrice != null
                      ? ` · KES ${Number(item.averagePrice).toLocaleString()}`
                      : ""}
                  </div>
                </button>
              ))}
              <div className="px-3 py-1.5 text-xs text-gray-400 border-t">
                Or press enter to use &ldquo;{query}&rdquo; as a custom item
              </div>
            </>
          ) : searching ? null : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No catalog items found — &ldquo;{query}&rdquo; will be used as a custom item
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewRequisitionPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [projectId, setProjectId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [notes, setNotes] = useState("");
  const [clientSpecs, setClientSpecs] = useState("");
  const [items, setItems] = useState<ItemRow[]>([createEmptyItem()]);

  // Load projects on mount
  useEffect(() => {
    setProjectsLoading(true);
    setProjectsError("");
    fetch("/api/projects")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch((e) => setProjectsError(e.message ?? "Failed to load projects"))
      .finally(() => setProjectsLoading(false));
  }, []);

  // Load sites when project changes
  useEffect(() => {
    if (!projectId) {
      setSites([]);
      return;
    }
    setSitesLoading(true);
    fetch(`/api/sites?projectId=${projectId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setSites(Array.isArray(data) ? data : []))
      .catch(() => setSites([]))
      .finally(() => setSitesLoading(false));
  }, [projectId]);

  const addItem = () => setItems([...items, createEmptyItem()]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemRow, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleCatalogSelect = (rowId: string, catalogItem: CatalogItem | null, typedName: string) => {
    if (catalogItem) {
      setItems(items.map((item) =>
        item.id === rowId
          ? {
              ...item,
              itemName: catalogItem.name,
              catalogItemId: catalogItem.id,
              unit: catalogItem.defaultUnit,
              unitPrice: catalogItem.averagePrice != null
                ? String(catalogItem.averagePrice)
                : item.unitPrice,
            }
          : item
      ));
    } else {
      setItems(items.map((item) =>
        item.id === rowId
          ? { ...item, itemName: typedName, catalogItemId: null }
          : item
      ));
    }
  };

  const handleSubmit = async (asDraft: boolean) => {
    setError("");

    if (!projectId || !siteId) {
      setError("Please select a project and site.");
      return;
    }

    const validItems = items.filter((item) => item.itemName && item.qtyRequested);
    if (validItems.length === 0) {
      setError("Please add at least one item with a name and quantity.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          siteId,
          priority,
          notes: notes || undefined,
          clientSpecs: clientSpecs || undefined,
          items: validItems.map((item) => ({
            itemName: item.itemName,
            catalogItemId: item.catalogItemId ?? undefined,
            description: item.description || undefined,
            unit: item.unit,
            qtyRequested: Number(item.qtyRequested),
            unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create requisition");
      }

      const requisition = await res.json();

      if (!asDraft) {
        const transRes = await fetch(`/api/requisitions/${requisition.id}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetStatus: "SUBMITTED" }),
        });
        if (!transRes.ok) {
          // Redirect anyway — it was saved as draft
        }
      }

      router.push(`/requisitions/${requisition.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create requisition");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/requisitions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Requisition</h1>
          <p className="text-sm text-gray-500">Request materials for your site</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Project & Site Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Project &amp; Site</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {/* Project dropdown */}
          <div>
            <Label>Project</Label>
            {projectsLoading ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : projectsError ? (
              <div className="text-sm text-red-600 mt-1">{projectsError}</div>
            ) : (
              <Select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setSiteId("");
                }}
              >
                <option value="">Select project…</option>
                {projects.length === 0 ? (
                  <option disabled>No projects available</option>
                ) : (
                  projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.name}
                    </option>
                  ))
                )}
              </Select>
            )}
          </div>

          {/* Site dropdown */}
          <div>
            <Label>Site</Label>
            {sitesLoading ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <Select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                disabled={!projectId}
              >
                <option value="">
                  {!projectId
                    ? "Select project first"
                    : sites.length === 0
                    ? "No sites for this project"
                    : "Select site…"}
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="CRITICAL">Critical</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-3 w-3" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="rounded-lg border bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                {items.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label>Item Name</Label>
                  <ItemSearchInput
                    value={item.itemName}
                    onSelect={(catalogItem, typedName) =>
                      handleCatalogSelect(item.id, catalogItem, typedName)
                    }
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select
                    value={item.unit}
                    onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.qtyRequested}
                    onChange={(e) => updateItem(item.id, "qtyRequested", e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label>Est. Unit Price (KES) <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                    placeholder="Auto-filled from catalog"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <Label>Description <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="Specs, brand, size…"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes for the PM…"
            />
          </div>
          <div>
            <Label>Client Specifications</Label>
            <Textarea
              value={clientSpecs}
              onChange={(e) => setClientSpecs(e.target.value)}
              placeholder="Specific requirements from the client…"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/requisitions">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={submitting}>
          {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
          Submit Requisition
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2, Clock, Wrench } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

const SNAG_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  FIXED: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-green-700",
};

const SNAG_PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  NORMAL: "bg-blue-100 text-blue-600",
  URGENT: "bg-amber-100 text-amber-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const CATEGORIES = [
  "Structural", "Electrical", "Plumbing", "Finishing", "Roofing",
  "Windows & Doors", "Flooring", "Painting", "Safety", "Other",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SnagListPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [items, setItems] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    title: "", description: "", category: "Other", priority: "NORMAL",
    siteId: "", assignedTo: "", dueDate: "",
  };
  const [form, setForm] = useState(defaultForm);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params2 = new URLSearchParams();
      if (statusFilter) params2.set("status", statusFilter);
      const res = await fetch(`/api/projects/${projectId}/snag?${params2}`);
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`).then((r) => r.json()).then(setProject).catch(() => {});
    fetch("/api/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])).catch(() => {});
    loadItems();
  }, [projectId, loadItems]);

  const handleSubmit = async () => {
    if (!form.title || !form.siteId || !form.category) return;
    setSaving(true);
    try {
      if (editItem) {
        const res = await fetch(`/api/projects/${projectId}/snag/${editItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const updated = await res.json();
          setItems((prev) => prev.map((i) => (i.id === editItem.id ? updated : i)));
        }
      } else {
        const res = await fetch(`/api/projects/${projectId}/snag`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (res.ok) {
          const created = await res.json();
          setItems((prev) => [created, ...prev]);
        }
      }
      setForm(defaultForm);
      setShowForm(false);
      setEditItem(null);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (item: any, status: string) => {
    const res = await fetch(`/api/projects/${projectId}/snag/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    }
  };

  const openEdit = (item: any) => {
    setForm({
      title: item.title,
      description: item.description || "",
      category: item.category,
      priority: item.priority,
      siteId: item.siteId,
      assignedTo: item.assignedTo || "",
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : "",
    });
    setEditItem(item);
    setShowForm(true);
  };

  const sites = project?.sites || [];
  const openCount = items.filter((i) => i.status === "OPEN").length;
  const inProgressCount = items.filter((i) => i.status === "IN_PROGRESS").length;
  const fixedCount = items.filter((i) => i.status === "FIXED").length;
  const verifiedCount = items.filter((i) => i.status === "VERIFIED").length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Snag List</h1>
            <p className="text-sm text-gray-500">{project?.name}</p>
          </div>
        </div>
        <Button onClick={() => { setForm(defaultForm); setEditItem(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" />Add Item
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Open", count: openCount, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          { label: "In Progress", count: inProgressCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Fixed", count: fixedCount, icon: Wrench, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Verified", count: verifiedCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
        ].map((s) => (
          <Card key={s.label} className="cursor-pointer" onClick={() => setStatusFilter(s.label.toUpperCase().replace(" ", "_"))}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "OPEN", "IN_PROGRESS", "FIXED", "VERIFIED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-4 space-y-4">
            <h3 className="font-semibold">{editItem ? "Edit Snag Item" : "New Snag Item"}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe the issue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
                {sites.length === 0 ? (
                  <p className="text-sm text-amber-600">No sites on this project yet. Add a site first.</p>
                ) : (
                  <select
                    value={form.siteId}
                    onChange={(e) => setForm((f) => ({ ...f, siteId: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="">Select site</option>
                    {sites.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {["LOW", "NORMAL", "URGENT", "CRITICAL"].map((p) => (
                    <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {users.filter((u) => u.isActive).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional details..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={saving || !form.title || !form.siteId}>
                {saving ? "Saving…" : editItem ? "Save Changes" : "Add Item"}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditItem(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <CheckCircle2 className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No snag items{statusFilter ? " with this status" : ""}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="rounded-lg border bg-white p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{item.title}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SNAG_STATUS_COLORS[item.status]}`}>
                      {item.status.replace("_", " ")}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SNAG_PRIORITY_COLORS[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-2">
                    <span>{item.category}</span>
                    {item.site && <span>· {item.site.name}</span>}
                    {item.assignee && <span>· {item.assignee.fullName}</span>}
                    {item.dueDate && <span>· Due {formatDate(new Date(item.dueDate))}</span>}
                    <span>· {item.reporter?.fullName}</span>
                  </div>
                  {item.description && (
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {item.status === "OPEN" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item, "IN_PROGRESS")}>
                      Start
                    </Button>
                  )}
                  {item.status === "IN_PROGRESS" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item, "FIXED")}>
                      Mark Fixed
                    </Button>
                  )}
                  {item.status === "FIXED" && (
                    <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatus(item, "VERIFIED")}>
                      Verify
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

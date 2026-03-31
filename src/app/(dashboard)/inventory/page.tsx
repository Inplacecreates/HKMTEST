"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Package, Wrench, AlertTriangle, Plus, ArrowUpDown, Search,
  TrendingDown, TrendingUp, Hammer, CheckCircle2, Clock
} from "lucide-react";
import { formatDate } from "@/lib/utils/format";

type TabValue = "materials" | "tools";

// ── Site Materials Tab ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SiteMaterialsTab({ sites }: { sites: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [siteFilter, setSiteFilter] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    siteId: "", itemName: "", unit: "pieces", quantity: "", movementType: "ADJUSTMENT", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const url = siteFilter ? `/api/inventory?siteId=${siteFilter}` : "/api/inventory";
      const res = await fetch(url);
      if (res.ok) setInventory(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [siteFilter]);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  async function handleAdjust() {
    if (!adjustForm.siteId || !adjustForm.itemName || !adjustForm.quantity) return;
    setSaving(true);
    try {
      const qty = adjustForm.movementType === "OUT"
        ? -Math.abs(parseFloat(adjustForm.quantity))
        : Math.abs(parseFloat(adjustForm.quantity));
      await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adjustForm, quantity: qty }),
      });
      setShowAdjust(false);
      setAdjustForm({ siteId: "", itemName: "", unit: "pieces", quantity: "", movementType: "ADJUSTMENT", notes: "" });
      loadInventory();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  // Group by site
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bySite: Record<string, any[]> = {};
  for (const item of inventory) {
    const key = item.site?.name ?? "Unknown Site";
    bySite[key] = bySite[key] ?? [];
    bySite[key].push(item);
  }

  const lowStockItems = inventory.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (i: any) => i.minStockLevel > 0 && Number(i.qtyOnHand) <= Number(i.minStockLevel)
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-3">
            <div className="text-sm text-gray-500 flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Total Items</div>
            <p className="text-2xl font-bold">{inventory.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <div className="text-sm text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Low Stock</div>
            <p className="text-2xl font-bold text-amber-600">{lowStockItems.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <div className="text-sm text-gray-500 flex items-center gap-1"><ArrowUpDown className="h-3.5 w-3.5" /> Sites</div>
            <p className="text-2xl font-bold">{Object.keys(bySite).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Low stock warnings */}
      {lowStockItems.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
            <AlertTriangle className="h-4 w-4" />
            Low Stock Warnings
          </div>
          <div className="space-y-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {lowStockItems.map((item: any) => (
              <div key={item.id} className="text-sm text-amber-700">
                {item.itemName} — {Number(item.qtyOnHand).toLocaleString()} {item.unit} remaining
                (min: {Number(item.minStockLevel).toLocaleString()}) at {item.site?.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3 justify-between flex-wrap">
        <Select
          value={siteFilter}
          onChange={(e) => setSiteFilter(e.target.value)}
          className="w-52"
        >
          <option value="">All sites</option>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {sites.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Button onClick={() => setShowAdjust(!showAdjust)}>
          <Plus className="mr-1 h-4 w-4" />
          Log Movement
        </Button>
      </div>

      {/* Adjustment form */}
      {showAdjust && (
        <Card className="border-primary-200 bg-primary-50/20">
          <CardHeader><CardTitle className="text-base">Log Stock Movement</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Site</Label>
                <Select value={adjustForm.siteId} onChange={(e) => setAdjustForm({ ...adjustForm, siteId: e.target.value })}>
                  <option value="">Select site…</option>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>Item Name</Label>
                <Input value={adjustForm.itemName} onChange={(e) => setAdjustForm({ ...adjustForm, itemName: e.target.value })} placeholder="e.g. Cement bags" />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={adjustForm.unit} onChange={(e) => setAdjustForm({ ...adjustForm, unit: e.target.value })} placeholder="bags" />
              </div>
              <div>
                <Label>Movement Type</Label>
                <Select value={adjustForm.movementType} onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value })}>
                  <option value="IN">IN (Delivery received)</option>
                  <option value="OUT">OUT (Usage / Transfer)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Correction)</option>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min="0" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} placeholder="0" />
              </div>
              <div>
                <Label>Reason / Notes</Label>
                <Input value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder="e.g. damaged, theft, usage" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdjust(false)}>Cancel</Button>
              <Button onClick={handleAdjust} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory by site */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}</div>
      ) : inventory.length === 0 ? (
        <EmptyState icon={Package} title="No inventory records" description="Inventory is updated automatically when deliveries are verified. You can also log manual adjustments." />
      ) : (
        <div className="space-y-4">
          {Object.entries(bySite).map(([siteName, siteItems]) => (
            <Card key={siteName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700">{siteName}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="px-4 py-2 font-medium text-gray-600">Item</th>
                      <th className="px-4 py-2 font-medium text-gray-600 text-right">On Hand</th>
                      <th className="px-4 py-2 font-medium text-gray-600 text-right">Reserved</th>
                      <th className="px-4 py-2 font-medium text-gray-600">Last Updated</th>
                      <th className="px-4 py-2 font-medium text-gray-600">Recent Movements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {siteItems.map((item: any) => {
                      const isLow = item.minStockLevel > 0 && Number(item.qtyOnHand) <= Number(item.minStockLevel);
                      return (
                        <tr key={item.id} className={`border-b hover:bg-gray-50 ${isLow ? "bg-amber-50/50" : ""}`}>
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                              <span className="font-medium">{item.itemName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {Number(item.qtyOnHand).toLocaleString()} {item.unit}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-500">
                            {Number(item.qtyReserved).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">
                            {formatDate(new Date(item.lastUpdated))}
                          </td>
                          <td className="px-4 py-2">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {item.movements.slice(0, 2).map((m: any) => (
                              <div key={m.id} className="text-xs text-gray-500 flex items-center gap-1">
                                {m.movementType === "IN"
                                  ? <TrendingUp className="h-3 w-3 text-green-500" />
                                  : m.movementType === "OUT"
                                  ? <TrendingDown className="h-3 w-3 text-red-400" />
                                  : <ArrowUpDown className="h-3 w-3 text-gray-400" />}
                                {m.movementType} {Number(m.quantity).toLocaleString()} — {m.recorder?.fullName}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HKM Tools Store Tab ──────────────────────────────────────
function ToolsStoreTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [actionTool, setActionTool] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"checkout" | "checkin" | "service" | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);
  const [addForm, setAddForm] = useState({ name: "", category: "Power Tools", serialNumber: "", notes: "" });
  const [checkoutForm, setCheckoutForm] = useState({ projectId: "", expectedReturn: "", condition: "GOOD" });
  const [checkinForm, setCheckinForm] = useState({ conditionIn: "GOOD", damageNotes: "" });
  const [saving, setSaving] = useState(false);

  const loadTools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/tools?${params}`);
      if (res.ok) setTools(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { loadTools(); }, [loadTools]);

  useEffect(() => {
    fetch("/api/projects").then(r => r.ok ? r.json() : []).then(setProjects).catch(() => {});
  }, []);

  async function handleAddTool() {
    if (!addForm.name || !addForm.category) return;
    setSaving(true);
    try {
      await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      setShowAdd(false);
      setAddForm({ name: "", category: "Power Tools", serialNumber: "", notes: "" });
      loadTools();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  async function handleAction() {
    if (!actionTool) return;
    setSaving(true);
    try {
      const body = actionType === "checkout"
        ? { action: "checkout", ...checkoutForm }
        : actionType === "checkin"
        ? { action: "checkin", ...checkinForm }
        : { action: "service", serviceNotes: checkinForm.damageNotes };

      await fetch(`/api/tools/${actionTool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setActionTool(null);
      setActionType(null);
      loadTools();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  const TOOL_CATEGORIES = ["Power Tools", "Hand Tools", "Safety Equipment", "Vehicles", "Survey Equipment", "Other"];

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-700",
    CHECKED_OUT: "bg-blue-100 text-blue-700",
    IN_SERVICE: "bg-amber-100 text-amber-700",
    RETIRED: "bg-gray-100 text-gray-500",
    DECOMMISSIONED: "bg-red-100 text-red-400",
  };

  const [retireToolId, setRetireToolId] = useState<string | null>(null);
  const [retiring, setRetiring] = useState(false);

  async function handleRetire() {
    if (!retireToolId) return;
    setRetiring(true);
    try {
      await fetch(`/api/tools/${retireToolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DECOMMISSIONED" }),
      });
      setRetireToolId(null);
      loadTools();
    } catch { /* ignore */ } finally { setRetiring(false); }
  }

  const summaryByStatus = tools.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-5">
        {[
          { key: "AVAILABLE", label: "Available", icon: CheckCircle2, color: "text-green-600" },
          { key: "CHECKED_OUT", label: "Checked Out", icon: Hammer, color: "text-blue-600" },
          { key: "IN_SERVICE", label: "In Service", icon: Wrench, color: "text-amber-600" },
          { key: "RETIRED", label: "Retired", icon: Clock, color: "text-gray-400" },
          { key: "DECOMMISSIONED", label: "Decommissioned", icon: Clock, color: "text-red-400" },
        ].map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="pt-3">
              <div className={`text-sm flex items-center gap-1 ${color}`}><Icon className="h-3.5 w-3.5" />{label}</div>
              <p className="text-2xl font-bold">{summaryByStatus[key] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-between flex-wrap">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tools…" className="pl-8" />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-44">
            <option value="">All statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="IN_SERVICE">In Service</option>
            <option value="RETIRED">Retired</option>
          </Select>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-1 h-4 w-4" />
          Add Tool
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <Card className="border-primary-200 bg-primary-50/20">
          <CardHeader><CardTitle className="text-base">Register New Tool</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Tool Name *</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="e.g. Hilti SDS Drill" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}>
                  {TOOL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label>Serial / Asset No.</Label>
                <Input value={addForm.serialNumber} onChange={(e) => setAddForm({ ...addForm, serialNumber: e.target.value })} placeholder="SN-12345" />
              </div>
              <div>
                <Label>Notes</Label>
                <Input value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })} placeholder="Optional notes" />
              </div>
            </div>
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAddTool} disabled={saving}>{saving ? "Saving…" : "Add Tool"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action panel */}
      {actionTool && actionType && (
        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader>
            <CardTitle className="text-base">
              {actionType === "checkout" ? `Check Out: ${actionTool.name}` :
               actionType === "checkin" ? `Check In: ${actionTool.name}` :
               `Send to Service: ${actionTool.name}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {actionType === "checkout" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Project *</Label>
                  <Select value={checkoutForm.projectId} onChange={(e) => setCheckoutForm({ ...checkoutForm, projectId: e.target.value })}>
                    <option value="">Select project…</option>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {projects.map((p: any) => <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Expected Return Date</Label>
                  <Input type="date" value={checkoutForm.expectedReturn} onChange={(e) => setCheckoutForm({ ...checkoutForm, expectedReturn: e.target.value })} />
                </div>
              </div>
            )}
            {(actionType === "checkin" || actionType === "service") && (
              <div className="grid gap-3 sm:grid-cols-2">
                {actionType === "checkin" && (
                  <div>
                    <Label>Condition on Return</Label>
                    <Select value={checkinForm.conditionIn} onChange={(e) => setCheckinForm({ ...checkinForm, conditionIn: e.target.value })}>
                      <option value="EXCELLENT">Excellent</option>
                      <option value="GOOD">Good</option>
                      <option value="FAIR">Fair</option>
                      <option value="DAMAGED">Damaged</option>
                      <option value="NEEDS_SERVICE">Needs Service</option>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>{actionType === "checkin" ? "Damage Notes" : "Service Notes"}</Label>
                  <Textarea
                    value={checkinForm.damageNotes}
                    onChange={(e) => setCheckinForm({ ...checkinForm, damageNotes: e.target.value })}
                    placeholder="Describe any damage or service needed…"
                    className="h-16"
                  />
                </div>
              </div>
            )}
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setActionTool(null); setActionType(null); }}>Cancel</Button>
              <Button onClick={handleAction} disabled={saving}>{saving ? "Saving…" : "Confirm"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retire confirmation */}
      {retireToolId && (
        <Card className="border-red-200 bg-red-50/20">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-red-700">
              Mark this tool as decommissioned? It will be moved to the bottom of the list with a Decommissioned badge.
            </p>
            <div className="mt-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRetireToolId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleRetire} disabled={retiring}>
                {retiring ? "Decommissioning…" : "Confirm Decommission"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools table */}
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : tools.length === 0 ? (
        <EmptyState icon={Wrench} title="No tools registered" description="Add tools to the HKM store to track check-out and maintenance." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Tool</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Current Location</th>
                  <th className="px-4 py-3 font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {[...tools.filter((t: any) => t.status !== "DECOMMISSIONED"), ...tools.filter((t: any) => t.status === "DECOMMISSIONED")].map((tool: any) => {
                  const lastMove = tool.movements?.[0];
                  const isDecommissioned = tool.status === "DECOMMISSIONED";
                  return (
                    <tr key={tool.id} className={`border-b hover:bg-gray-50 ${isDecommissioned ? "opacity-50 bg-gray-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{tool.name}</div>
                        {tool.serialNumber && (
                          <div className="text-xs text-gray-400 font-mono">{tool.serialNumber}</div>
                        )}
                        {isDecommissioned && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-500 mt-1">
                            Decommissioned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tool.category}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[tool.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {tool.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {lastMove?.project ? `${lastMove.project.name}` : "—"}
                        {lastMove?.checkedOutUser ? ` / ${lastMove.checkedOutUser.fullName}` : ""}
                        {lastMove?.expectedReturn && tool.status === "CHECKED_OUT" ? (
                          <div className="text-xs text-amber-600">Due: {formatDate(new Date(lastMove.expectedReturn))}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {!isDecommissioned && (
                          <div className="flex gap-1 justify-end">
                            {tool.status === "AVAILABLE" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs"
                                onClick={() => { setActionTool(tool); setActionType("checkout"); setCheckoutForm({ projectId: "", expectedReturn: "", condition: "GOOD" }); }}>
                                Check Out
                              </Button>
                            )}
                            {tool.status === "CHECKED_OUT" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs"
                                onClick={() => { setActionTool(tool); setActionType("checkin"); setCheckinForm({ conditionIn: "GOOD", damageNotes: "" }); }}>
                                Check In
                              </Button>
                            )}
                            {tool.status === "AVAILABLE" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs text-amber-600"
                                onClick={() => { setActionTool(tool); setActionType("service"); setCheckinForm({ conditionIn: "GOOD", damageNotes: "" }); }}>
                                Service
                              </Button>
                            )}
                            {tool.status === "IN_SERVICE" && (
                              <Button variant="outline" size="sm" className="h-7 text-xs text-green-600"
                                onClick={() => { setActionTool(tool); setActionType("checkin"); setCheckinForm({ conditionIn: "GOOD", damageNotes: "" }); }}>
                                Mark Ready
                              </Button>
                            )}
                            {(tool.status === "AVAILABLE" || tool.status === "RETIRED") && (
                              <Button variant="outline" size="sm" className="h-7 text-xs text-red-500"
                                onClick={() => setRetireToolId(tool.id)}>
                                Retire
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("materials");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sites, setSites] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.ok ? r.json() : [])
      .then(setSites)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Inventory</h1>
        <p className="text-sm text-gray-500">Site materials and HKM tools store</p>
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 rounded-lg border bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setActiveTab("materials")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "materials" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Package className="h-4 w-4" />
          Site Materials
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === "tools" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Wrench className="h-4 w-4" />
          HKM Tools Store
        </button>
      </div>

      {activeTab === "materials" ? (
        <SiteMaterialsTab sites={sites} />
      ) : (
        <ToolsStoreTab />
      )}
    </div>
  );
}

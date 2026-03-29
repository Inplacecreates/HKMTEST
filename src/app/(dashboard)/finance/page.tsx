"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { formatKES } from "@/lib/utils/format";
import { budgetPercentage, budgetHealthColor } from "@/lib/utils/format";
import { DollarSign, TrendingUp, AlertTriangle, Pencil, X, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const BUDGET_CATEGORIES = [
  { key: "materials", label: "Materials" },
  { key: "labor", label: "Labour" },
  { key: "equipment", label: "Equipment/Plant" },
  { key: "overhead", label: "Overheads" },
  { key: "contingency", label: "Contingency" },
];

const PAYMENT_METHODS = ["Bank Transfer", "Cheque", "Cash", "MPESA", "Other"];

export default function FinancePage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "", paymentDate: "", paymentMethod: "Bank Transfer", reference: "", notes: "",
  });

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance");
      if (res.ok) setProjects(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFinance(); }, [loadFinance]);

  async function openEdit(projectId: string) {
    if (editingProjectId === projectId) { setEditingProjectId(null); return; }
    setEditingProjectId(projectId);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/finance/project/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        // Initialise budget form from existing budgets
        const budgets: Record<string, string> = {};
        for (const cat of BUDGET_CATEGORIES) {
          const existing = data.budgets?.find((b: any) => b.category === cat.key);
          budgets[cat.key] = existing ? String(Number(existing.allocated)) : "";
        }
        setEditData({
          contractValue: data.project?.contractValue != null ? String(Number(data.project.contractValue)) : "",
          startDate: data.project?.startDate ? data.project.startDate.split("T")[0] : "",
          expectedEndDate: data.project?.expectedEndDate ? data.project.expectedEndDate.split("T")[0] : "",
          budgets,
          payments: data.payments ?? [],
        });
      }
    } catch { /* ignore */ } finally { setEditLoading(false); }
  }

  async function handleSave(projectId: string) {
    setSaveError("");
    setSaving(true);
    try {
      const budgets = BUDGET_CATEGORIES
        .filter((c) => editData.budgets[c.key])
        .map((c) => ({ category: c.key, allocated: editData.budgets[c.key] }));

      const res = await fetch(`/api/finance/project/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractValue: editData.contractValue || undefined,
          startDate: editData.startDate || undefined,
          expectedEndDate: editData.expectedEndDate || undefined,
          budgets,
        }),
      });
      if (!res.ok) { const d = await res.json(); setSaveError(d.error ?? "Failed"); return; }
      setEditingProjectId(null);
      loadFinance();
    } catch { setSaveError("Network error"); } finally { setSaving(false); }
  }

  async function handleAddPayment(projectId: string) {
    if (!paymentForm.amount || !paymentForm.paymentDate) return;
    setSaving(true);
    try {
      await fetch(`/api/finance/project/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment: paymentForm }),
      });
      setShowPaymentForm(false);
      setPaymentForm({ amount: "", paymentDate: "", paymentMethod: "Bank Transfer", reference: "", notes: "" });
      // Reload edit data
      const res = await fetch(`/api/finance/project/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setEditData((prev: any) => ({ ...prev, payments: data.payments ?? [] }));
      }
      loadFinance();
    } catch { /* ignore */ } finally { setSaving(false); }
  }

  // Summary totals
  const totalBudget = projects.reduce((s, p) => s + (p.totalBudget || 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.totalSpent || 0), 0);
  const totalCommitted = projects.reduce((s, p) => s + (p.totalCommitted || 0), 0);
  const totalPayments = projects.reduce((s, p) => s + (p.totalPayments || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance Overview</h1>
        <p className="text-sm text-gray-500">Budget tracking and client payments across all projects</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No financial data"
          description="Financial data will appear once projects have budgets and requisitions."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500"><DollarSign className="h-4 w-4" />Total Budget</div>
                <p className="text-2xl font-bold mt-1">{formatKES(totalBudget)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500"><TrendingUp className="h-4 w-4" />Total Spent</div>
                <p className="text-2xl font-bold mt-1">{formatKES(totalSpent)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500"><AlertTriangle className="h-4 w-4" />Committed</div>
                <p className="text-2xl font-bold mt-1">{formatKES(totalCommitted)}</p>
                <p className="text-xs text-gray-400 mt-1">In approved requisitions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-green-600"><DollarSign className="h-4 w-4" />Client Payments</div>
                <p className="text-2xl font-bold mt-1 text-green-700">{formatKES(totalPayments)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Project Budgets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project Budget Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project: any) => {
                  const pct = budgetPercentage(project.totalSpent, project.totalAllocated);
                  const healthColor = budgetHealthColor(pct);
                  const isEditing = editingProjectId === project.id;
                  const totalAllocated = editData && isEditing
                    ? BUDGET_CATEGORIES.reduce((s, c) => s + (parseFloat(editData.budgets[c.key]) || 0), 0)
                    : project.totalAllocated;

                  return (
                    <div key={project.id} className={`rounded-lg border p-4 ${isEditing ? "border-primary-300 bg-primary-50/20" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-mono text-xs text-gray-400">{project.code}</span>
                          <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold">{formatKES(project.totalBudget)}</p>
                            <p className="text-xs text-gray-500">Total Budget</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(project.id)}
                            className="h-7 w-7 p-0"
                          >
                            {isEditing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>

                      {/* Budget bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Spent: {formatKES(project.totalSpent)}</span>
                          <span className={cn("font-medium", healthColor)}>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-green-500")}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Edit form */}
                      {isEditing && (
                        <div className="mt-4 border-t pt-4 space-y-4">
                          {editLoading ? (
                            <Skeleton className="h-32 w-full" />
                          ) : (
                            <>
                              {saveError && <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{saveError}</div>}

                              {/* Contract & dates */}
                              <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                  <Label>Contract Value (KES)</Label>
                                  <Input
                                    type="number"
                                    value={editData?.contractValue ?? ""}
                                    onChange={(e) => setEditData({ ...editData, contractValue: e.target.value })}
                                    placeholder="Total contract value"
                                  />
                                </div>
                                <div>
                                  <Label>Start Date</Label>
                                  <Input
                                    type="date"
                                    value={editData?.startDate ?? ""}
                                    onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Expected Completion</Label>
                                  <Input
                                    type="date"
                                    value={editData?.expectedEndDate ?? ""}
                                    onChange={(e) => setEditData({ ...editData, expectedEndDate: e.target.value })}
                                  />
                                </div>
                              </div>

                              {/* Budget categories */}
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Budget Allocation by Category (KES)</p>
                                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                                  {BUDGET_CATEGORIES.map((cat) => (
                                    <div key={cat.key}>
                                      <Label className="text-xs">{cat.label}</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={editData?.budgets?.[cat.key] ?? ""}
                                        onChange={(e) => setEditData({ ...editData, budgets: { ...editData.budgets, [cat.key]: e.target.value } })}
                                        placeholder="0"
                                      />
                                    </div>
                                  ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Total allocated: {formatKES(totalAllocated)}
                                  {editData?.contractValue && Number(editData.contractValue) > 0 && Math.abs(totalAllocated - Number(editData.contractValue)) > 1000 && (
                                    <span className="text-amber-600 ml-2">⚠ Differs from contract value by {formatKES(Math.abs(totalAllocated - Number(editData.contractValue)))}</span>
                                  )}
                                </p>
                              </div>

                              {/* Save buttons */}
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => setEditingProjectId(null)}>Cancel</Button>
                                <Button size="sm" onClick={() => handleSave(project.id)} disabled={saving}>
                                  <Check className="mr-1 h-3.5 w-3.5" />
                                  {saving ? "Saving…" : "Save Financials"}
                                </Button>
                              </div>

                              {/* Client payments */}
                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-sm font-medium text-gray-700">Client Payments</p>
                                  <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(!showPaymentForm)}>
                                    <Plus className="mr-1 h-3.5 w-3.5" />Add Payment
                                  </Button>
                                </div>

                                {showPaymentForm && (
                                  <div className="rounded-lg border bg-gray-50 p-3 mb-3">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                      <div>
                                        <Label>Amount (KES) *</Label>
                                        <Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                                      </div>
                                      <div>
                                        <Label>Payment Date *</Label>
                                        <Input type="date" value={paymentForm.paymentDate} onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })} />
                                      </div>
                                      <div>
                                        <Label>Payment Method</Label>
                                        <Select value={paymentForm.paymentMethod} onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}>
                                          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                                        </Select>
                                      </div>
                                      <div>
                                        <Label>Reference Number</Label>
                                        <Input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} placeholder="TXN-12345" />
                                      </div>
                                      <div className="sm:col-span-2">
                                        <Label>Notes</Label>
                                        <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="h-12" />
                                      </div>
                                    </div>
                                    <div className="mt-2 flex gap-2 justify-end">
                                      <Button variant="outline" size="sm" onClick={() => setShowPaymentForm(false)}>Cancel</Button>
                                      <Button size="sm" onClick={() => handleAddPayment(project.id)} disabled={saving}>Record Payment</Button>
                                    </div>
                                  </div>
                                )}

                                {editData?.payments?.length > 0 ? (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b bg-gray-50 text-left">
                                        <th className="px-2 py-1.5 font-medium">Date</th>
                                        <th className="px-2 py-1.5 font-medium">Method</th>
                                        <th className="px-2 py-1.5 font-medium text-right">Amount</th>
                                        <th className="px-2 py-1.5 font-medium">Reference</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {editData.payments.map((p: any) => (
                                        <tr key={p.id} className="border-b">
                                          <td className="px-2 py-1.5">{new Date(p.paymentDate).toLocaleDateString("en-GB")}</td>
                                          <td className="px-2 py-1.5 text-gray-500">{p.paymentMethod ?? "—"}</td>
                                          <td className="px-2 py-1.5 text-right font-medium text-green-700">{formatKES(Number(p.amount))}</td>
                                          <td className="px-2 py-1.5 text-gray-500">{p.reference ?? p.referenceNumber ?? "—"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <p className="text-sm text-gray-400 text-center py-4">No payments recorded yet</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Budget categories (read view) */}
                      {!isEditing && project.budgets?.length > 0 && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          {project.budgets.map((b: any) => {
                            const bPct = b.allocated > 0 ? (b.spent / b.allocated) * 100 : 0;
                            return (
                              <div key={b.category} className="flex justify-between">
                                <span className="text-gray-500 capitalize">{b.category}</span>
                                <span className={cn("font-medium", bPct >= 100 ? "text-red-600" : bPct >= 80 ? "text-amber-600" : "text-gray-700")}>
                                  {formatKES(Number(b.spent))} / {formatKES(Number(b.allocated))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {project.totalPayments > 0 && (
                        <div className="mt-2 text-xs text-green-600">
                          Client payments: {formatKES(project.totalPayments)}
                          {project.contractValue > 0 && (
                            <span className="text-gray-400 ml-2">
                              ({Math.round((project.totalPayments / project.contractValue) * 100)}% of contract)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

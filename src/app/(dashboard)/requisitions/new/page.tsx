"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

interface ItemRow {
  id: string;
  itemName: string;
  description: string;
  unit: string;
  qtyRequested: string;
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

const UNITS = ["pcs", "bags", "kg", "tonnes", "metres", "sq.m", "cu.m", "litres", "rolls", "sheets", "trips", "boxes"];

function createEmptyItem(): ItemRow {
  return {
    id: crypto.randomUUID(),
    itemName: "",
    description: "",
    unit: "pcs",
    qtyRequested: "",
  };
}

export default function NewRequisitionPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [projectId, setProjectId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [notes, setNotes] = useState("");
  const [clientSpecs, setClientSpecs] = useState("");
  const [items, setItems] = useState<ItemRow[]>([createEmptyItem()]);

  // Load projects
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Load sites when project changes
  useEffect(() => {
    if (!projectId) {
      setSites([]);
      return;
    }
    fetch(`/api/sites?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setSites(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [projectId]);

  const addItem = () => setItems([...items, createEmptyItem()]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemRow, value: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
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

    setLoading(true);
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
            description: item.description || undefined,
            unit: item.unit,
            qtyRequested: Number(item.qtyRequested),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create requisition");
      }

      const requisition = await res.json();

      // If not draft, immediately submit
      if (!asDraft) {
        await fetch(`/api/requisitions/${requisition.id}/transition`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetStatus: "SUBMITTED" }),
        });
      }

      router.push(`/requisitions/${requisition.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create requisition");
    } finally {
      setLoading(false);
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
          <CardTitle className="text-lg">Project & Site</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Project</Label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setSiteId(""); }}>
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Site</Label>
            <Select value={siteId} onChange={(e) => setSiteId(e.target.value)} disabled={!projectId}>
              <option value="">Select site...</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
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
                  <Input
                    value={item.itemName}
                    onChange={(e) => updateItem(item.id, "itemName", e.target.value)}
                    placeholder="e.g. Cement, Steel bars..."
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)}>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
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
                <div className="sm:col-span-2 lg:col-span-4">
                  <Label>Description (optional)</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="Specs, brand, size..."
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
              placeholder="Any additional notes for the PM..."
            />
          </div>
          <div>
            <Label>Client Specifications</Label>
            <Textarea
              value={clientSpecs}
              onChange={(e) => setClientSpecs(e.target.value)}
              placeholder="Specific requirements from the client..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Link href="/requisitions">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button variant="outline" onClick={() => handleSubmit(true)} disabled={loading}>
          Save as Draft
        </Button>
        <Button onClick={() => handleSubmit(false)} disabled={loading}>
          {loading ? "Submitting..." : "Submit Requisition"}
        </Button>
      </div>
    </div>
  );
}

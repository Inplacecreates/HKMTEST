"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get("name"),
      code: formData.get("code"),
      clientName: formData.get("clientName"),
      clientPhone: formData.get("clientPhone") || undefined,
      clientEmail: formData.get("clientEmail") || undefined,
      address: formData.get("address") || undefined,
      description: formData.get("description") || undefined,
      totalBudget: formData.get("totalBudget") || undefined,
      startDate: formData.get("startDate") || undefined,
      targetEndDate: formData.get("targetEndDate") || undefined,
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create project");
        return;
      }

      const project = await res.json();
      router.push(`/projects/${project.id}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Project</h1>
          <p className="text-muted-foreground">Create a new construction project</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Details</CardTitle>
            <CardDescription>Basic information about the construction project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input id="name" name="name" placeholder="e.g. Karen Residence" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Project Code *</Label>
                <Input id="code" name="code" placeholder="e.g. KRN" maxLength={10} required />
                <p className="text-xs text-muted-foreground">Short code used in requisition numbers</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input id="clientName" name="clientName" placeholder="e.g. John Kamau" required />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Client Phone</Label>
                <Input id="clientPhone" name="clientPhone" placeholder="+254 7XX XXX XXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input id="clientEmail" name="clientEmail" type="email" placeholder="client@email.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Project Address</Label>
              <Input id="address" name="address" placeholder="e.g. Karen, Nairobi" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Brief description of the project"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="totalBudget">Total Budget (KES)</Label>
                <Input id="totalBudget" name="totalBudget" type="number" placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetEndDate">Target End Date</Label>
                <Input id="targetEndDate" name="targetEndDate" type="date" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 mt-6">
          <Link href="/projects">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}

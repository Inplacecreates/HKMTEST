"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ROLE_LABELS } from "@/lib/utils/constants";
import type { UserRole } from "@/generated/prisma";
import {
  Users, Plus, Search, Pencil, X, Check,
  Mail, Phone, Shield
} from "lucide-react";

interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  CEO: "bg-purple-100 text-purple-700",
  PROJECT_MANAGER: "bg-blue-100 text-blue-700",
  SITE_MANAGER: "bg-green-100 text-green-700",
  QS: "bg-indigo-100 text-indigo-700",
  ARCHITECT: "bg-teal-100 text-teal-700",
  DRIVER: "bg-amber-100 text-amber-700",
  CO_DRIVER: "bg-orange-100 text-orange-700",
  SUBCONTRACTOR: "bg-gray-100 text-gray-700",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  CEO: "Full access to everything — all modules, financials, team management, and settings.",
  PROJECT_MANAGER: "Projects (full), Requisitions (full), Logistics (view+assign), Finance (view), Reports (view), Team (view).",
  QS: "Requisitions & pricing (full), Purchase Orders (full), Suppliers (full), Finance (full), Reports (full), Catalog (manage).",
  ARCHITECT: "Projects (view+docs), Requisitions (create+view), Reports (view).",
  SITE_MANAGER: "Requisitions (create), Inventory (their site), Delivery verification (their site). No financials.",
  DRIVER: "Purchase Orders (view assigned), Logistics (update delivery status).",
  CO_DRIVER: "Same access as Driver.",
  SUBCONTRACTOR: "Requisitions (create for their scope), view their assigned items only.",
};

const EMPTY_FORM = { fullName: "", email: "", role: "SITE_MANAGER" as UserRole, phone: "" };

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setMembers(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const filtered = members.filter((m) => {
    const matchSearch = !search ||
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(member: TeamMember) {
    setEditingId(member.id);
    setForm({ fullName: member.fullName, email: member.email, role: member.role, phone: member.phone ?? "" });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.fullName.trim() || !form.email.trim() || !form.role) {
      setFormError("Full name, email, and role are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = editingId
        ? await fetch(`/api/users/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName: form.fullName, role: form.role, phone: form.phone || null }),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });

      if (!res.ok) {
        const d = await res.json();
        setFormError(d.error ?? "Failed to save");
        return;
      }
      setShowForm(false);
      loadMembers();
    } catch { setFormError("Network error"); } finally { setSaving(false); }
  }

  async function handleToggleActive(member: TeamMember) {
    await fetch(`/api/users/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !member.isActive }),
    });
    loadMembers();
  }

  const activeCount = members.filter((m) => m.isActive).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-sm text-gray-500">Manage team members and their access roles</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-3">
            <div className="text-sm text-gray-500 flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Total Members</div>
            <p className="text-2xl font-bold">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <div className="text-sm text-green-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Active</div>
            <p className="text-2xl font-bold text-green-700">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3">
            <div className="text-sm text-gray-500 flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Roles in Use</div>
            <p className="text-2xl font-bold">{new Set(members.map((m) => m.role)).size}</p>
          </CardContent>
        </Card>
      </div>

      {/* Invite / Edit Form */}
      {showForm && (
        <Card className="border-primary-200 bg-primary-50/30">
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Edit Team Member" : "Invite New Team Member"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{formError}</div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Jane Wanjiku"
                />
              </div>
              <div>
                <Label>Email Address *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="jane@hkm.co.ke"
                  disabled={!!editingId}
                />
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+254700000000"
                />
              </div>
              <div>
                <Label>Role *</Label>
                <Select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  {Object.entries(ROLE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Role description */}
            {form.role && ROLE_DESCRIPTIONS[form.role] && (
              <div className="mt-3 rounded-md bg-blue-50 border border-blue-100 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-1">
                  <Shield className="h-3.5 w-3.5" />
                  {ROLE_LABELS[form.role as UserRole]} — Access Description
                </div>
                <p className="text-xs text-blue-700">{ROLE_DESCRIPTIONS[form.role]}</p>
              </div>
            )}

            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                <X className="mr-1 h-4 w-4" />Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Check className="mr-1 h-4 w-4" />
                {saving ? "Saving…" : editingId ? "Save Changes" : "Send Invite"}
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-8"
          />
        </div>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-52"
        >
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </Select>
      </div>

      {/* Members list */}
      <Card>
        <CardContent className="divide-y p-0">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Users} title="No team members found" description="Adjust your search or invite a new member." />
            </div>
          ) : (
            filtered.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between py-3 px-4 ${!member.isActive ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm shrink-0">
                    {member.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{member.fullName}</p>
                      {!member.isActive && (
                        <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      {member.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />{member.email}
                        </span>
                      )}
                      {member.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />{member.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[member.role] ?? "bg-gray-100 text-gray-700"}`}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(member)} className="h-7 w-7 p-0">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(member)}
                    className="h-7 px-2 text-xs text-gray-500"
                  >
                    {member.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
import { getPermissions } from "@/lib/auth/permissions";
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
  approvalLimit: number | string | null;
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

const PERMISSION_LABELS: Record<string, string> = {
  "projects:read": "View Projects",
  "projects:create": "Create Projects",
  "projects:update": "Edit Projects",
  "projects:delete": "Delete Projects",
  "sites:read": "View Sites",
  "sites:create": "Create Sites",
  "sites:update": "Edit Sites",
  "requisitions:read": "View Requisitions",
  "requisitions:create": "Create Requisitions",
  "requisitions:price": "Price Requisitions",
  "requisitions:approve": "Approve Requisitions",
  "requisitions:cancel": "Cancel Requisitions",
  "purchase_orders:read": "View Purchase Orders",
  "purchase_orders:create": "Create Purchase Orders",
  "purchase_orders:assign_driver": "Assign Drivers to PO",
  "purchase_orders:mark_collected": "Mark PO Collected",
  "deliveries:verify": "Verify Deliveries",
  "deliveries:report_discrepancy": "Report Discrepancies",
  "deliveries:resolve_discrepancy": "Resolve Discrepancies",
  "documents:read": "View Documents",
  "documents:upload": "Upload Documents",
  "budgets:read": "View Budgets",
  "budgets:manage": "Manage Budgets",
  "budgets:allocate_wallet": "Allocate Wallet",
  "payments:read": "View Payments",
  "payments:record": "Record Payments",
  "suppliers:read": "View Suppliers",
  "suppliers:manage": "Manage Suppliers",
  "inventory:read": "View Inventory",
  "inventory:manage": "Manage Inventory",
  "snag_items:read": "View Snag Items",
  "snag_items:create": "Create Snag Items",
  "snag_items:manage": "Manage Snag Items",
  "users:read": "View Team Members",
  "users:manage": "Manage Team Members",
  "settings:manage": "Manage Settings",
  "reports:read": "View Reports",
  "analytics:read": "View Analytics",
};

const EMPTY_FORM = {
  fullName: "",
  email: "",
  role: "SITE_MANAGER" as UserRole,
  phone: "",
  approvalLimit: "30000",
};

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
  const [permissionsMemberId, setPermissionsMemberId] = useState<string | null>(null);

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
    setPermissionsMemberId(null);
  }

  function openEdit(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      fullName: member.fullName,
      email: member.email,
      role: member.role,
      phone: member.phone ?? "",
      approvalLimit: member.approvalLimit != null ? String(Number(member.approvalLimit)) : "30000",
    });
    setFormError("");
    setShowForm(true);
    setPermissionsMemberId(null);
  }

  async function handleSave() {
    if (!form.fullName.trim() || !form.email.trim() || !form.role) {
      setFormError("Full name, email, and role are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        role: form.role,
        phone: form.phone || null,
      };
      if (form.role === "PROJECT_MANAGER" || form.role === "CEO") {
        payload.approvalLimit = parseFloat(form.approvalLimit) || 30000;
      }

      const res = editingId
        ? await fetch(`/api/users/${editingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, approvalLimit: undefined }),
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

  const permissionsMember = permissionsMemberId
    ? members.find((m) => m.id === permissionsMemberId)
    : null;
  const memberPermissions = permissionsMember
    ? new Set(getPermissions(permissionsMember.role))
    : null;

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

              {/* Approval Limit — show for PM and CEO */}
              {(form.role === "PROJECT_MANAGER" || form.role === "CEO") && (
                <div>
                  <Label>Approval Limit (KES)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={form.approvalLimit}
                    onChange={(e) => setForm({ ...form, approvalLimit: e.target.value })}
                    placeholder="30000"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Requisitions above this value require CEO approval.
                  </p>
                </div>
              )}
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

      {/* Permissions Panel */}
      {permissionsMember && memberPermissions && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-600" />
                Permissions — {permissionsMember.fullName} ({ROLE_LABELS[permissionsMember.role]})
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPermissionsMemberId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Permissions are role-based. The checkmarks below show what this role can access.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(PERMISSION_LABELS).map(([perm, label]) => {
                const granted = memberPermissions.has(perm as never);
                return (
                  <div
                    key={perm}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                      granted ? "bg-green-50 text-green-800" : "bg-gray-50 text-gray-400"
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] ${
                      granted ? "bg-green-500 border-green-500 text-white" : "border-gray-300"
                    }`}>
                      {granted ? "✓" : ""}
                    </span>
                    {label}
                  </div>
                );
              })}
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
                      {(member.role === "PROJECT_MANAGER" || member.role === "CEO") && member.approvalLimit != null && (
                        <span className="text-xs text-gray-400">
                          Limit: KES {Number(member.approvalLimit).toLocaleString()}
                        </span>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPermissionsMemberId(permissionsMemberId === member.id ? null : member.id)}
                    className="h-7 w-7 p-0"
                    title="View permissions"
                  >
                    <Shield className="h-3.5 w-3.5" />
                  </Button>
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

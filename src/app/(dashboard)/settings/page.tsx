"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/utils/constants";
import type { UserRole } from "@/generated/prisma";
import {
  Users,
  Building2,
  Shield,
  Phone,
  Mail,
  Bell,
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type SettingsTab = "company" | "notifications" | "defaults" | "team";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "ok" | "error">("idle");

  // Form state mirrors settings
  const [form, setForm] = useState<any>({});

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setForm(data);
      }
    } catch {
      // handle silently
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch {
      // handle silently
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadUsers();
  }, [loadSettings, loadUsers]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setForm(updated);
        setSaveStatus("ok");
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  };

  const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: "company", label: "Company Profile", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "defaults", label: "System Defaults", icon: Settings },
    { id: "team", label: "Team Overview", icon: Users },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-gray-500">
            Manage your organization profile and preferences
          </p>
        </div>
        {activeTab !== "team" && (
          <div className="flex items-center gap-2">
            {saveStatus === "ok" && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Failed to save
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {settingsLoading && activeTab !== "team" ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* COMPANY PROFILE */}
          {activeTab === "company" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={form.companyName || ""}
                        onChange={(e) => set("companyName", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="HKM Construction Ltd"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trading Name
                      </label>
                      <input
                        type="text"
                        value={form.tradingName || ""}
                        onChange={(e) => set("tradingName", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="HKM"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        KRA PIN
                      </label>
                      <input
                        type="text"
                        value={form.kraPin || ""}
                        onChange={(e) =>
                          set("kraPin", e.target.value.toUpperCase())
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="A123456789B"
                        maxLength={11}
                      />
                      <p className="text-xs text-gray-400 mt-0.5">
                        Format: Letter + 9 digits + Letter
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        VAT Number
                      </label>
                      <input
                        type="text"
                        value={form.vatNumber || ""}
                        onChange={(e) => set("vatNumber", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="VAT/XXXXXXXX"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={form.phone || ""}
                        onChange={(e) => set("phone", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+254 700 000 000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.email || ""}
                        onChange={(e) => set("email", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="info@company.co.ke"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <input
                        type="url"
                        value={form.website || ""}
                        onChange={(e) => set("website", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://www.company.co.ke"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        value={form.whatsappNumber || ""}
                        onChange={(e) => set("whatsappNumber", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="+254 700 000 000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Physical Address
                    </label>
                    <textarea
                      value={form.address || ""}
                      onChange={(e) => set("address", e.target.value)}
                      rows={3}
                      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Street, Town, County"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Postal Address
                    </label>
                    <input
                      type="text"
                      value={form.postalAddress || ""}
                      onChange={(e) => set("postalAddress", e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="P.O. Box 00000-00000 Nairobi"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Email Notifications
                  </h3>
                  <ToggleSetting
                    label="Requisition Status Changes"
                    description="Receive emails when a requisition moves to a new status"
                    checked={form.emailOnReqStatus ?? true}
                    onChange={(v) => set("emailOnReqStatus", v)}
                  />
                  <ToggleSetting
                    label="Budget Alerts"
                    description="Notify when a project budget utilization exceeds 80%"
                    checked={form.emailOnBudgetAlert ?? true}
                    onChange={(v) => set("emailOnBudgetAlert", v)}
                  />
                  <ToggleSetting
                    label="Delivery Notifications"
                    description="Notify site managers when a delivery is dispatched"
                    checked={form.emailOnDelivery ?? true}
                    onChange={(v) => set("emailOnDelivery", v)}
                  />
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    In-App Notifications
                  </h3>
                  <ToggleSetting
                    label="In-App Notifications"
                    description="Show notification badges and alerts within the platform"
                    checked={form.inAppNotifications ?? true}
                    onChange={(v) => set("inAppNotifications", v)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* SYSTEM DEFAULTS */}
          {activeTab === "defaults" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Financial Defaults</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Currency
                      </label>
                      <select
                        value={form.defaultCurrency || "KES"}
                        onChange={(e) => set("defaultCurrency", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="KES">KES — Kenyan Shilling</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="GBP">GBP — British Pound</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Payment Terms
                      </label>
                      <select
                        value={form.defaultPaymentTerms || "Net 30"}
                        onChange={(e) =>
                          set("defaultPaymentTerms", e.target.value)
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Immediate">Immediate</option>
                        <option value="Net 7">Net 7 days</option>
                        <option value="Net 14">Net 14 days</option>
                        <option value="Net 30">Net 30 days</option>
                        <option value="Net 45">Net 45 days</option>
                        <option value="Net 60">Net 60 days</option>
                        <option value="COD">Cash on Delivery</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fiscal Year Start Month
                      </label>
                      <select
                        value={form.fiscalYearStartMonth ?? 1}
                        onChange={(e) =>
                          set("fiscalYearStartMonth", Number(e.target.value))
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {MONTH_NAMES.map((m, i) => (
                          <option key={i + 1} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Display Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Format
                      </label>
                      <select
                        value={form.dateFormat || "DD/MM/YYYY"}
                        onChange={(e) => set("dateFormat", e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY (29/03/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (03/29/2026)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2026-03-29)</option>
                        <option value="D MMM YYYY">D MMM YYYY (29 Mar 2026)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TEAM OVERVIEW */}
          {activeTab === "team" && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Users className="h-4 w-4" />
                      Team Members
                    </div>
                    <p className="text-2xl font-bold mt-1">{users.length}</p>
                    <p className="text-xs text-gray-400">
                      {users.filter((u) => u.isActive).length} active
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Shield className="h-4 w-4" />
                      Roles in Use
                    </div>
                    <p className="text-2xl font-bold mt-1">
                      {new Set(users.map((u) => u.role)).size}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                      <Building2 className="h-4 w-4" />
                      Organization
                    </div>
                    <p className="text-lg font-bold mt-1">
                      {settings?.companyName || "HKM Construction"}
                    </p>
                    <p className="text-xs text-gray-400">Kenya</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Team Members
                  </CardTitle>
                  <a href="/settings/team">
                    <Button variant="outline" size="sm">
                      Manage Team
                    </Button>
                  </a>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {users.map((user: any) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                              {user.fullName
                                ?.split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.fullName}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                {user.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                  </span>
                                )}
                                {user.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {user.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                ROLE_COLORS[user.role] || "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {ROLE_LABELS[user.role as UserRole] || user.role}
                            </span>
                            {!user.isActive && (
                              <Badge
                                variant="outline"
                                className="text-xs text-gray-400"
                              >
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

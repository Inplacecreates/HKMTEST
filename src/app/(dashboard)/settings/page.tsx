"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/utils/constants";
import type { UserRole } from "@/generated/prisma";
import { Users, Building2, Shield, Phone, Mail } from "lucide-react";

export default function SettingsPage() {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } catch {
      // handle silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500">Manage your organization and team</p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4 text-primary-600" />
              Team Members
            </div>
            <p className="text-2xl font-bold mt-1">{users.length}</p>
            <p className="text-xs text-gray-400">{users.filter((u) => u.isActive).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary-600" />
              Roles in Use
            </div>
            <p className="text-2xl font-bold mt-1">
              {new Set(users.map((u) => u.role)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 className="h-4 w-4 text-primary-600" />
              Organization
            </div>
            <p className="text-lg font-bold mt-1">HKM Construction</p>
            <p className="text-xs text-gray-400">Kenya</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                      {user.fullName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.fullName}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />{user.email}
                          </span>
                        )}
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role] || "bg-gray-100 text-gray-700"}`}>
                      {ROLE_LABELS[user.role as UserRole] || user.role}
                    </span>
                    {!user.isActive && (
                      <Badge variant="outline" className="text-xs text-gray-400">Inactive</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

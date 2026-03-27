"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Users, Building2 } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings/team">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Team Management</CardTitle>
              </div>
              <CardDescription>Invite users, manage roles and permissions</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/settings/company">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Company Settings</CardTitle>
              </div>
              <CardDescription>Logo, colors, and white-label configuration</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

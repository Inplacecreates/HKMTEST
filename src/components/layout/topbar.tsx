"use client";

import React from "react";
import { Menu, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/utils/constants";
import type { UserRole } from "@/generated/prisma";

interface TopbarProps {
  fullName: string;
  role: UserRole;
  notificationCount?: number;
  onMenuToggle: () => void;
  onLogout: () => void;
}

export function Topbar({ fullName, role, notificationCount = 0, onMenuToggle, onLogout }: TopbarProps) {
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
      {/* Left: hamburger + page context */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Button>

        {/* User info */}
        <div className="hidden sm:flex flex-col items-end mr-2">
          <span className="text-sm font-medium">{fullName}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {ROLE_LABELS[role]}
          </Badge>
        </div>

        {/* Avatar */}
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Logout */}
        <Button variant="ghost" size="icon" onClick={onLogout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

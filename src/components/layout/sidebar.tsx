"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  ShoppingCart,
  Truck,
  DollarSign,
  Users,
  Package,
  BarChart3,
  Settings,
  Building2,
  X,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma";
import { hasAnyPermission } from "@/lib/auth/permissions";
import type { PermissionAction } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  requiredPermissions?: PermissionAction[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban, requiredPermissions: ["projects:read"] },
  { label: "Requisitions", href: "/requisitions", icon: ClipboardList, requiredPermissions: ["requisitions:read"] },
  { label: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, requiredPermissions: ["purchase_orders:read"] },
  { label: "Suppliers", href: "/suppliers", icon: Building2, requiredPermissions: ["suppliers:read"] },
  { label: "Logistics", href: "/logistics", icon: Truck, requiredPermissions: ["purchase_orders:mark_collected"] },
  { label: "Finance", href: "/finance", icon: DollarSign, requiredPermissions: ["budgets:read"] },
  { label: "Inventory", href: "/inventory", icon: Package, requiredPermissions: ["inventory:read"] },
  { label: "Reports", href: "/reports", icon: BarChart3, requiredPermissions: ["reports:read"] },
  { label: "Team", href: "/settings/team", icon: Users, requiredPermissions: ["users:read"] },
  { label: "Settings", href: "/settings", icon: Settings, requiredPermissions: ["settings:manage"] },
];

interface SidebarProps {
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = NAV_ITEMS.filter((item) => {
    if (!item.requiredPermissions) return true;
    return hasAnyPermission(role, item.requiredPermissions);
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-border transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-white font-bold text-sm">
              H
            </div>
            <span className="font-bold text-lg text-foreground">HKM Build</span>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <p className="text-xs text-muted-foreground">HKM Construction v1.0</p>
        </div>
      </aside>
    </>
  );
}

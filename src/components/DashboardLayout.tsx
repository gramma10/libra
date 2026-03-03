import { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  CalendarDays,
  Users,
  Package,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Scissors as ScissorsIcon,
  Sparkles,
  UserCog,
  Receipt,
} from "lucide-react";
import { SidebarNavItem } from "@/components/SidebarNavItem";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", icon: CalendarDays, label: "Calendar" },
  { to: "/clients", icon: Users, label: "Clients" },
  { to: "/services", icon: Sparkles, label: "Services" },
  { to: "/staff", icon: UserCog, label: "Employees" },
  { to: "/inventory", icon: Package, label: "Inventory" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "glass-strong fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 transition-all duration-300",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <ScissorsIcon className="h-4 w-4 text-primary-foreground" strokeWidth={1.5} />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight text-foreground">
              Studio
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border/50 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.5} />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 transition-all duration-300",
          collapsed ? "ml-[68px]" : "ml-[240px]"
        )}
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

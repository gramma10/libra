import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useShop } from "@/hooks/useShop";
import {
  CalendarDays, Users, Package, BarChart3, Settings,
  PanelLeftClose, PanelLeft, Scissors as ScissorsIcon,
  Sparkles, UserCog, Receipt, User, LogOut,
} from "lucide-react";
import { SidebarNavItem } from "@/components/SidebarNavItem";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";

export default function DashboardLayout() {
  const { signOut } = useAuth();
  const { shopName } = useShop();
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin, isManager, isStaff, loading: roleLoading } = useRole();

  // Build nav items based on role
  const navItems = [];
  navItems.push({ to: "/", icon: CalendarDays, label: "Calendar" });
  if (isAdmin || isManager) navItems.push({ to: "/clients", icon: Users, label: "Clients" });
  if (isAdmin) navItems.push({ to: "/services", icon: Sparkles, label: "Services" });
  if (isAdmin) navItems.push({ to: "/staff", icon: UserCog, label: "Employees" });
  if (isAdmin || isManager) navItems.push({ to: "/inventory", icon: Package, label: "Inventory" });
  if (isAdmin) navItems.push({ to: "/expenses", icon: Receipt, label: "Expenses" });
  if (isAdmin) navItems.push({ to: "/reports", icon: BarChart3, label: "Reports" });
  if (isStaff) navItems.push({ to: "/my-stats", icon: User, label: "My Stats" });
  if (isAdmin) navItems.push({ to: "/settings", icon: Settings, label: "Settings" });

  return (
    <div className="flex min-h-screen w-full">
      <aside className={cn(
        "glass-strong fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border/50 transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}>
        <div className="flex h-16 items-center gap-2.5 border-b border-border/50 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <ScissorsIcon className="h-4 w-4 text-primary-foreground" strokeWidth={1.5} />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight text-foreground truncate">
              {shopName || "Studio"}
            </span>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="border-t border-border/50 p-3 space-y-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {collapsed ? <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.5} />}
          </button>
          <button
            onClick={signOut}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl p-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className={cn("flex-1 transition-all duration-300", collapsed ? "ml-[68px]" : "ml-[240px]")}>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

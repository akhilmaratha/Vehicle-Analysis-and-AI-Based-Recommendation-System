"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Car, LayoutDashboard, LogOut, Menu, Plus } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { adminLogout, getCurrentAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
];

function isActive(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

function SidebarContent({ pathname, admin, onNavigate, onLogout }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-border px-5">
        <BrandMark href="/admin" onClick={onNavigate} />
        <span className="ml-2 rounded bg-sage px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="Admin">
        <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">Manage</p>
        {adminLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sage text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/admin/vehicles/new"
          onClick={onNavigate}
          aria-current={pathname === "/admin/vehicles/new" ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/admin/vehicles/new"
              ? "bg-sage text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add vehicle
        </Link>

        <p className="px-3 pt-6 pb-2 text-xs font-medium text-muted-foreground">Site</p>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
          View public site
        </Link>
      </nav>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex items-center gap-3 px-1">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-primary-foreground uppercase"
            aria-hidden="true"
          >
            {(admin?.email || "A").charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-medium">{admin?.email}</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={onLogout}>
          <LogOut data-icon="inline-start" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </div>
  );
}

export function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(undefined);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (pathname === "/admin/login") {
      return;
    }

    let ignore = false;
    getCurrentAdmin()
      .then((data) => {
        if (!ignore) setAdmin(data);
      })
      .catch(() => {
        if (!ignore) router.replace("/admin/login");
      });

    return () => {
      ignore = true;
    };
  }, [pathname, router]);

  async function handleLogout() {
    await adminLogout().catch(() => null);
    router.replace("/admin/login");
  }

  if (pathname === "/admin/login") {
    return children;
  }

  if (admin === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label="Checking admin session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-border bg-card lg:block">
        <SidebarContent pathname={pathname} admin={admin} onLogout={handleLogout} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 supports-backdrop-filter:backdrop-blur-md sm:px-6 lg:hidden">
          <div className="flex items-center gap-2">
            <BrandMark href="/admin" />
            <span className="rounded bg-sage px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary">
              Admin
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin menu"
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[85%] max-w-xs gap-0 bg-card p-0" showCloseButton>
            <SheetTitle className="sr-only">Admin navigation</SheetTitle>
            <SheetDescription className="sr-only">Admin sections and account</SheetDescription>
            <SidebarContent
              pathname={pathname}
              admin={admin}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </SheetContent>
        </Sheet>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

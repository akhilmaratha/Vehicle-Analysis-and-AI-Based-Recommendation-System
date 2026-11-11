"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Car, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { adminLogout, getCurrentAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
];

export function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState(undefined);

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
    return <LoadingSpinner label="Checking admin session..." />;
  }

  return (
    <div className="page-container grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="rounded-xl border bg-card p-3">
        <div className="mb-4 px-2">
          <p className="text-sm font-medium">Admin Panel</p>
          <p className="truncate text-xs text-muted-foreground">{admin?.email}</p>
        </div>
        <nav className="space-y-1">
          {adminLinks.map((link) => {
            const Icon = link.icon;
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut data-icon="inline-start" />
          Logout
        </Button>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  );
}

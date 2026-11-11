"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/vehicles", label: "Explore Vehicles" },
  { href: "/compare", label: "Compare" },
  { href: "/recommendations", label: "AI Recommendations" },
  { href: "/admin", label: "Admin" },
];

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname() || "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 supports-backdrop-filter:bg-background/85 supports-backdrop-filter:backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <div className="page-container flex h-16 items-center justify-between gap-6">
        <BrandMark />

        <nav className="hidden h-full items-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full items-center px-3 text-sm font-medium transition-colors",
                  "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary after:transition-opacity",
                  active
                    ? "text-foreground after:opacity-100"
                    : "text-muted-foreground after:opacity-0 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <Button nativeButton={false} render={<Link href="/recommendations" />}>
            Get recommendations
          </Button>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              />
            }
          >
            <Menu className="size-5" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[85%] max-w-sm gap-0 bg-background p-0">
            <SheetHeader className="border-b border-border px-5 py-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">
                Main site navigation
              </SheetDescription>
              <BrandMark onClick={() => setMobileOpen(false)} />
            </SheetHeader>
            <nav className="flex flex-col px-3 py-4" aria-label="Mobile">
              {NAV_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-3.5 font-heading text-lg font-semibold transition-colors",
                      active
                        ? "bg-sage text-primary"
                        : "text-foreground hover:bg-secondary"
                    )}
                  >
                    {link.label}
                    {active ? (
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-border p-5">
              <Button
                size="lg"
                className="w-full"
                nativeButton={false}
                render={<Link href="/recommendations" onClick={() => setMobileOpen(false)} />}
              >
                Get recommendations
                <ArrowRight data-icon="inline-end" aria-hidden="true" />
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

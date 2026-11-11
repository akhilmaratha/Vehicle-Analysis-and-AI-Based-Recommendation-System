"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/** Public navbar/footer wrapper. Admin routes render their own shell. */
export function SiteChrome({ children }) {
  const pathname = usePathname() || "/";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdmin) {
    return <div className="flex w-full flex-1 flex-col">{children}</div>;
  }

  return (
    <>
      <Navbar />
      <main id="main" className="w-full flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

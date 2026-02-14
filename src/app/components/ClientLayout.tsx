"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppSticky from "./WhatsAppSticky";
import { ToastProvider } from "./Toast";
import { DialogProvider } from "./ConfirmDialog";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/login";

  return (
    <DialogProvider>
      <ToastProvider>
        {!isAdmin && !isLogin && <Navbar />}
        {children}
        {!isAdmin && <Footer />}
        {!isAdmin && <WhatsAppSticky />}
      </ToastProvider>
    </DialogProvider>
  );
}

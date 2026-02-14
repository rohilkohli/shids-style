"use client";

import { ReactNode } from "react";
import { AdminErrorBoundary } from "@/app/components/AdminErrorBoundary";

interface Props {
  children: ReactNode;
}

export default function AdminLayout({ children }: Props) {
  return <AdminErrorBoundary>{children}</AdminErrorBoundary>;
}

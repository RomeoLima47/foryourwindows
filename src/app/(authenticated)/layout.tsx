"use client";

import { Sidebar } from "@/components/sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import { CommandPalette } from "@/components/command-palette";
import { OfflineIndicator } from "@/components/offline-indicator";
import { QuickAdd } from "@/components/quick-add";
import { useStoreUser } from "@/hooks/use-store-user";

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  useStoreUser();

  return (
    <div className="flex h-screen">
      <OfflineIndicator />
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 pb-16 lg:pt-0 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <CommandPalette />
      <QuickAdd />
    </div>
  );
}

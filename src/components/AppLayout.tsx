import { Outlet } from "react-router-dom";

import { AppHeader } from "@/components/AppHeader";

export function AppLayout() {
  return (
    <div className="min-h-svh bg-muted/40">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

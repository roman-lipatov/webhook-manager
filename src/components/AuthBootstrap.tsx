import { useEffect, type ReactNode } from "react";

import { fetchMe } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";

/**
 * On app start: GET /v1/me.
 * Cookie session still valid → user in store.
 * 401 (after rotate fail) → unauthenticated.
 * Blocks children until the check finishes so routes don't flash-redirect.
 */
export function AuthBootstrap({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await fetchMe({ bootstrap: true });
      } catch {
        if (!cancelled) {
          useAuthStore.getState().logout();
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "bootstrapping") {
    return null;
  }

  return children;
}



import { LogOut, Webhook } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { logoutUser } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

function getInitials(name: string, email: string): string {
  const fromName = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (fromName.length > 0) {
    return fromName;
  }

  return email.slice(0, 2).toUpperCase();
}

export function AppHeader() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (user === null) {
    return null;
  }

  const displayName = user.name || user.email;
  const initials = getInitials(user.name, user.email);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Webhook className="size-4 text-muted-foreground" />
          <span>Webhook Manager</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
              aria-hidden
            >
              {initials}
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium leading-none">
                {displayName}
              </p>
              {user.name ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoggingOut}
            onClick={() => void handleLogout()}
          >
            <LogOut />
            {isLoggingOut ? "Signing out…" : "Log out"}
          </Button>
        </div>
      </div>
    </header>
  );
}

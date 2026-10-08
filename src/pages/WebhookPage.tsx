import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  PAGE_SIZE_OPTIONS,
  PaginationControls,
  type PageSizeOption,
} from "@/components/PaginationControls";
import { WebhookEditDialog } from "@/components/WebhookEditDialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWebhooks } from "@/hooks/useWebhooks";

const DEFAULT_PAGE_SIZE: PageSizeOption = 2;

function parsePageSize(value: string | null): PageSizeOption {
  const parsed = Number(value);
  return PAGE_SIZE_OPTIONS.includes(parsed as PageSizeOption)
    ? (parsed as PageSizeOption)
    : DEFAULT_PAGE_SIZE;
}

export default function WebhookPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const search = searchParams.get("search") ?? "";
  const limit = parsePageSize(searchParams.get("limit"));
  const [searchInput, setSearchInput] = useState(search);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading, isError, isFetching } = useWebhooks({
    page,
    search,
    limit,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) {
        return;
      }

      const next = new URLSearchParams(searchParams);
      if (nextSearch) {
        next.set("search", nextSearch);
      } else {
        next.delete("search");
      }
      next.set("page", "1");
      setSearchParams(next);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput, search, searchParams, setSearchParams]);

  function handlePageChange(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  function handlePageSizeChange(nextLimit: PageSizeOption) {
    const next = new URLSearchParams(searchParams);
    next.set("limit", String(nextLimit));
    next.set("page", "1");
    setSearchParams(next);
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (isError || !data) {
    return (
      <div className="text-sm text-destructive">Error loading webhooks</div>
    );
  }

  const { current, last } = data.paging.pages;
  const { total } = data.paging.results;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Manage endpoint URLs that receive events.
        </p>
      </div>

      <Input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Search by name or URL…"
        aria-label="Search webhooks"
        className="max-w-sm bg-background"
      />

      {data.data.length === 0 ? (
        <div className="rounded-xl border bg-background px-4 py-12 text-center text-sm text-muted-foreground">
          No webhooks found
        </div>
      ) : (
        <div
          className={`grid gap-4 sm:grid-cols-2 ${isFetching ? "opacity-70" : ""}`}
        >
          {data.data.map((webhook) => (
            <Card key={webhook.id} className="bg-background">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{webhook.name}</CardTitle>
                  <span
                    className={
                      webhook.active
                        ? "rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                        : "rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {webhook.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <CardDescription className="break-all">
                  {webhook.url}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Created {new Date(webhook.created_at).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingId(webhook.id)}
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className={isFetching ? "opacity-70" : undefined}>
        <PaginationControls
          current={current}
          last={last}
          total={total}
          pageSize={limit}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <WebhookEditDialog
        webhookId={editingId}
        open={editingId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
          }
        }}
      />
    </div>
  );
}

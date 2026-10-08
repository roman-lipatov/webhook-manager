import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getWebhookById,
  getWebhooks,
  updateWebhook,
} from "@/api/webhooks";
import type { WebhookListParams, WebhookUpdateRequest } from "@/types/types";

export const webhookKeys = {
  all: ["webhooks"] as const,
  lists: () => [...webhookKeys.all, "list"] as const,
  list: (params: WebhookListParams) =>
    [...webhookKeys.lists(), params] as const,
  details: () => [...webhookKeys.all, "detail"] as const,
  detail: (id: string) => [...webhookKeys.details(), id] as const,
};

export function useWebhooks(params: WebhookListParams) {
  return useQuery({
    queryKey: webhookKeys.list(params),
    queryFn: () => getWebhooks(params),
  });
}

export function useWebhook(id: string | null) {
  return useQuery({
    queryKey: webhookKeys.detail(id ?? ""),
    queryFn: () => getWebhookById(id!),
    enabled: id !== null && id.length > 0,
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: WebhookUpdateRequest;
    }) => updateWebhook(id, data),
    onSuccess: (webhook) => {
      void queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
      queryClient.setQueryData(webhookKeys.detail(webhook.id), webhook);
    },
  });
}

import { api } from "./client";
import type { Webhook, WebhookList, WebhookListParams, WebhookUpdateRequest } from "@/types/types";

export async function getWebhooks(params?: WebhookListParams): Promise<WebhookList> {
  const response = await api.get<WebhookList>("/v1/webhooks", { params });
  return response.data;
}

export async function getWebhookById(id: string): Promise<Webhook> {
  const response = await api.get<Webhook>(`/v1/webhooks/${id}`);
  return response.data;
}

export async function updateWebhook(id: string, data: WebhookUpdateRequest): Promise<Webhook> {
  const response = await api.put<Webhook>(`/v1/webhooks/${id}`, data);
  return response.data;
}
import axios from "axios";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateWebhook, useWebhook } from "@/hooks/useWebhooks";
import type { ApiError } from "@/types/types";

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  url: z.url({ message: "URL must be valid" }),
});

type EditFormValues = z.infer<typeof editSchema>;

type WebhookEditDialogProps = {
  webhookId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WebhookEditDialog({
  webhookId,
  open,
  onOpenChange,
}: WebhookEditDialogProps) {
  const { data: webhook, isLoading, isError } = useWebhook(open ? webhookId : null);
  const updateWebhook = useUpdateWebhook();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      url: "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (webhook) {
      reset({
        name: webhook.name,
        url: webhook.url,
      });
    }
  }, [webhook, reset]);

  async function onSubmit(values: EditFormValues) {
    if (webhookId === null) {
      return;
    }

    try {
      await updateWebhook.mutateAsync({
        id: webhookId,
        data: values,
      });
      onOpenChange(false);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 422) {
        setError("root", { message: "Something went wrong. Try again." });
        return;
      }

      const apiError = error.response.data as ApiError;
      const payload = apiError.error.payload;

      if (payload) {
        for (const [field, messages] of Object.entries(payload)) {
          if (field === "name" || field === "url") {
            setError(field, { message: messages[0] });
          }
        }
      } else {
        setError("root", { message: apiError.error.message });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit webhook</DialogTitle>
          <DialogDescription>
            Update the name and destination URL.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : isError || !webhook ? (
          <p className="text-sm text-destructive">Failed to load webhook</p>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                aria-invalid={Boolean(errors.url)}
                {...register("url")}
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

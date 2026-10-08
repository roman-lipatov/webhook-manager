import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const PAGE_SIZE_OPTIONS = [2, 3, 5, 10] as const;

export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

type PaginationControlsProps = {
  current: number;
  last: number;
  total?: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
};

export function PaginationControls({
  current,
  last,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const safeCurrent = Math.min(Math.max(current, 1), Math.max(last, 1));

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Page {safeCurrent} of {Math.max(last, 1)}
          {typeof total === "number" ? ` · ${total} total` : null}
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) =>
              onPageSizeChange(Number(value) as PageSizeOption)
            }
          >
            <SelectTrigger size="sm" className="w-18 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {last > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safeCurrent <= 1}
            onClick={() => onPageChange(safeCurrent - 1)}
          >
            <ChevronLeft />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safeCurrent >= last}
            onClick={() => onPageChange(safeCurrent + 1)}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

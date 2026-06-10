import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/components/ui';

interface ContactsPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** "1–25 of 132" range label with prev/next controls. */
export function ContactsPagination({ page, pageSize, total, onPageChange }: ContactsPaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-muted">
      <span aria-live="polite">{`${start}–${end} of ${total}`}</span>
      <div className="flex items-center gap-1">
        <IconButton
          label="Previous page"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton
          label="Next page"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

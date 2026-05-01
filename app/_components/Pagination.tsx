"use client";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="cbt-pagination">
      <div className="cbt-pagination__info">
        Showing {from}–{to} of {totalItems}
      </div>
      <div className="cbt-pagination__controls">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹ Prev
        </button>
        {pageNumbers.map((p, idx) =>
          p === "..." ? (
            <span key={`ell-${idx}`} className="cbt-pagination__ellipsis">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline-secondary"}`}
              onClick={() => onPageChange(p as number)}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next ›
        </button>
      </div>
    </div>
  );
}

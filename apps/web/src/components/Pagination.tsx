'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="pagination px-6 pb-4 pt-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="pagination-btn"
        aria-label="Trang trước"
      >
        ← Trước
      </button>
      <span className="pagination-info">
        Trang {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="pagination-btn"
        aria-label="Trang sau"
      >
        Sau →
      </button>
    </div>
  );
}

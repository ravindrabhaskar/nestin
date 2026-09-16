import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = React.memo(({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
      const el = document.getElementById('pg-results-start');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="pt-10 pb-6 flex flex-col items-center justify-center gap-4">
      {/* ITEMS COUNT SUMMARY */}
      <p className="text-xs font-semibold text-slate-500 font-sans">
        Showing <span className="text-slate-900 font-bold">{startItem}–{endItem}</span> of{' '}
        <span className="text-slate-900 font-bold">{totalItems}</span> verified PGs
      </p>

      {/* PAGE CONTROLS */}
      <div className="flex items-center gap-2">
        {/* PREVIOUS BUTTON */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className={`w-9 h-9 rounded-full flex items-center justify-center border text-xs transition-all cursor-pointer ${
            currentPage === 1
              ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
              : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 active:scale-90 shadow-xs'
          }`}
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* PAGE NUMBERS */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`dots-${idx}`} className="px-1 text-slate-400 text-xs select-none">
                ...
              </span>
            );
          }
          const pageNum = p as number;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              type="button"
              onClick={() => handlePageClick(pageNum)}
              className={`w-9 h-9 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-[#a3e635] text-slate-950 shadow-md font-extrabold scale-105'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* NEXT BUTTON */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`w-9 h-9 rounded-full flex items-center justify-center border text-xs transition-all cursor-pointer ${
            currentPage === totalPages
              ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
              : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 active:scale-90 shadow-xs'
          }`}
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const getPages = () => {
    let pages = [];

    if (totalPages <= 5) {
      // For small page counts show all pages
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show 1, 2, ..., last pages
      pages = [1, 2, "...", totalPages - 1, totalPages];
    }

    return pages;
  };

  return (
    <div className="flex items-center gap-2 py-4">

      {/* Previous Button */}
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className={`p-2 rounded-md border text-gray-500 
          ${currentPage === 1 ? "bg-gray-200 cursor-not-allowed" : "hover:bg-gray-100"}`}
      >
        <ChevronLeft size={18} />
      </button>

      {/* Page Numbers */}
      {getPages().map((page, index) => (
        <button
          key={index}
          onClick={() => page !== "..." && onPageChange(page)}
          className={`w-8 h-8 rounded-md border flex items-center justify-center 
            ${page === currentPage
              ? "bg-blue-50 border-blue-400 text-blue-600 font-medium"
              : page === "..."
              ? "cursor-default"
              : "hover:bg-gray-100 text-gray-700"}
          `}
          disabled={page === "..."}
        >
          {page}
        </button>
      ))}

      {/* Next Button */}
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className={`p-2 rounded-md border text-gray-500 
          ${currentPage === totalPages ? "bg-gray-200 cursor-not-allowed" : "hover:bg-gray-100"}`}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default Pagination;
// *********************
// Role of the component: Pagination for navigating the shop page
// Name of the component: Pagination.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <Pagination />
// Input parameters: no input parameters
// Output: Component with the current page and buttons for incrementing and decrementing page
// *********************

"use client";
import { usePaginationStore } from "@/app/_zustand/paginationStore";
import React from "react";

const Pagination = () => {
  // getting from Zustand store current page, total pages, and methods for incrementing/decrementing
  const { page, totalPages, incrementPage, decrementPage } = usePaginationStore();
  return (
    <div className="join flex justify-center py-16">
      <button
        className="join-item btn btn-lg bg-blue-500 text-white hover:bg-white hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => decrementPage()}
        disabled={page <= 1}
      >
        «
      </button>
      <button className="join-item btn btn-lg bg-blue-500 text-white hover:bg-white hover:text-blue-500">
        Page {page}
      </button>
      <button
        className="join-item btn btn-lg bg-blue-500 text-white hover:bg-white hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => incrementPage()}
        disabled={page >= totalPages}
      >
        »
      </button>
    </div>
  );
};

export default Pagination;

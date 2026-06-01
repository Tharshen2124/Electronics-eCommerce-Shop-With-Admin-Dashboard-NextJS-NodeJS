"use client";
import { usePaginationStore } from "@/app/_zustand/paginationStore";
import { useEffect } from "react";

const PaginationSetter = ({ totalPages }: { totalPages: number }) => {
  const setTotalPages = usePaginationStore((state) => state.setTotalPages);

  useEffect(() => {
    setTotalPages(totalPages);
  }, [totalPages, setTotalPages]);

  return null;
};

export default PaginationSetter;

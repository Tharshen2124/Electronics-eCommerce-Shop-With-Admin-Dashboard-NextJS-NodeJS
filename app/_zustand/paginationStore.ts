import { create } from "zustand";

export type State = {
  page: number;
  totalPages: number;
};

export type Actions = {
  incrementPage: () => void;
  decrementPage: () => void;
  setTotalPages: (total: number) => void;
};

export const usePaginationStore = create<State & Actions>((set) => ({
  page: 1,
  totalPages: 1,
  incrementPage: () => {
    set((state) => {
      if (state.page >= state.totalPages) return {};
      return { page: state.page + 1 };
    });
  },
  decrementPage: () => {
    set((state) => {
      if (state.page <= 1) return { page: 1 };
      return { page: state.page - 1 };
    });
  },
  setTotalPages: (total: number) => set({ totalPages: total }),
}));

import { create } from "zustand";

import type { GoalStatusFilter, GoalTermFilter } from "@/lib/utils/goals";

export type GoalPriority = "low" | "medium" | "high" | "urgent";

export interface GoalFilters {
  term: GoalTermFilter;
  priority: GoalPriority | "all";
  areaId: string | undefined;
  status: GoalStatusFilter;
}

export interface FilterState {
  filters: GoalFilters;
  setTerm: (term: GoalTermFilter) => void;
  setPriority: (priority: GoalPriority | "all") => void;
  setAreaId: (areaId: string | undefined) => void;
  setStatus: (status: GoalStatusFilter) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filters: {
    term: "all",
    priority: "all",
    areaId: undefined,
    status: "active",
  },
  setTerm: (term) => set((state) => ({
    filters: { ...state.filters, term },
  })),
  setPriority: (priority) => set((state) => ({
    filters: { ...state.filters, priority },
  })),
  setAreaId: (areaId) => set((state) => ({
    filters: { ...state.filters, areaId },
  })),
  setStatus: (status) => set((state) => ({
    filters: { ...state.filters, status },
  })),
  resetFilters: () => set({
    filters: {
      term: "all",
      priority: "all",
      areaId: undefined,
      status: "active",
    },
  }),
}));

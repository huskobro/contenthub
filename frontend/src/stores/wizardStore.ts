import { create } from "zustand";

type UserMode = "guided" | "advanced";

interface WizardState {
  userMode: UserMode;
  setUserMode: (mode: UserMode) => void;
  toggleUserMode: () => void;
}

export const useWizardStore = create<WizardState>((set) => ({
  userMode: "guided",
  setUserMode: (mode) => set({ userMode: mode }),
  toggleUserMode: () =>
    set((s) => ({ userMode: s.userMode === "guided" ? "advanced" : "guided" })),
}));

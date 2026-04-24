import { create } from 'zustand';

interface SettingsState {
  snipeAmountS: string;
  defaultTpPercent: number;
  defaultSlPercent: number;
  setSnipeAmount: (amount: string) => void;
  setTpPercent: (tp: number) => void;
  setSlPercent: (sl: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  snipeAmountS: "0.001",
  defaultTpPercent: 10,
  defaultSlPercent: 5,
  setSnipeAmount: (amount) => set({ snipeAmountS: amount }),
  setTpPercent: (tp) => set({ defaultTpPercent: tp }),
  setSlPercent: (sl) => set({ defaultSlPercent: sl })
}));

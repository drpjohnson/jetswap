import { create } from 'zustand';

export interface Token {
  address: `0x${string}`;
  symbol: string;
  decimals: number;
}

export interface ActivePosition {
  id: string;
  token: Token;
  amount: bigint;
  entryValueS: bigint;
  currentValueS: bigint;
  tpPercentage: number; 
  slPercentage: number; 
  status: 'active' | 'selling' | 'sold';
}

interface PortfolioState {
  positions: ActivePosition[];
  addPosition: (position: ActivePosition) => void;
  updatePositionValue: (id: string, currentValueS: bigint) => void;
  updateStatus: (id: string, status: ActivePosition['status']) => void;
  removePosition: (id: string) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  positions: [],
  addPosition: (pos) => set((state) => ({
    positions: [pos, ...state.positions]
  })),
  updatePositionValue: (id, currentValueS) => set((state) => ({
    positions: state.positions.map(p => p.id === id ? { ...p, currentValueS } : p)
  })),
  updateStatus: (id, status) => set((state) => ({
    positions: state.positions.map(p => p.id === id ? { ...p, status } : p)
  })),
  removePosition: (id) => set((state) => ({
    positions: state.positions.filter(p => p.id !== id)
  }))
}));

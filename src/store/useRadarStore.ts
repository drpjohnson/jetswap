import { create } from 'zustand';

export interface RadarPair {
  token0: `0x${string}`;
  token1: `0x${string}`;
  pair: `0x${string}`;
  timestamp: number;
  isNew: boolean;
}

interface RadarState {
  pairs: RadarPair[];
  addPair: (pair: Omit<RadarPair, 'isNew' | 'timestamp'>) => void;
  markAsOld: (pairAddress: `0x${string}`) => void;
}

export const useRadarStore = create<RadarState>((set) => ({
  pairs: [],
  addPair: (newPair) => set((state) => {
    // Prevent duplicates
    if (state.pairs.some(p => p.pair === newPair.pair)) return state;
    
    // Add to top, keep only last 50
    return {
      pairs: [
        { ...newPair, timestamp: Date.now(), isNew: true },
        ...state.pairs
      ].slice(0, 50)
    };
  }),
  markAsOld: (pairAddress) => set((state) => ({
    pairs: state.pairs.map(p => p.pair === pairAddress ? { ...p, isNew: false } : p)
  }))
}));

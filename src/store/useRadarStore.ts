import { create } from 'zustand';

export interface RadarPair {
  token0: `0x${string}`;
  token1: `0x${string}`;
  pair: `0x${string}`;
  timestamp: number;
  isNew: boolean;
  honeypotStatus: 'pending' | 'safe' | 'honeypot';
}

interface RadarState {
  pairs: RadarPair[];
  addPair: (pair: Omit<RadarPair, 'isNew' | 'timestamp' | 'honeypotStatus'>) => void;
  markAsOld: (pairAddress: `0x${string}`) => void;
  setHoneypotStatus: (pairAddress: `0x${string}`, status: 'safe' | 'honeypot') => void;
}

export const useRadarStore = create<RadarState>((set) => ({
  pairs: [],
  addPair: (newPair) => set((state) => {
    if (state.pairs.some(p => p.pair === newPair.pair)) return state;
    return {
      pairs: [
        { ...newPair, timestamp: Date.now(), isNew: true, honeypotStatus: 'pending' as const },
        ...state.pairs
      ].slice(0, 50)
    };
  }),
  markAsOld: (pairAddress) => set((state) => ({
    pairs: state.pairs.map(p => p.pair === pairAddress ? { ...p, isNew: false } : p)
  })),
  setHoneypotStatus: (pairAddress, status) => set((state) => ({
    pairs: state.pairs.map(p => p.pair === pairAddress ? { ...p, honeypotStatus: status } : p)
  }))
}));

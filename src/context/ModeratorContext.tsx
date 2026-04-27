'use client';
import { createContext, useContext, useState } from 'react';

interface ModeratorContextType {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showToast: (msg: string, type?: 'ok' | 'err' | 'info') => void;
  toast: { msg: string; type: string; show: boolean };
}

const ModeratorContext = createContext<ModeratorContextType | undefined>(undefined);

export const useModerator = () => {
  const context = useContext(ModeratorContext);
  if (!context) throw new Error('useModerator must be used within ModeratorProvider');
  return context;
};

export const ModeratorProvider = ({ children, showToast, toast, searchQuery, setSearchQuery }: any) => {
  return (
    <ModeratorContext.Provider value={{ searchQuery, setSearchQuery, showToast, toast }}>
      {children}
    </ModeratorContext.Provider>
  );
};

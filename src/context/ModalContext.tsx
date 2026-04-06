'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type ModalType = 'login' | 'signup' | null;

interface ModalContextValue {
  activeModal: ModalType;
  openModal: (type: 'login' | 'signup') => void;
  closeModal: () => void;
  switchModal: (to: 'login' | 'signup') => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = (type: 'login' | 'signup') => {
    setActiveModal(type);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setActiveModal(null);
    document.body.style.overflow = '';
  };

  const switchModal = (to: 'login' | 'signup') => {
    setActiveModal(to);
  };

  return (
    <ModalContext.Provider value={{ activeModal, openModal, closeModal, switchModal }}>
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
}

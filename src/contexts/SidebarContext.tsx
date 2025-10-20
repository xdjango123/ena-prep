import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isHovered: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
  setHovered: (hovered: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false); // Start collapsed for clean look
  const [isHovered, setIsHovered] = useState(false);

  const toggle = () => {
    setIsOpen(prev => {
      const next = !prev;
      if (!next) {
        setIsHovered(false);
      }
      return next;
    });
  };

  const close = () => {
    setIsOpen(false);
    setIsHovered(false);
  };
  const open = () => setIsOpen(true);
  const setHovered = (hovered: boolean) => setIsHovered(hovered);

  const value: SidebarContextType = {
    isOpen,
    isHovered,
    toggle,
    close,
    open,
    setHovered,
  };

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
};

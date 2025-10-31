import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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

const getIsDesktop = () => {
  if (typeof window === 'undefined') {
    return true;
  }
  return window.innerWidth >= 1024;
};

export const SidebarProvider: React.FC<SidebarProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(getIsDesktop);
  const [isHovered, setIsHovered] = useState(false);

  const toggle = () => {
    if (getIsDesktop()) {
      setIsOpen(true);
      setIsHovered(false);
      return;
    }
    setIsOpen(prev => {
      const next = !prev;
      if (!next) {
        setIsHovered(false);
      }
      return next;
    });
  };

  const close = () => {
    if (getIsDesktop()) {
      setIsHovered(false);
      return;
    }
    setIsOpen(false);
    setIsHovered(false);
  };
  const open = () => {
    setIsOpen(true);
    if (!getIsDesktop()) {
      setIsHovered(false);
    }
  };
  const setHovered = (hovered: boolean) => setIsHovered(hovered);

  useEffect(() => {
    const handleResize = () => {
      if (getIsDesktop()) {
        setIsOpen(true);
        setIsHovered(false);
      } else {
        setIsOpen(false);
        setIsHovered(false);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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

import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  to?: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  to,
  href,
  onClick,
  disabled = false,
  type = 'button',
  fullWidth = false,
}) => {
  const baseStyles = clsx(
    'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
    {
      'w-full': fullWidth,
      'px-3 py-1.5 text-sm': size === 'sm',
      'px-4 py-2 text-base': size === 'md',
      'px-6 py-3 text-lg': size === 'lg',
      
      // Primary variant
      'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500': 
        variant === 'primary' && !disabled,
      
      // Secondary variant
      'bg-neutral-800 text-white hover:bg-neutral-700 focus:ring-neutral-700':
        variant === 'secondary' && !disabled,
      
      // Outline variant
      'border border-primary-500 text-primary-500 bg-transparent hover:bg-primary-50 focus:ring-primary-500':
        variant === 'outline' && !disabled,
      
      // Ghost variant
      'text-neutral-800 bg-transparent hover:bg-neutral-100 focus:ring-neutral-500':
        variant === 'ghost' && !disabled,
      
      // Disabled state
      'opacity-50 cursor-not-allowed': disabled,
    },
    className
  );

  if (to) {
    return (
      <Link to={to} className={baseStyles}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={baseStyles} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={baseStyles}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
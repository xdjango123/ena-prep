import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { staggerItem } from '../../utils/animations';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  animate?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  interactive = false,
  animate = false,
}) => {
  const baseStyles = clsx(
    'bg-white rounded-lg overflow-hidden shadow-md',
    {
      'hover:shadow-lg transition-shadow duration-300 cursor-pointer': interactive,
    },
    className
  );
  
  const CardComponent = animate ? motion.div : 'div';
  const animationProps = animate ? {
    variants: staggerItem,
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-50px" }
  } : {};

  return (
    <CardComponent className={baseStyles} {...animationProps}>
      {children}
    </CardComponent>
  );
};

export const CardHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={clsx('p-6 border-b border-neutral-200', className)}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => {
  return <div className={clsx('p-6', className)}>{children}</div>;
};

export const CardFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={clsx('p-6 border-t border-neutral-200 bg-neutral-50', className)}>
      {children}
    </div>
  );
};
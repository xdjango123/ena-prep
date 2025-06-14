import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { fadeIn } from '../../utils/animations';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  animate?: boolean;
  as?: React.ElementType;
}

export const Section: React.FC<SectionProps> = ({
  children,
  className = '',
  id,
  animate = false,
  as: Component = 'section',
}) => {
  const SectionComponent = animate ? motion.section : Component;
  const animationProps = animate ? {
    variants: fadeIn,
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-100px" }
  } : {};

  return (
    <SectionComponent
      id={id}
      className={clsx('py-12 md:py-16 lg:py-20', className)}
      {...animationProps}
    >
      {children}
    </SectionComponent>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  centered = true,
  className = '',
}) => {
  return (
    <div className={clsx('mb-12', centered && 'text-center', className)}>
      <h2 className="text-3xl md:text-4xl font-bold text-neutral-950 mb-4">{title}</h2>
      {subtitle && (
        <p className="text-lg text-neutral-700 max-w-3xl mx-auto">{subtitle}</p>
      )}
    </div>
  );
};
import React from 'react';
import clsx from 'clsx';
import { BlockMath, InlineMath } from 'react-katex';
import { useMathSegments } from '../../utils/mathFormatting';

type MathTextProps = {
  text: string;
  block?: boolean;
  className?: string;
};

const MathText: React.FC<MathTextProps> = ({ text, block = false, className }) => {
  const segments = useMathSegments(text);
  const Wrapper = (block ? 'div' : 'span') as keyof JSX.IntrinsicElements;

  const renderSegment = (value: string, index: number, type: 'inline' | 'block') => {
    try {
      if (type === 'block') {
        return <BlockMath key={`math-block-${index}`} math={value} />;
      }
      return <InlineMath key={`math-inline-${index}`} math={value} />;
    } catch (error) {
      console.warn('KaTeX rendering error:', error, 'value:', value);
      return (
        <span key={`math-fallback-${index}`} className="whitespace-pre-wrap">
          {value}
        </span>
      );
    }
  };

  return (
    <Wrapper className={clsx(block ? 'space-y-2' : 'inline', className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <React.Fragment key={`math-text-${index}`}>
              {segment.value}
            </React.Fragment>
          );
        }

        if (segment.type === 'block') {
          return renderSegment(segment.value, index, 'block');
        }

        return renderSegment(segment.value, index, 'inline');
      })}
    </Wrapper>
  );
};

export default MathText;

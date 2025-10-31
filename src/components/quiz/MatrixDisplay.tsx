import React from "react";
import clsx from "clsx";

type MatrixDisplayProps = {
  matrix?: string[][];
  html?: string;
  className?: string;
};

const fallbackMatrix = (matrix?: string[][]) =>
  matrix?.length ? matrix : [[""]];

const MatrixDisplay: React.FC<MatrixDisplayProps> = ({
  matrix,
  html,
  className,
}) => {
  if (html) {
    return (
      <div
        className={clsx("mt-4 overflow-x-auto", className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const rows = fallbackMatrix(matrix);

  return (
    <div className={clsx("mt-4 overflow-x-auto", className)}>
      <table className="w-full border-collapse border border-slate-300 text-center text-sm">
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border border-slate-300">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-slate-300 px-3 py-2 align-middle"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatrixDisplay;

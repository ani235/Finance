import React from 'react';
import { DCFParams, MetricType, TerminalMethod } from '../types';
import { calculateImpliedGrowthRate } from '../utils/dcfLogic';

interface ImpliedGrowthTableProps {
  baseValue: number;
  currentPrice: number;
  currentParams: DCFParams;
  metricLabel: MetricType;
}

export const ImpliedGrowthTable: React.FC<ImpliedGrowthTableProps> = ({
  baseValue,
  currentPrice,
  currentParams,
  metricLabel,
}) => {
  const { discountRate, terminalMultiple, terminalGrowthRate, terminalMethod, growthRate: userGrowthInput } = currentParams;

  // Generate axes
  const discountSteps = [-2, -1, 0, 1, 2];
  const terminalSteps = [-2, -1, 0, 1, 2];

  // Calculate row values (Discount Rate)
  const discountValues = discountSteps.map(step => discountRate + step);

  // Calculate column values (Terminal Value)
  let terminalValues: number[] = [];
  let terminalLabel = "";
  let terminalFormat = (v: number) => "";

  if (terminalMethod === 'multiple') {
    terminalLabel = "Terminal Multiple";
    const stepSize = 2; // Step by 2x
    terminalValues = terminalSteps.map(step => Math.max(1, terminalMultiple + (step * stepSize)));
    terminalFormat = (v) => `${v}x`;
  } else {
    terminalLabel = "Terminal Growth";
    const stepSize = 0.5; // Step by 0.5%
    terminalValues = terminalSteps.map(step => terminalGrowthRate + (step * stepSize));
    terminalFormat = (v) => `${v.toFixed(1)}%`;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs text-gray-500 font-medium">Y: Discount Rate</span>
        <span className="text-xs text-gray-500 font-medium">X: {terminalLabel}</span>
      </div>
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left bg-gray-900/50 text-gray-400 font-medium border border-gray-700 min-w-[80px]">
              Disc \ Term
            </th>
            {terminalValues.map((tv) => (
              <th key={tv} className="p-2 text-center bg-gray-900/50 text-gray-300 font-bold border border-gray-700 min-w-[60px]">
                {terminalFormat(tv)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {discountValues.map((d) => (
            <tr key={d}>
              <td className="p-2 font-bold text-gray-300 bg-gray-900/50 border border-gray-700">
                {d.toFixed(1)}%
              </td>
              {terminalValues.map((tv) => {
                // Prepare params for this cell
                const cellParams = {
                  ...currentParams,
                  discountRate: d,
                  // Dynamically set the terminal param based on method
                  ...(terminalMethod === 'multiple' 
                      ? { terminalMultiple: tv } 
                      : { terminalGrowthRate: tv }
                  ),
                };

                const impliedG = calculateImpliedGrowthRate(currentPrice, baseValue, cellParams);
                
                // Compare Implied Growth vs User Input Growth
                // If Implied < User Input => Market expects LESS than you => Undervalued (Green)
                // If Implied > User Input => Market expects MORE than you => Overvalued (Red)
                const diff = impliedG - userGrowthInput;

                let bgColor = "";
                // Note: Logic inverted compared to Intrinsic Value table. 
                // Lower implied growth is generally "safer" or "better" relative to a fixed assumption.
                if (diff < -5) bgColor = "bg-emerald-900/80";
                else if (diff < -1) bgColor = "bg-emerald-900/40";
                else if (diff <= 1) bgColor = "bg-gray-700/50"; // Roughly equal
                else if (diff < 5) bgColor = "bg-rose-900/40";
                else bgColor = "bg-rose-900/80";

                return (
                  <td 
                    key={`${d}-${tv}`} 
                    className={`p-2 text-center border border-gray-700 ${bgColor} text-gray-100 transition-colors hover:brightness-110 cursor-default`}
                    title={`Implied Growth: ${impliedG.toFixed(2)}%`}
                  >
                    {impliedG.toFixed(1)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-gray-500 text-center flex flex-wrap justify-center gap-2 md:gap-4">
        <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 
            Implied &lt; Your {userGrowthInput}% (Undervalued)
        </span>
        <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> 
            Implied &gt; Your {userGrowthInput}% (Overvalued)
        </span>
      </div>
    </div>
  );
};
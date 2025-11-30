import React from 'react';
import { DCFParams } from '../types';
import { calculateIntrinsicValue } from '../utils/dcfLogic';

interface SensitivityTableProps {
  baseValue: number;
  currentParams: DCFParams;
  currentPrice: number;
}

export const SensitivityTable: React.FC<SensitivityTableProps> = ({
  baseValue,
  currentParams,
  currentPrice,
}) => {
  const { growthRate, discountRate } = currentParams;

  // Generate axes
  const growthSteps = [-2, -1, 0, 1, 2];
  const discountSteps = [-2, -1, 0, 1, 2];

  const growthValues = growthSteps.map(step => growthRate + step);
  const discountValues = discountSteps.map(step => discountRate + step);

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs md:text-sm border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left bg-gray-900/50 text-gray-400 font-medium border border-gray-700">
              Discount \ Growth
            </th>
            {growthValues.map((g) => (
              <th key={g} className="p-2 text-center bg-gray-900/50 text-gray-300 font-bold border border-gray-700 min-w-[60px]">
                {g.toFixed(1)}%
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
              {growthValues.map((g) => {
                const { value } = calculateIntrinsicValue(baseValue, {
                  ...currentParams,
                  growthRate: g,
                  discountRate: d,
                });
                
                const diff = (value - currentPrice) / currentPrice;
                
                // Color logic
                let bgColor = "";
                let textColor = "text-gray-100";
                
                if (diff > 0.15) bgColor = "bg-emerald-900/80";
                else if (diff > 0.05) bgColor = "bg-emerald-900/40";
                else if (diff >= -0.05) bgColor = "bg-gray-700/50"; // Neutral-ish
                else if (diff > -0.15) bgColor = "bg-rose-900/40";
                else bgColor = "bg-rose-900/80";

                return (
                  <td 
                    key={`${d}-${g}`} 
                    className={`p-2 text-center border border-gray-700 ${bgColor} ${textColor} transition-colors hover:brightness-110 cursor-default`}
                    title={`Intrinsic Value: $${value.toFixed(2)}`}
                  >
                    ${value.toFixed(0)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-gray-500 text-center flex justify-center gap-4">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Undervalued</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Overvalued</span>
      </div>
    </div>
  );
};
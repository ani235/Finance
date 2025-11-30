import React from "react";
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle } from "lucide-react";

interface ResultsCardProps {
  intrinsicValue: number;
  currentPrice: number;
  impliedGrowth: number;
  currentGrowthInput: number;
  currencySymbol?: string;
}

export const ResultsCard: React.FC<ResultsCardProps> = ({
  intrinsicValue,
  currentPrice,
  impliedGrowth,
  currentGrowthInput,
  currencySymbol = "$",
}) => {
  const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100;
  const isUndervalued = intrinsicValue > currentPrice;
  const growthGap = impliedGrowth - currentGrowthInput;

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700">
      <div>
        <h2 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-4">
          Valuation Results
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-xs mb-1">Intrinsic Value</p>
            <p className={`text-2xl font-bold ${isUndervalued ? "text-emerald-400" : "text-rose-400"}`}>
              {currencySymbol}{intrinsicValue.toFixed(2)}
            </p>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-xs mb-1">Margin of Safety</p>
            <div className="flex items-center gap-1">
              <span className={`text-2xl font-bold ${isUndervalued ? "text-emerald-400" : "text-rose-400"}`}>
                {Math.abs(upside).toFixed(1)}%
              </span>
              {isUndervalued ? (
                <ArrowUpRight className="text-emerald-400 w-5 h-5" />
              ) : (
                <ArrowDownRight className="text-rose-400 w-5 h-5" />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isUndervalued ? "Upside" : "Downside"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="text-blue-400 w-5 h-5" />
          <h3 className="text-white font-semibold">Reverse DCF Insight</h3>
        </div>
        
        <p className="text-gray-400 text-sm mb-4">
          To justify the current price of <span className="text-white font-bold">{currencySymbol}{currentPrice.toFixed(2)}</span>, 
          the company needs to grow earnings at:
        </p>
        
        <div className="flex items-baseline gap-3 mb-2">
          <span className="text-4xl font-bold text-blue-400">
            {impliedGrowth.toFixed(1)}%
          </span>
          <span className="text-gray-500 text-sm">CAGR for next 10 years</span>
        </div>

        <div className={`text-sm p-3 rounded-md border ${growthGap > 5 ? 'bg-red-900/20 border-red-800 text-red-300' : growthGap < -5 ? 'bg-emerald-900/20 border-emerald-800 text-emerald-300' : 'bg-yellow-900/20 border-yellow-800 text-yellow-300'}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              {growthGap > 5 
                ? "Current price implies highly optimistic growth compared to your input." 
                : growthGap < -5 
                  ? "Current price implies conservative growth. Potential opportunity."
                  : "Market expectations are aligned with your growth assumptions."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
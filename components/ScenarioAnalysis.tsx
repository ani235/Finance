import React, { useState, useEffect } from "react";
import { StockData, MetricType, Scenario, DCFParams, TerminalMethod, SimplifierReport } from "../types";
import { calculateIntrinsicValue } from "../utils/dcfLogic";
import { ArrowDown, ArrowUp, HelpCircle, History, Info, DollarSign, Target, CheckCircle, AlertOctagon } from "lucide-react";

interface ScenarioAnalysisProps {
  stockData: StockData;
  metricType: MetricType;
  baseParams: DCFParams;
  businessPhase?: string;
  aiVerdict?: SimplifierReport['verdict'];
  onValuationChange?: (data: { normalValue: number; upside: number; impliedGrowth: number }) => void;
  currencySymbol?: string;
}

export const ScenarioAnalysis: React.FC<ScenarioAnalysisProps> = ({
  stockData,
  metricType,
  baseParams,
  businessPhase = "Operating Leverage",
  aiVerdict,
  onValuationChange,
  currencySymbol = "$",
}) => {
  const [discountRate, setDiscountRate] = useState<number>(baseParams.discountRate);
  const [terminalMethod, setTerminalMethod] = useState<TerminalMethod>('multiple');
  
  const [scenarios, setScenarios] = useState<[Scenario, Scenario, Scenario]>([
    { name: "Conservative", growthRate: 5, terminalValueInput: 10 },
    { name: "Normal", growthRate: 10, terminalValueInput: 15 },
    { name: "Aggressive", growthRate: 15, terminalValueInput: 20 },
  ]);

  // Determine if we are in Growth Phase (1-3)
  const isGrowthMode = ["Startup", "Hypergrowth", "Self-Funding"].includes(businessPhase);

  // Set default scenarios based on fetched data when stockData changes
  useEffect(() => {
    // 1. Determine Base Growth Rate (Strictly Historical FCF/EPS driven with Safety Reduction)
    
    // Default fallback
    let baseGrowth = 8;
    
    // Check historicals
    const histEPS = stockData.historical.epsGrowth5y || stockData.historical.epsGrowth3y;
    const histFCF = stockData.historical.fcfGrowth5y || stockData.historical.fcfGrowth3y;

    if (histEPS !== null && histFCF !== null) {
      baseGrowth = (histEPS + histFCF) / 2;
    } else if (histEPS !== null) {
      baseGrowth = histEPS;
    } else if (histFCF !== null) {
      baseGrowth = histFCF;
    } else if (stockData.growthRate) {
      // Fallback to analyst only if absolutely no history
      baseGrowth = stockData.growthRate;
    }

    // Apply strict reduction for "Normal Scenario Base" as requested
    baseGrowth = baseGrowth * 0.85;

    // Apply strict caps (Max 18% to avoid broken DCFs from outlier years)
    baseGrowth = Math.max(2, Math.min(baseGrowth, 18));

    // 2. Determine Base Multiple
    // Cap default multiple at 20x or use P/E if lower, floor at 10x
    const basePE = Math.max(10, Math.min(stockData.price / (stockData.eps || 1), 20));
    
    setScenarios([
      { 
          name: "Conservative", 
          growthRate: Math.max(0, Math.floor(baseGrowth * 0.6)), 
          terminalValueInput: terminalMethod === 'multiple' ? Math.max(5, Math.floor(basePE * 0.7)) : 2.0 
      },
      { 
          name: "Normal", 
          growthRate: parseFloat(baseGrowth.toFixed(1)), 
          terminalValueInput: terminalMethod === 'multiple' ? Math.round(basePE) : 2.5 
      },
      { 
          name: "Aggressive", 
          growthRate: Math.ceil(baseGrowth * 1.3), 
          terminalValueInput: terminalMethod === 'multiple' ? Math.ceil(basePE * 1.2) : 3.0 
      },
    ]);
    setDiscountRate(baseParams.discountRate);
  }, [stockData, terminalMethod, baseParams.discountRate]);

  const updateScenario = (index: number, field: keyof Scenario, value: number) => {
    const newScenarios = [...scenarios] as [Scenario, Scenario, Scenario];
    newScenarios[index] = { ...newScenarios[index], [field]: value };
    setScenarios(newScenarios);
  };

  const renderGrowthCell = (val: number | null) => {
    if (val === null) return <span className="text-gray-600">-</span>;
    return (
      <span className={val >= 10 ? "text-emerald-400 font-bold" : val > 0 ? "text-emerald-300" : "text-rose-400"}>
        {val.toFixed(1)}%
      </span>
    );
  };

  const baseValue = metricType === 'EPS' ? stockData.eps : stockData.fcf;
  
  // Historical Valuation Data Logic
  const relevantHistoricalMultiple = isGrowthMode 
     ? stockData.historical.avgPs5y 
     : (metricType === 'EPS' ? stockData.historical.avgPe5y : stockData.historical.avgPcf5y);
  
  const relevantCurrentMultiple = isGrowthMode
     ? stockData.ps
     : (stockData.price / (baseValue || 1));

  const multipleLabel = isGrowthMode ? "Price/Sales" : (metricType === 'EPS' ? "P/E Ratio" : "Price/FCF");

  const relativeDiff = relevantHistoricalMultiple ? ((relevantCurrentMultiple - relevantHistoricalMultiple) / relevantHistoricalMultiple) * 100 : 0;

  // --- Dynamic Verdict Logic ---
  // Calculate the intrinsic value of the "Normal" scenario
  const normalScenario = scenarios[1];
  const { value: normalValue } = calculateIntrinsicValue(baseValue, {
      discountRate,
      growthRate: normalScenario.growthRate,
      years: 10,
      terminalMethod,
      terminalMultiple: terminalMethod === 'multiple' ? normalScenario.terminalValueInput : 0,
      terminalGrowthRate: terminalMethod === 'growth' ? normalScenario.terminalValueInput : 0,
  });

  const upside = ((normalValue - stockData.price) / stockData.price) * 100;
  
  // Notify Parent Component of Valuation Changes
  useEffect(() => {
    if (onValuationChange) {
        onValuationChange({
            normalValue,
            upside,
            impliedGrowth: 0 // Placeholder, handled in logic if needed
        });
    }
  }, [normalValue, upside, onValuationChange]);

  // Unified Verdict Logic (Local Display)
  // NOTE: This local verdict display acts as the specific "Scenario Verdict". 
  // The global "Analyst Verdict" in StockSimplifier uses this data + Quality Score.
  const MARGIN_OF_SAFETY = 20.0;

  let localVerdict = "HOLD";
  let verdictColor = "text-yellow-400";
  
  if (upside > MARGIN_OF_SAFETY) {
      localVerdict = "BUY";
      verdictColor = "text-emerald-400";
  } else if (upside < 0) {
      localVerdict = "SELL";
      verdictColor = "text-rose-400";
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
             <div className="bg-emerald-600 p-2 rounded-lg"><DollarSign className="w-6 h-6 text-white" /></div>
             Step 7: Valuation Scenarios
      </h2>

      {/* Historical Data & Multiples Valuation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            Historical Growth Rates
            </h3>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
                <thead>
                <tr className="text-gray-500 border-b border-gray-700">
                    <th className="px-2 py-2 text-left font-medium">Metric</th>
                    <th className="px-2 py-2 font-medium">5y</th>
                    <th className="px-2 py-2 font-medium">3y</th>
                    <th className="px-2 py-2 font-medium">1y</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                <tr>
                    <td className="px-2 py-3 text-left font-medium text-gray-300">Revenue</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.revenueGrowth5y)}</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.revenueGrowth3y)}</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.revenueGrowth1y)}</td>
                </tr>
                <tr>
                    <td className="px-2 py-3 text-left font-medium text-gray-300">EPS</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.epsGrowth5y)}</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.epsGrowth3y)}</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.epsGrowth1y)}</td>
                </tr>
                <tr>
                    <td className="px-2 py-3 text-left font-medium text-gray-300">FCF</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.fcfGrowth5y)}</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.fcfGrowth3y)}</td>
                    <td className="px-2 py-3">{renderGrowthCell(stockData.historical.fcfGrowth1y)}</td>
                </tr>
                </tbody>
            </table>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    Phase-Adjusted Valuation
                </h3>
                <p className="text-gray-400 text-xs mb-4">
                    Evaluating based on <strong>{businessPhase}</strong> phase.
                    {isGrowthMode && <span className="block text-yellow-500 mt-1"><Info className="inline w-3 h-3 mr-1"/>Using Price-to-Sales for early stage context.</span>}
                </p>
                
                <div className="flex justify-between items-center mb-4">
                    <div className="text-center">
                        <span className="text-xs text-gray-500 block uppercase">Current {multipleLabel}</span>
                        <span className="text-2xl font-bold text-white">{relevantCurrentMultiple.toFixed(1)}x</span>
                    </div>
                    <div className="h-8 w-px bg-gray-700 mx-4"></div>
                    <div className="text-center">
                        <span className="text-xs text-gray-500 block uppercase">5y Avg {multipleLabel}</span>
                        <span className="text-2xl font-bold text-gray-300">{relevantHistoricalMultiple ? `${relevantHistoricalMultiple.toFixed(1)}x` : 'N/A'}</span>
                    </div>
                </div>
              </div>
              
              {relevantHistoricalMultiple && (
                  <div className={`p-3 rounded-lg border ${relativeDiff > 20 ? 'bg-rose-900/20 border-rose-800' : relativeDiff < -20 ? 'bg-emerald-900/20 border-emerald-800' : 'bg-yellow-900/20 border-yellow-800'}`}>
                      <div className="flex items-center gap-2 text-sm">
                          {relativeDiff > 0 ? (
                              <ArrowUp className={`w-4 h-4 ${relativeDiff > 20 ? 'text-rose-400' : 'text-yellow-400'}`} />
                          ) : (
                              <ArrowDown className={`w-4 h-4 ${relativeDiff < -20 ? 'text-emerald-400' : 'text-yellow-400'}`} />
                          )}
                          <span className="text-gray-200">
                             Trading <strong>{Math.abs(relativeDiff).toFixed(1)}% {relativeDiff > 0 ? 'Premium' : 'Discount'}</strong> to historical {multipleLabel}.
                          </span>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Global Settings */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-4 w-full md:w-auto">
             <div className="flex items-center gap-2">
                <span className="text-gray-300 font-medium text-sm">Discount Rate</span>
                <div className="group relative">
                    <HelpCircle className="w-4 h-4 text-gray-500 cursor-help" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 bg-gray-900 text-xs text-gray-300 rounded shadow-xl border border-gray-700 hidden group-hover:block z-10">
                        Required annual rate of return. Defaults to 6% for standard analysis.
                    </div>
                </div>
             </div>
             <div className="flex items-center gap-2 flex-grow">
                 <input 
                    type="range" 
                    min="4" max="15" step="0.5" 
                    value={discountRate} 
                    onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                    className="w-full md:w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                 />
                 <span className="text-emerald-400 font-bold font-mono w-16 text-right">{discountRate}%</span>
             </div>
         </div>

         <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
             <button 
                onClick={() => setTerminalMethod('multiple')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${terminalMethod === 'multiple' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
                Exit Multiple
             </button>
             <button 
                onClick={() => setTerminalMethod('growth')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${terminalMethod === 'growth' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             >
                Terminal Growth
             </button>
         </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((scenario, idx) => {
            // Prepare correct params based on method
            const calculationParams = {
                discountRate,
                growthRate: scenario.growthRate,
                years: 10,
                terminalMethod: terminalMethod,
                terminalMultiple: terminalMethod === 'multiple' ? scenario.terminalValueInput : 0,
                terminalGrowthRate: terminalMethod === 'growth' ? scenario.terminalValueInput : 0,
            };

            // Calculate Value for this scenario
            const { value: buyPrice } = calculateIntrinsicValue(baseValue, calculationParams);

            const difference = ((buyPrice - stockData.price) / stockData.price) * 100;
            const isBuy = buyPrice > stockData.price;

            // Styles based on type
            let borderColor = "border-gray-700";
            let titleColor = "text-gray-300";
            if (idx === 0) { borderColor = "border-emerald-900"; titleColor = "text-emerald-400"; } // Conservative
            if (idx === 1) { borderColor = "border-blue-900"; titleColor = "text-blue-400"; } // Normal
            if (idx === 2) { borderColor = "border-rose-900"; titleColor = "text-rose-400"; } // Aggressive

            return (
                <div key={idx} className={`bg-gray-800 rounded-xl p-5 border-2 shadow-xl flex flex-col ${borderColor}`}>
                    <h4 className={`text-lg font-bold mb-4 uppercase tracking-wider text-center ${titleColor}`}>
                        {scenario.name}
                    </h4>

                    <div className="space-y-4 mb-6 flex-grow">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Growth Rate (10y)</label>
                            <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700 px-3 py-2">
                                <input 
                                    type="number" 
                                    value={scenario.growthRate}
                                    onChange={(e) => updateScenario(idx, 'growthRate', parseFloat(e.target.value))}
                                    className="bg-transparent text-white font-mono w-full focus:outline-none"
                                />
                                <span className="text-gray-500 text-sm">%</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">
                                {terminalMethod === 'multiple' ? 'Terminal Multiple' : 'Terminal Growth'}
                            </label>
                            <div className="flex items-center bg-gray-900 rounded-lg border border-gray-700 px-3 py-2">
                                <input 
                                    type="number" 
                                    value={scenario.terminalValueInput}
                                    step={terminalMethod === 'growth' ? 0.1 : 0.5}
                                    onChange={(e) => updateScenario(idx, 'terminalValueInput', parseFloat(e.target.value))}
                                    className="bg-transparent text-white font-mono w-full focus:outline-none"
                                />
                                <span className="text-gray-500 text-sm">
                                    {terminalMethod === 'multiple' ? 'x' : '%'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700/50">
                        <div className="text-center mb-2">
                            <span className="text-xs text-gray-500">Intrinsic Value (Buy Price)</span>
                            <div className={`text-3xl font-bold ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {currencySymbol}{buyPrice.toFixed(2)}
                            </div>
                        </div>
                        
                        <div className={`text-xs font-medium text-center py-1 rounded ${isBuy ? 'bg-emerald-900/30 text-emerald-300' : 'bg-rose-900/30 text-rose-300'}`}>
                             {isBuy ? (
                                <span className="flex items-center justify-center gap-1">
                                    <ArrowUp className="w-3 h-3" /> {difference.toFixed(1)}% Upside
                                </span>
                             ) : (
                                <span className="flex items-center justify-center gap-1">
                                    <ArrowDown className="w-3 h-3" /> {Math.abs(difference).toFixed(1)}% Downside
                                </span>
                             )}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};
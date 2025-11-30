import React, { useState, useEffect, useCallback } from "react";
import { Search, Info, Loader2, ExternalLink, Edit2, LayoutDashboard, Calculator } from "lucide-react";
import { StockData, DCFParams, GroundingSource, TerminalMethod, MetricType } from "./types";
import { fetchStockData } from "./services/geminiService";
import { calculateIntrinsicValue, calculateImpliedGrowthRate } from "./utils/dcfLogic";
import { InputSlider } from "./components/InputSlider";
import { ResultsCard } from "./components/ResultsCard";
import { SensitivityTable } from "./components/SensitivityTable";
import { ImpliedGrowthTable } from "./components/ImpliedGrowthTable";
import { StockSimplifier } from "./components/StockSimplifier";
import { StockChart } from "./components/StockChart";

const App: React.FC = () => {
  const [ticker, setTicker] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [manualMode, setManualMode] = useState<boolean>(false);
  
  // View Mode: Default to Simplifier (Analysis) first
  const [activeTab, setActiveTab] = useState<'simplifier' | 'reverse'>('simplifier');
  
  // Metric State
  const [metricType, setMetricType] = useState<MetricType>('EPS');

  // Calculator State
  const [dcfParams, setDcfParams] = useState<DCFParams>({
    discountRate: 6, // Base rate from Long Term Mindset philosophy
    terminalMultiple: 15, // Base conservative multiple
    terminalGrowthRate: 2.5,
    terminalMethod: 'multiple',
    years: 10,
    growthRate: 10,
  });

  const [intrinsicValue, setIntrinsicValue] = useState<number>(0);
  const [impliedGrowth, setImpliedGrowth] = useState<number>(0);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setLoading(true);
    setError(null);
    setStockData(null);
    setSources([]);
    setManualMode(false);
    setActiveTab('simplifier'); // Default to Simplifier
    setMetricType('EPS');

    try {
      const { data, sources: fetchedSources } = await fetchStockData(ticker);
      setStockData(data);
      setSources(fetchedSources);
      
      // --- Smart Defaults Logic ---
      
      // 1. Growth Rate: STRICT priority on Historical FCF/EPS
      // As requested: "Normal scenario base" should be historical growth reduced further.
      const fcfGrowth = data.historical.fcfGrowth5y || data.historical.fcfGrowth3y;
      const epsGrowth = data.historical.epsGrowth5y || data.historical.epsGrowth3y;
      
      let baseGrowth = 8; // Conservative floor default

      if (fcfGrowth !== null && epsGrowth !== null) {
        // Average them for a balanced view
        baseGrowth = (fcfGrowth + epsGrowth) / 2;
      } else if (fcfGrowth !== null) {
        baseGrowth = fcfGrowth;
      } else if (epsGrowth !== null) {
        baseGrowth = epsGrowth;
      } else if (data.growthRate) {
        baseGrowth = data.growthRate;
      }

      // REDUCTION LOGIC: Apply a 15% haircut to historicals for safety (0.85 multiplier)
      baseGrowth = baseGrowth * 0.85;

      // SAFETY CAP: Historical growth can be huge. Cap defaults to 18% max, floor at 2%.
      baseGrowth = Math.max(2, Math.min(baseGrowth, 18));

      // 2. Terminal Multiple Logic
      // Cap default multiple at 20x or current P/E if lower.
      const currentPE = data.price / (data.eps || 1);
      const safeMultiple = Math.max(10, Math.min(currentPE, 20));

      setDcfParams(prev => ({
        ...prev,
        growthRate: parseFloat(baseGrowth.toFixed(1)),
        terminalMultiple: parseFloat(safeMultiple.toFixed(1)),
      }));

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const startManualEntry = () => {
    setLoading(false);
    setError(null);
    setSources([]);
    setManualMode(true);
    setMetricType('EPS');
    setActiveTab('simplifier');
    setStockData({
      ticker: "CUSTOM",
      price: 100,
      eps: 5,
      fcf: 4,
      ps: 8,
      growthRate: 10,
      currency: "USD",
      historical: {
        revenueGrowth5y: 8, revenueGrowth3y: 7, revenueGrowth1y: 5,
        epsGrowth5y: 10, epsGrowth3y: 12, epsGrowth1y: 8,
        fcfGrowth5y: 9, fcfGrowth3y: 11, fcfGrowth1y: 6,
        avgPe5y: 20, avgPcf5y: 18, avgPs5y: 6
      },
      stockPerformance: { return1y: 15, return3y: 25, return5y: 60 },
      valuationHistory: [
          { year: '2020', price: 80, pe: 16, pfcf: 20, ps: 6.5 },
          { year: '2021', price: 95, pe: 19, pfcf: 22, ps: 7.2 },
          { year: '2022', price: 85, pe: 17, pfcf: 20, ps: 6.8 },
          { year: '2023', price: 110, pe: 22, pfcf: 25, ps: 8.0 },
          { year: '2024', price: 100, pe: 20, pfcf: 23, ps: 7.5 }
      ],
      report: {
          confidenceScore: 85,
          businessPhase: { phase: "Self-Funding", description: "User generated scenario." },
          businessModel: { rating: "Yellow", confidence: "Medium", summary: "Manual data entry.", details: [], segments: [] },
          moatAnalysis: { rating: "Yellow", confidence: "Medium", summary: "Manual data entry.", details: [], width: "Narrow", trend: "Stable", sources: [] },
          growthAnalysis: { rating: "Yellow", confidence: "Medium", summary: "Manual data entry.", details: [], drivers: [] },
          financialHealth: { rating: "Green", confidence: "Medium", summary: "Manual data entry.", details: [], roic: 15, grossMargin: 40 },
          riskAnalysis: { rating: "Yellow", confidence: "Medium", summary: "Manual data entry.", details: [], mainRisks: [] },
          verdict: { rating: "Hold", summary: "Manual Entry Mode active." }
      }
    });
    setDcfParams(prev => ({
        ...prev,
        growthRate: 10,
    }));
  };

  const handleStockDataChange = (key: keyof StockData, value: string | number) => {
    if (!stockData) return;
    setStockData({ ...stockData, [key]: value });
  };

  // Recalculate whenever params or stock data changes
  useEffect(() => {
    if (!stockData) return;

    const baseValue = metricType === 'EPS' ? stockData.eps : stockData.fcf;

    // 1. Calculate Intrinsic Value (Forward)
    const { value } = calculateIntrinsicValue(baseValue, dcfParams);
    setIntrinsicValue(value);

    // 2. Calculate Implied Growth (Reverse)
    const implied = calculateImpliedGrowthRate(stockData.price, baseValue, {
      discountRate: dcfParams.discountRate,
      terminalMultiple: dcfParams.terminalMultiple,
      terminalGrowthRate: dcfParams.terminalGrowthRate,
      terminalMethod: dcfParams.terminalMethod,
      years: dcfParams.years,
    });
    setImpliedGrowth(implied);

  }, [stockData, dcfParams, metricType]);

  const updateParam = useCallback((key: keyof DCFParams, value: number | string) => {
    setDcfParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans bg-[#111827] text-gray-100">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Reverse DCF Pro
          </h1>
          <p className="text-gray-400 mt-1">
            Intelligent valuation & scenario analysis
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Enter Stock Ticker (e.g., MSFT)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-gray-500"
            />
            <Search className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-2 bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="px-2 text-sm font-semibold">Analyze</span>}
            </button>
          </form>
          <button 
            onClick={startManualEntry}
            className="px-4 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors font-medium text-sm whitespace-nowrap"
          >
            Manual Entry
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {error && (
          <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        {!stockData && !loading && !error && (
          <div className="text-center py-20 bg-gray-800/30 rounded-2xl border border-gray-800 border-dashed">
            <Info className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300">Ready to Analyze</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              Enter a ticker symbol above or use Manual Entry to start your valuation analysis.
            </p>
          </div>
        )}

        {loading && !stockData && (
           <div className="text-center py-20">
             <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
             <p className="text-gray-400">Fetching financial data from the web...</p>
           </div>
        )}

        {stockData && (
          <>
          {/* Header Card with Chart & Performance */}
          <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 mb-6">
            <div className="flex flex-col lg:flex-row gap-8 items-start"> 
               {/* Added items-start to top align and prevent odd stretching gaps */}
               
               {/* Left: Basic Info & Inputs */}
               <div className="flex-1 flex flex-col justify-start">
                  <div>
                      <div className="flex items-center gap-3 mb-2">
                        {manualMode ? (
                            <input 
                                type="text" 
                                value={stockData.ticker}
                                onChange={(e) => handleStockDataChange('ticker', e.target.value)}
                                className="bg-transparent text-3xl font-bold text-white tracking-tight border-b border-dashed border-gray-600 focus:outline-none focus:border-emerald-500 w-32 uppercase"
                            />
                        ) : (
                            <h2 className="text-4xl font-bold text-white tracking-tight">{stockData.ticker}</h2>
                        )}
                        <span className="text-gray-500 text-sm bg-gray-900 px-2 py-1 rounded">{stockData.currency}</span>
                      </div>

                      <div className="flex flex-wrap gap-6 mt-4">
                         <div>
                            <span className="text-gray-400 text-xs block mb-1">Price</span>
                            <div className="relative">
                                <span className="absolute left-2 top-0.5 text-gray-500 font-bold text-xs">$</span>
                                <input 
                                    type="number" 
                                    value={stockData.price}
                                    onChange={(e) => handleStockDataChange('price', parseFloat(e.target.value))}
                                    className="bg-gray-900 border border-gray-700 rounded py-0.5 pl-4 pr-1 w-24 text-lg font-bold text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                             </div>
                         </div>
                         <div>
                            <span className="text-gray-400 text-xs block mb-1">EPS (TTM)</span>
                            <input 
                                type="number" 
                                value={stockData.eps}
                                onChange={(e) => handleStockDataChange('eps', parseFloat(e.target.value))}
                                className="bg-gray-900 border border-gray-700 rounded py-0.5 px-2 w-20 text-lg font-mono text-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                         </div>
                         <div>
                            <span className="text-gray-400 text-xs block mb-1">FCF (TTM)</span>
                            <input 
                                type="number" 
                                value={stockData.fcf}
                                onChange={(e) => handleStockDataChange('fcf', parseFloat(e.target.value))}
                                className="bg-gray-900 border border-gray-700 rounded py-0.5 px-2 w-20 text-lg font-mono text-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                         </div>
                      </div>

                      <div className="flex gap-4 mt-6">
                        {/* Metric Toggle */}
                         <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 h-10">
                            <button 
                               onClick={() => setMetricType('EPS')}
                               className={`px-4 rounded-md text-sm font-medium transition-all ${metricType === 'EPS' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                               EPS
                            </button>
                            <button 
                               onClick={() => setMetricType('FCF')}
                               className={`px-4 rounded-md text-sm font-medium transition-all ${metricType === 'FCF' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                               FCF
                            </button>
                         </div>
                      </div>
                  </div>
               </div>

               {/* Right: Chart & Performance Stats */}
               <div className="flex-1 w-full lg:max-w-md">
                   {/* Pass valuationHistory if available */}
                   <StockChart 
                        data={stockData.valuationHistory || []} 
                        ticker={stockData.ticker} 
                        // Smart default based on lifecycle
                        defaultMetric={['Startup', 'Hypergrowth'].includes(stockData.report?.businessPhase.phase || '') ? 'PS' : 'Price'}
                   />
                   
                   {/* Performance Grid */}
                   <div className="grid grid-cols-3 gap-2 mt-4">
                       <div className="bg-gray-900/50 rounded p-2 text-center border border-gray-700/50">
                           <span className="text-[10px] text-gray-500 uppercase block">1Y Return</span>
                           <span className={`text-sm font-bold ${stockData.stockPerformance?.return1y && stockData.stockPerformance.return1y >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                               {stockData.stockPerformance?.return1y ? `${stockData.stockPerformance.return1y > 0 ? '+' : ''}${stockData.stockPerformance.return1y}%` : '-'}
                           </span>
                       </div>
                       <div className="bg-gray-900/50 rounded p-2 text-center border border-gray-700/50">
                           <span className="text-[10px] text-gray-500 uppercase block">3Y Return</span>
                           <span className={`text-sm font-bold ${stockData.stockPerformance?.return3y && stockData.stockPerformance.return3y >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                               {stockData.stockPerformance?.return3y ? `${stockData.stockPerformance.return3y > 0 ? '+' : ''}${stockData.stockPerformance.return3y}%` : '-'}
                           </span>
                       </div>
                       <div className="bg-gray-900/50 rounded p-2 text-center border border-gray-700/50">
                           <span className="text-[10px] text-gray-500 uppercase block">5Y Return</span>
                           <span className={`text-sm font-bold ${stockData.stockPerformance?.return5y && stockData.stockPerformance.return5y >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                               {stockData.stockPerformance?.return5y ? `${stockData.stockPerformance.return5y > 0 ? '+' : ''}${stockData.stockPerformance.return5y}%` : '-'}
                           </span>
                       </div>
                   </div>
               </div>
            </div>
          </div>

          {/* Navigation Tabs (Reordered) */}
          <div className="flex border-b border-gray-700 mb-6 gap-6">
             <button 
                onClick={() => setActiveTab('simplifier')}
                className={`pb-3 flex items-center gap-2 text-sm font-medium transition-colors relative ${activeTab === 'simplifier' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}
             >
                <LayoutDashboard className="w-4 h-4" />
                Simplifier Report (7-Steps)
                {activeTab === 'simplifier' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-t-full"></span>}
             </button>
             <button 
                onClick={() => setActiveTab('reverse')}
                className={`pb-3 flex items-center gap-2 text-sm font-medium transition-colors relative ${activeTab === 'reverse' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}
             >
                <Calculator className="w-4 h-4" />
                Standard Reverse DCF
                {activeTab === 'reverse' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-t-full"></span>}
             </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'reverse' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
                {/* Left Column: Inputs & Stats */}
                <div className="lg:col-span-7 space-y-6">
                  {/* Calculator Inputs */}
                  <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Assumptions ({metricType})</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <InputSlider
                        label="Growth Rate (Next 10y)"
                        value={dcfParams.growthRate}
                        min={-5}
                        max={50}
                        step={0.5}
                        suffix="%"
                        onChange={(v) => updateParam("growthRate", v)}
                        tooltip={`The estimated annual growth rate of ${metricType}.`}
                      />
                      <InputSlider
                        label="Discount Rate"
                        value={dcfParams.discountRate}
                        min={5}
                        max={20}
                        step={0.5}
                        suffix="%"
                        onChange={(v) => updateParam("discountRate", v)}
                        tooltip="The required rate of return (WACC)."
                      />

                      {/* Terminal Value Section */}
                      <div className="pt-4 border-t border-gray-700">
                          <div className="flex justify-between items-center mb-4">
                              <label className="text-sm font-medium text-gray-300">Terminal Value Method</label>
                              <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700">
                                  <button 
                                    onClick={() => updateParam("terminalMethod", 'multiple')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${dcfParams.terminalMethod === 'multiple' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                  >
                                      Exit Multiple
                                  </button>
                                  <button 
                                    onClick={() => updateParam("terminalMethod", 'growth')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${dcfParams.terminalMethod === 'growth' ? 'bg-emerald-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                  >
                                      Perpetuity Growth
                                  </button>
                              </div>
                          </div>

                          {dcfParams.terminalMethod === 'multiple' ? (
                            <InputSlider
                                label="Terminal Multiple"
                                value={dcfParams.terminalMultiple}
                                min={5}
                                max={50}
                                step={1}
                                suffix="x"
                                onChange={(v) => updateParam("terminalMultiple", v)}
                                tooltip={`Price-to-${metricType} ratio expected at year 10.`}
                            />
                          ) : (
                            <InputSlider
                                label="Terminal Growth Rate"
                                value={dcfParams.terminalGrowthRate}
                                min={0}
                                max={10}
                                step={0.1}
                                suffix="%"
                                onChange={(v) => updateParam("terminalGrowthRate", v)}
                                tooltip="Perpetual growth rate after year 10. Must be lower than Discount Rate."
                            />
                          )}
                      </div>
                    </div>
                  </div>

                  {/* Intrinsic Value Sensitivity Table */}
                  <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Sensitivity Analysis</h3>
                            <p className="text-xs text-gray-500">Intrinsic Value based on variations</p>
                        </div>
                        <div className="text-right">
                             <span className="text-xs text-gray-400 block">Baseline Price</span>
                             <span className="text-sm font-bold text-white">${stockData.price.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    <SensitivityTable 
                      baseValue={metricType === 'EPS' ? stockData.eps : stockData.fcf} 
                      currentParams={dcfParams} 
                      currentPrice={stockData.price} 
                    />
                  </div>
                </div>

                {/* Right Column: Results */}
                <div className="lg:col-span-5 space-y-6">
                  <ResultsCard 
                    intrinsicValue={intrinsicValue}
                    currentPrice={stockData.price}
                    impliedGrowth={impliedGrowth}
                    currentGrowthInput={dcfParams.growthRate}
                  />

                  {/* Implied Growth Sensitivity Table */}
                  <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Reverse DCF Matrix</h3>
                            <p className="text-xs text-gray-500">Implied Growth Rate (%) required to justify Price</p>
                        </div>
                    </div>
                    
                    <ImpliedGrowthTable 
                      baseValue={metricType === 'EPS' ? stockData.eps : stockData.fcf} 
                      currentParams={dcfParams} 
                      currentPrice={stockData.price}
                      metricLabel={metricType}
                    />
                  </div>
                  
                  {/* Sources */}
                  {sources.length > 0 && (
                    <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Data Sources
                      </h3>
                      <ul className="space-y-2">
                        {sources.slice(0, 4).map((source, idx) => (
                          <li key={idx}>
                            <a 
                              href={source.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors group"
                            >
                              <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 opacity-50 group-hover:opacity-100" />
                              <span className="truncate">{source.title}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
          ) : (
              <div className="w-full">
                  <StockSimplifier 
                    stockData={stockData} 
                    metricType={metricType} 
                    baseParams={dcfParams}
                  />
                  
                  {/* Sources Footnote for Simplifier */}
                  {sources.length > 0 && (
                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500">Data derived from: {sources.slice(0, 3).map(s => s.title).join(", ")}</p>
                    </div>
                  )}
              </div>
          )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
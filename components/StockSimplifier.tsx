import React, { useState, useEffect, useMemo } from 'react';
import { StockData, MetricType, DCFParams, BusinessPhase, RatingColor, SentimentType, ConfidenceLevel } from '../types';
import { ScenarioAnalysis } from './ScenarioAnalysis';
import { Shield, TrendingUp, AlertTriangle, Activity, Target, Zap, ChevronDown, CheckCircle, Brain, Newspaper, Printer, Gauge, Lock, Unlock, BarChart, Eye } from 'lucide-react';

interface StockSimplifierProps {
  stockData: StockData;
  metricType: MetricType;
  baseParams: DCFParams;
}

const PHASES: BusinessPhase[] = [
  "Startup", 
  "Hypergrowth", 
  "Self-Funding", 
  "Operating Leverage", 
  "Capital Return", 
  "Decline"
];

export const StockSimplifier: React.FC<StockSimplifierProps> = ({
  stockData,
  metricType,
  baseParams,
}) => {
  const report = stockData.report;
  
  // Local state for interactive ratings overrides
  const [ratings, setRatings] = useState<Record<string, RatingColor>>({});
  const [selectedPhase, setSelectedPhase] = useState<string>("");
  
  // State for valuation data lifted from ScenarioAnalysis
  const [valuationData, setValuationData] = useState<{ normalValue: number; upside: number }>({ normalValue: 0, upside: 0 });

  useEffect(() => {
    if (report) {
      setRatings({
        businessModel: report.businessModel.rating,
        moatAnalysis: report.moatAnalysis.rating,
        growthAnalysis: report.growthAnalysis.rating,
        financialHealth: report.financialHealth.rating,
        riskAnalysis: report.riskAnalysis.rating,
      });
      setSelectedPhase(report.businessPhase.phase);
    }
  }, [report]);

  // --- ENGINE: QUALITY SCORE CALCULATION ---
  const qualityScore = useMemo(() => {
    if (!ratings.businessModel) return 0;

    const sections = ['businessModel', 'moatAnalysis', 'growthAnalysis', 'financialHealth'];
    let totalPoints = 0;
    const maxPointsPerSection = 10;

    // Standard Sections
    sections.forEach(key => {
      if (ratings[key] === 'Green') totalPoints += maxPointsPerSection;
      else if (ratings[key] === 'Yellow') totalPoints += maxPointsPerSection * 0.5;
      // Red = 0
    });

    // Risk Analysis (Weighted logic: Green is good, Red is bad)
    if (ratings.riskAnalysis === 'Green') totalPoints += 10; 
    else if (ratings.riskAnalysis === 'Yellow') totalPoints += 5; 
    
    // Max possible is 50. Scale to 100.
    return (totalPoints / 50) * 100;
  }, [ratings]);

  // --- ENGINE: DYNAMIC VERDICT & THESIS ---
  const { dynamicVerdict, dynamicSummary, verdictColor, verdictBg } = useMemo(() => {
      const score = qualityScore;
      const upside = valuationData.upside;
      const marginOfSafety = 20;

      let verdict = "HOLD";
      let summary = "";
      let color = "text-yellow-400";
      let bg = "bg-yellow-500/10 border-yellow-500/30";

      // LOGIC MATRIX
      if (score >= 80 && upside >= marginOfSafety) {
          verdict = "STRONG BUY";
          color = "text-emerald-400";
          bg = "bg-emerald-500/10 border-emerald-500/30";
          summary = `Rare Opportunity: High Quality Business (${score}/100) trading at a significant discount (${upside.toFixed(1)}% upside). This is a high-conviction setup.`;
      } else if (score >= 70 && upside > 5) {
          verdict = "BUY";
          color = "text-emerald-400";
          bg = "bg-emerald-500/10 border-emerald-500/30";
          summary = `Solid compounder (${score}/100) trading at a fair price. While the discount isn't massive (${upside.toFixed(1)}%), the quality justifies an accumulation strategy.`;
      } else if (score >= 50 && upside >= 30) {
          verdict = "BUY (DEEP VALUE)";
          color = "text-emerald-300";
          bg = "bg-emerald-500/10 border-emerald-500/30";
          summary = `Deep Value Play. Quality is mixed (${score}/100), but the market has overly punished the stock, offering ${upside.toFixed(1)}% upside. Watch risks closely.`;
      } else if (score >= 80 && upside < 0) {
          verdict = "HOLD (QUALITY PREM)";
          color = "text-blue-300";
          bg = "bg-blue-500/10 border-blue-500/30";
          summary = `Wonderful business (${score}/100) at a fair-to-expensive price. Do not sell, but wait for a pullback before adding.`;
      } else if (score < 50 && upside < 0) {
          verdict = "SELL / AVOID";
          color = "text-rose-400";
          bg = "bg-rose-500/10 border-rose-500/30";
          summary = `Value Trap Risk. Low quality score (${score}/100) combined with overvaluation relative to growth prospects.`;
      } else {
          verdict = "HOLD / WATCH";
          color = "text-yellow-400";
          summary = `Mixed picture. Quality (${score}/100) and Valuation (${upside.toFixed(1)}% upside) do not yet align for a high-conviction entry.`;
      }

      // Append Thesis based on Green Flags
      const greenFlags = [];
      if (ratings.businessModel === 'Green') greenFlags.push("a robust business model");
      if (ratings.moatAnalysis === 'Green') greenFlags.push("a durable moat");
      if (ratings.financialHealth === 'Green') greenFlags.push("pristine financials");
      
      let thesisAddon = "";
      if (greenFlags.length > 0) {
          thesisAddon = ` Our bullish view is underpinned by ${greenFlags.join(", ")}.`;
      } else if (score < 40) {
          thesisAddon = " Caution is advised due to multiple structural weaknesses identified in the checklist.";
      }

      return { 
          dynamicVerdict: verdict, 
          dynamicSummary: summary + thesisAddon, 
          verdictColor: color,
          verdictBg: bg
      };

  }, [qualityScore, valuationData.upside, ratings]);


  if (!report) return null;

  // Helper to determine if we are in "Growth Mode" (Phases 1-3)
  const isGrowthMode = ["Startup", "Hypergrowth", "Self-Funding"].includes(selectedPhase);

  const handleRatingChange = (section: string, rating: RatingColor) => {
    setRatings(prev => ({ ...prev, [section]: rating }));
  };

  const handlePrint = () => {
    window.print();
  };

  // --- SVG CONFIG ---
  // Circle config to prevent glitches
  const radius = 40;
  const circumference = 2 * Math.PI * radius; // ~251.3
  const strokeDashoffset = circumference - (circumference * qualityScore) / 100;

  // Confidence Config
  const confidence = report.confidenceScore || 75;
  let confidenceColor = "text-emerald-400";
  if (confidence < 50) confidenceColor = "text-rose-400";
  else if (confidence < 75) confidenceColor = "text-yellow-400";


  // --- RENDER HELPERS ---
  const RatingToggle = ({ section, current }: { section: string, current: RatingColor }) => (
    <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 gap-1 print:hidden">
      <button 
        onClick={() => handleRatingChange(section, 'Red')}
        className={`w-6 h-6 rounded-md transition-all border-2 ${current === 'Red' ? 'bg-rose-500/20 border-rose-500 shadow-lg shadow-rose-900/50' : 'border-transparent hover:bg-gray-800'}`}
      >
        <div className={`w-2 h-2 rounded-full mx-auto ${current === 'Red' ? 'bg-rose-500' : 'bg-rose-900'}`} />
      </button>
      <button 
        onClick={() => handleRatingChange(section, 'Yellow')}
        className={`w-6 h-6 rounded-md transition-all border-2 ${current === 'Yellow' ? 'bg-yellow-500/20 border-yellow-500 shadow-lg shadow-yellow-900/50' : 'border-transparent hover:bg-gray-800'}`}
      >
        <div className={`w-2 h-2 rounded-full mx-auto ${current === 'Yellow' ? 'bg-yellow-500' : 'bg-yellow-900'}`} />
      </button>
      <button 
        onClick={() => handleRatingChange(section, 'Green')}
        className={`w-6 h-6 rounded-md transition-all border-2 ${current === 'Green' ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-900/50' : 'border-transparent hover:bg-gray-800'}`}
      >
        <div className={`w-2 h-2 rounded-full mx-auto ${current === 'Green' ? 'bg-emerald-500' : 'bg-emerald-900'}`} />
      </button>
    </div>
  );

  const SentimentBadge = ({ type, value }: { type: string, value: SentimentType }) => {
      let color = "text-gray-400";
      let bg = "bg-gray-800";
      let icon = <Activity className="w-4 h-4" />;
      
      if (value === 'Bullish') {
          color = "text-emerald-400 print:text-emerald-700";
          bg = "bg-emerald-900/20 border-emerald-800 print:bg-emerald-50 print:border-emerald-200";
          icon = <TrendingUp className="w-4 h-4" />;
      } else if (value === 'Bearish') {
          color = "text-rose-400 print:text-rose-700";
          bg = "bg-rose-900/20 border-rose-800 print:bg-rose-50 print:border-rose-200";
          icon = <TrendingUp className="w-4 h-4 transform rotate-180" />;
      } else {
          color = "text-yellow-400 print:text-yellow-700";
          bg = "bg-yellow-900/20 border-yellow-800 print:bg-yellow-50 print:border-yellow-200";
          icon = <Activity className="w-4 h-4" />;
      }

      return (
          <div className={`flex flex-col items-center justify-center p-3 rounded-lg border ${bg} w-full`}>
              <div className={`text-xs uppercase tracking-wider font-bold mb-1 text-gray-400 print:text-gray-600`}>{type}</div>
              <div className={`flex items-center gap-1 font-bold ${color}`}>
                  {icon}
                  {value}
              </div>
          </div>
      );
  };

  const renderSectionHeader = (title: string, sectionKey: string, icon: React.ReactNode, confidence?: ConfidenceLevel) => {
    const currentRating = ratings[sectionKey] || 'Yellow';
    
    // Explicit "Conviction" Text based on rating
    let convictionText = "Medium Conviction";
    let convictionColor = "text-yellow-400";
    if (currentRating === 'Green') {
        convictionText = "High Conviction";
        convictionColor = "text-emerald-400";
    } else if (currentRating === 'Red') {
        convictionText = "Low Conviction";
        convictionColor = "text-rose-400";
    }

    // AI Data Confidence Color
    let aiConfColor = "text-gray-400";
    if (confidence === 'High') aiConfColor = "text-emerald-400";
    if (confidence === 'Medium') aiConfColor = "text-yellow-400";
    if (confidence === 'Low') aiConfColor = "text-rose-400";

    return (
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700 break-inside-avoid">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gray-900 border border-gray-700 print:border-gray-300 print:bg-white ${currentRating === 'Green' ? 'text-emerald-400 print:text-emerald-700' : currentRating === 'Yellow' ? 'text-yellow-400 print:text-yellow-700' : 'text-rose-400 print:text-rose-700'}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wide print:text-black">{title}</h3>
            {/* Analyst Conviction */}
            <div className="flex items-center gap-3">
                <span className={`text-xs font-bold uppercase tracking-widest ${convictionColor} print:text-black`}>
                    {convictionText}
                </span>
                {/* AI Data Confidence Badge */}
                {confidence && (
                    <span className={`text-[10px] flex items-center gap-1 font-mono border border-gray-700 bg-gray-900/50 px-1.5 py-0.5 rounded ${aiConfColor} print:hidden`}>
                        <Eye className="w-3 h-3" />
                        AI Confidence: {confidence}
                    </span>
                )}
            </div>
          </div>
        </div>
        <RatingToggle section={sectionKey} current={currentRating} />
        {/* Print Only Rating Display */}
        <div className="hidden print:block font-bold text-sm uppercase border px-2 py-1 rounded">
             {currentRating}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn printable-container">
      <style>
        {`
          @media print {
            /* Reset body for printing */
            body {
                margin: 0;
                padding: 0;
                background-color: white !important;
                color: black !important;
                overflow: visible !important;
                height: auto !important;
            }

            /* Hide everything in the body by default */
            body > * {
                visibility: hidden;
                height: 0; 
                overflow: hidden;
            }

            /* Make the printable container visible and position it */
            .printable-container {
                visibility: visible !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: auto !important;
                overflow: visible !important;
                z-index: 9999;
                background-color: white !important;
                padding: 20px;
                margin: 0;
            }

            /* Ensure children of printable are visible */
            .printable-container * {
                visibility: visible !important;
                height: auto;
            }
            
            /* Hide UI elements explicitly */
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
            
            /* Text Color overrides for print readability */
            .text-white, .text-gray-300, .text-gray-400, .text-gray-200 {
                color: black !important;
            }
            
            /* Border and Background overrides */
            .border-gray-700, .border-gray-800 {
                border-color: #d1d5db !important; /* gray-300 */
            }
            .bg-gray-800, .bg-gray-900, .bg-gray-900\\/50, .bg-gray-900\\/30 {
                background-color: transparent !important;
                border: 1px solid #d1d5db !important;
            }
            
            /* Force background graphics for charts/colored badges */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            /* Remove shadows */
            .shadow-lg, .shadow-xl, .shadow-2xl {
                box-shadow: none !important;
            }
            
            /* Page Break Handling */
            .break-inside-avoid {
                break-inside: avoid;
            }
          }
        `}
      </style>

      {/* --- EXECUTIVE SUMMARY HEADER (Unified) --- */}
      <div id="printable-report" className="space-y-8">
        <div className="flex justify-between items-center print:border-b print:pb-4 print:mb-8">
            <h1 className="text-3xl font-bold hidden print:block text-black">Equity Research Report: {stockData.ticker}</h1>
            <div className="hidden print:block text-right">
                <p className="text-sm text-gray-500">Generated by Reverse DCF Pro</p>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
            </div>
        </div>

        {/* Dynamic Analyst Verdict Banner */}
        <div className={`bg-gray-800 rounded-xl border border-gray-700 shadow-2xl relative overflow-hidden print:bg-white print:border-2 print:border-black print:shadow-none ${verdictBg} transition-colors duration-500`}>
            {/* Background Gradient Bar */}
            <div className={`absolute top-0 left-0 w-full h-1 ${qualityScore >= 80 ? 'bg-emerald-500' : qualityScore >= 50 ? 'bg-yellow-500' : 'bg-rose-500'}`} />

            <div className="flex flex-col md:flex-row">
                {/* Left: Quality Score */}
                <div className="p-8 md:w-1/3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-700/50 bg-gray-900/30 print:bg-white print:border-gray-200">
                    <div className="relative mb-3 w-24 h-24">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Track */}
                            <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-700 print:text-gray-200" />
                            {/* Indicator */}
                            <circle cx="50" cy="50" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" 
                                className={`${qualityScore >= 80 ? 'text-emerald-500' : qualityScore >= 50 ? 'text-yellow-500' : 'text-rose-500'} transition-all duration-500`}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <span className="text-3xl font-black text-white print:text-black">{qualityScore.toFixed(0)}</span>
                        </div>
                    </div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center print:text-gray-600">Quality Score</h3>
                </div>

                {/* Right: Dynamic Verdict & Thesis */}
                <div className="p-8 md:w-2/3 relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 print:hidden">
                        <Brain className="w-24 h-24 text-white" />
                    </div>
                    <div className="flex justify-between items-start">
                         <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-900/30 text-blue-400 border border-blue-800/50 print:bg-blue-100 print:text-blue-800 print:border-blue-200">ANALYST VERDICT</span>
                            </div>
                            <h2 className={`text-4xl font-black mb-2 ${verdictColor} print:text-black`}>{dynamicVerdict}</h2>
                         </div>
                         <div className="print:hidden">
                            <button onClick={handlePrint} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors border border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-700">
                                <Printer className="w-4 h-4" /> Print / Save PDF
                            </button>
                         </div>
                    </div>
                    
                    <p className="text-sm text-gray-300 leading-relaxed italic mb-4 print:text-gray-800 print:not-italic font-serif">
                        "{dynamicSummary}"
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-gray-700/50 pt-3 print:border-gray-200">
                         <div className="flex items-center gap-2 text-xs text-gray-500 print:hidden">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>Verdict updates automatically based on your checklist inputs below.</span>
                        </div>
                        
                        {/* Confidence Score Display */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">AI Confidence:</span>
                            <div className={`flex items-center gap-1 text-sm font-bold ${confidenceColor}`}>
                                {confidence >= 80 ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                {confidence}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* RECENT DEVELOPMENTS & SENTIMENT (Grid Adjusted for better spacing) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sentiment Column (Takes half width now for better breathing room) */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg print:bg-white print:border print:border-gray-300 print:shadow-none break-inside-avoid">
                 <div className="flex items-center gap-2 mb-4">
                    <Gauge className="w-5 h-5 text-purple-400 print:text-purple-700" />
                    <h3 className="text-lg font-bold text-white print:text-black">Sentiment</h3>
                </div>
                {stockData.sentiment ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                             <SentimentBadge type="Market" value={stockData.sentiment.market} />
                             <SentimentBadge type="Analysts" value={stockData.sentiment.analysts} />
                             <SentimentBadge type="Media" value={stockData.sentiment.media} />
                        </div>
                        <div className="p-3 bg-purple-900/10 border border-purple-900/30 rounded-lg print:bg-purple-50 print:border-purple-200">
                            <h4 className="text-xs font-bold text-purple-400 mb-1 uppercase tracking-wide print:text-purple-700">Sentiment Summary</h4>
                            <p className="text-xs text-gray-300 leading-relaxed print:text-gray-700">
                                {stockData.sentiment.summary}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">Sentiment analysis unavailable.</p>
                )}
            </div>

            {/* News Column (Takes half width to be less dominant) */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg print:bg-white print:border print:border-gray-300 print:shadow-none break-inside-avoid">
                <div className="flex items-center gap-2 mb-4">
                    <Newspaper className="w-5 h-5 text-blue-400 print:text-blue-700" />
                    <h3 className="text-lg font-bold text-white print:text-black">Recent Developments</h3>
                </div>
                {stockData.news && stockData.news.length > 0 ? (
                    <div className="space-y-3">
                        {/* Limiting visual height/items for compactness as requested */}
                        {stockData.news.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50 print:bg-gray-50 print:border-gray-200">
                                <span className="text-[10px] text-gray-500 block mb-1">{item.date}</span>
                                <h4 className="text-xs font-bold text-gray-200 mb-1 line-clamp-1 print:text-black" title={item.headline}>{item.headline}</h4>
                                <p className="text-[10px] text-gray-400 line-clamp-2 print:text-gray-700">{item.summary}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No recent news available.</p>
                )}
            </div>
        </div>

        {/* Step 1: Business Phase Selector */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-xl relative overflow-visible z-10 print:bg-white print:border print:border-gray-300 print:shadow-none break-inside-avoid">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 print:text-blue-700">Step 1: Context</h4>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2 print:text-black">Business Cycle Phase</h2>
                    <p className="text-gray-400 text-sm max-w-xl print:text-gray-700">
                        Categorized as: <span className="font-bold text-white print:text-black">{selectedPhase}</span>
                    </p>
                </div>
                
                {/* Phase Dropdown (Hidden in Print, Text shown above) */}
                <div className="relative group min-w-[200px] print:hidden">
                    <button className="w-full flex items-center justify-between bg-gray-900 border border-gray-700 hover:border-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg">
                        {selectedPhase}
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden hidden group-hover:block z-50">
                        {PHASES.map((p) => (
                            <button 
                                key={p}
                                onClick={() => setSelectedPhase(p)}
                                className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-800 transition-colors ${selectedPhase === p ? 'text-blue-400 font-bold bg-gray-800' : 'text-gray-300'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 text-sm text-gray-300 italic print:bg-gray-50 print:text-gray-800 print:border-gray-200">
                <span className="text-blue-400 font-bold not-italic mr-2 print:text-blue-700">Analyst Note:</span>
                {report.businessPhase.description}
            </div>
        </div>

        {/* Checklist Grid - SINGLE COLUMN FOR QUANTITATIVE DETAIL */}
        <div className="grid grid-cols-1 gap-6">
            {/* Step 2: Business Analysis */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg print:bg-white print:border-gray-300 print:shadow-none break-inside-avoid">
            {renderSectionHeader('Business Analysis', 'businessModel', <Target className="w-5 h-5" />, report.businessModel.confidence)}
            <p className="text-gray-300 text-base mb-4 leading-relaxed print:text-gray-800 font-medium">{report.businessModel.summary}</p>
            <div className="space-y-4">
                <div>
                    <span className="text-xs text-gray-500 font-semibold uppercase">Revenue Segments</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                    {report.businessModel.segments.map((seg, i) => (
                        <span key={i} className="bg-gray-900 text-gray-300 px-3 py-1.5 rounded text-sm border border-gray-700 print:bg-gray-100 print:text-gray-800 print:border-gray-300">{seg}</span>
                    ))}
                    </div>
                </div>
                {report.businessModel.details.length > 0 && (
                    <ul className="text-sm space-y-2 text-gray-400 list-disc list-inside print:text-gray-700 pl-2">
                        {report.businessModel.details.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                )}
            </div>
            </div>

            {/* Step 3: Moat Analysis */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg print:bg-white print:border-gray-300 print:shadow-none break-inside-avoid">
            {renderSectionHeader('Moat Analysis', 'moatAnalysis', <Shield className="w-5 h-5" />, report.moatAnalysis.confidence)}
            <div className="flex gap-4 mb-4 max-w-lg">
                <div className="bg-gray-900 rounded p-2 flex-1 text-center border border-gray-700 print:bg-gray-50 print:border-gray-200">
                    <span className="text-xs text-gray-500 block">Width</span>
                    <span className="font-bold text-white print:text-black">{report.moatAnalysis.width}</span>
                </div>
                <div className="bg-gray-900 rounded p-2 flex-1 text-center border border-gray-700 print:bg-gray-50 print:border-gray-200">
                    <span className="text-xs text-gray-500 block">Trend</span>
                    <span className={`font-bold ${report.moatAnalysis.trend === 'Widening' ? 'text-emerald-400 print:text-emerald-700' : report.moatAnalysis.trend === 'Shrinking' ? 'text-rose-400 print:text-rose-700' : 'text-blue-400 print:text-blue-700'}`}>
                        {report.moatAnalysis.trend}
                    </span>
                </div>
            </div>
            <p className="text-gray-300 text-base mb-4 leading-relaxed print:text-gray-800 font-medium">{report.moatAnalysis.summary}</p>
            <div>
                <span className="text-xs text-gray-500 font-semibold uppercase">Moat Sources</span>
                <div className="flex flex-wrap gap-2 mt-1">
                    {report.moatAnalysis.sources.map((s, i) => (
                    <span key={i} className="bg-blue-900/30 text-blue-300 px-3 py-1.5 rounded text-sm border border-blue-800/50 print:bg-blue-50 print:text-blue-800 print:border-blue-200">{s}</span>
                    ))}
                </div>
            </div>
            </div>

            {/* Step 4: Growth Analysis */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg print:bg-white print:border-gray-300 print:shadow-none break-inside-avoid">
            {renderSectionHeader('Growth Potential', 'growthAnalysis', <Zap className="w-5 h-5" />, report.growthAnalysis.confidence)}
            <p className="text-gray-300 text-base mb-4 leading-relaxed print:text-gray-800 font-medium">{report.growthAnalysis.summary}</p>
            <div>
                <span className="text-xs text-gray-500 font-semibold uppercase">Primary Growth Drivers</span>
                <ul className="mt-2 space-y-2">
                    {report.growthAnalysis.drivers.map((driver, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400 print:text-gray-700">
                            <span className="text-emerald-500 mt-1 print:text-emerald-700">▹</span> {driver}
                        </li>
                    ))}
                </ul>
            </div>
            </div>

            {/* Step 5: Risks Analysis */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg print:bg-white print:border-gray-300 print:shadow-none break-inside-avoid">
            {renderSectionHeader('Key Risks', 'riskAnalysis', <AlertTriangle className="w-5 h-5" />, report.riskAnalysis.confidence)}
            <p className="text-gray-300 text-base mb-4 leading-relaxed print:text-gray-800 font-medium">{report.riskAnalysis.summary}</p>
            <div className="space-y-2">
                {report.riskAnalysis.mainRisks.map((risk, i) => (
                    <div key={i} className="bg-rose-900/10 border border-rose-900/30 rounded p-3 text-sm text-rose-200/80 flex items-start gap-2 print:bg-rose-50 print:text-rose-900 print:border-rose-200">
                        <span className="text-rose-500 font-bold print:text-rose-700">•</span>
                        {risk}
                    </div>
                ))}
            </div>
            </div>
        </div>

        {/* Step 6: Financial Health (Dynamic based on Phase) */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg print:bg-white print:border-gray-300 print:shadow-none break-inside-avoid">
            {renderSectionHeader('Financial Health', 'financialHealth', <TrendingUp className="w-5 h-5" />, report.financialHealth.confidence)}
            
            {/* Phase Specific Metrics Header */}
            <div className="mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 print:text-blue-700">
                    Key Metrics for {selectedPhase} Phase
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                {isGrowthMode ? (
                    // Growth Mode Metrics
                    <>
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center print:bg-gray-50 print:border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1">5y Revenue CAGR</span>
                            <span className="text-2xl font-bold text-white print:text-black">
                                {stockData.historical.revenueGrowth5y ? `${stockData.historical.revenueGrowth5y.toFixed(1)}%` : '-'}
                            </span>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center print:bg-gray-50 print:border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1">Gross Margin</span>
                            <span className="text-2xl font-bold text-white print:text-black">
                                {report.financialHealth.grossMargin ? `${report.financialHealth.grossMargin.toFixed(1)}%` : 'N/A'}
                            </span>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center print:bg-gray-50 print:border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1">Price / Sales</span>
                            <span className="text-2xl font-bold text-white print:text-black">
                                {stockData.ps ? `${stockData.ps.toFixed(1)}x` : 'N/A'}
                            </span>
                        </div>
                    </>
                ) : (
                    // Mature Mode Metrics
                    <>
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center print:bg-gray-50 print:border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1">ROIC</span>
                            <span className="text-2xl font-bold text-white print:text-black">
                                {report.financialHealth.roic ? `${report.financialHealth.roic.toFixed(1)}%` : 'N/A'}
                            </span>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center print:bg-gray-50 print:border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1">5y FCF Growth</span>
                            <span className="text-2xl font-bold text-white print:text-black">
                                {stockData.historical.fcfGrowth5y ? `${stockData.historical.fcfGrowth5y.toFixed(1)}%` : '-'}
                            </span>
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 text-center print:bg-gray-50 print:border-gray-200">
                            <span className="text-xs text-gray-500 block mb-1">Shareholder Yield</span>
                            <span className="text-xs font-mono text-gray-400">(Div + Buyback)</span>
                            <span className="text-xl font-bold text-white block mt-1 print:text-black">Check Manual</span> 
                        </div>
                    </>
                )}
            </div>
            <p className="text-gray-300 text-base border-t border-gray-700 pt-4 leading-relaxed print:text-gray-800 print:border-gray-200">{report.financialHealth.summary}</p>
        </div>

        {/* Step 7: Valuation (Scenario Analysis) */}
        <div className="border-t-2 border-gray-700 pt-8 mt-8 print:border-gray-300 break-inside-avoid">
            {/* Pass the calculated Quality Score and Phase to Scenarios */}
            <ScenarioAnalysis 
            stockData={stockData} 
            metricType={metricType} 
            baseParams={baseParams} 
            businessPhase={selectedPhase}
            onValuationChange={setValuationData} // LIFTING UP STATE
            aiVerdict={{
                rating: dynamicVerdict as any,
                summary: dynamicSummary
            }}
            />
        </div>
      </div>
    </div>
  );
};
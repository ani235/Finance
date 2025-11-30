export interface HistoricalData {
  revenueGrowth5y: number | null;
  revenueGrowth3y: number | null;
  revenueGrowth1y: number | null;
  epsGrowth5y: number | null;
  epsGrowth3y: number | null;
  epsGrowth1y: number | null;
  fcfGrowth5y: number | null;
  fcfGrowth3y: number | null;
  fcfGrowth1y: number | null;
  avgPe5y: number | null;
  avgPcf5y: number | null;
  avgPs5y: number | null;
}

export type BusinessPhase = 
  | "Startup" 
  | "Hypergrowth" 
  | "Self-Funding" 
  | "Operating Leverage" 
  | "Capital Return" 
  | "Decline";

export type RatingColor = 'Red' | 'Yellow' | 'Green';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type SentimentType = 'Bullish' | 'Neutral' | 'Bearish';

export interface AnalysisStep {
  rating: RatingColor;
  confidence: ConfidenceLevel; // Added for per-section AI confidence
  userRating?: RatingColor; 
  summary: string;
  details: string[];
}

export interface SimplifierReport {
  confidenceScore: number; // Global score 0 to 100
  businessPhase: {
    phase: string;
    description: string;
  };
  businessModel: AnalysisStep & {
    segments: string[];
  };
  moatAnalysis: AnalysisStep & {
    width: 'None' | 'Narrow' | 'Wide';
    trend: 'Shrinking' | 'Stable' | 'Widening';
    sources: string[];
  };
  growthAnalysis: AnalysisStep & {
    drivers: string[];
  };
  financialHealth: AnalysisStep & {
    roic: number | null;
    grossMargin: number | null;
  };
  riskAnalysis: AnalysisStep & {
    mainRisks: string[];
  };
  verdict: {
    rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell';
    summary: string;
  };
}

export interface NewsItem {
  date: string;
  headline: string;
  summary: string;
}

export interface SentimentAnalysis {
  market: SentimentType;
  analysts: SentimentType;
  media: SentimentType;
  summary: string;
}

export interface PricePoint {
  year: string;
  price: number;
}

export interface ValuationPoint {
  year: string;
  price: number;
  pe: number | null;
  pfcf: number | null;
  ps: number | null;
}

export interface StockData {
  ticker: string;
  companyName?: string;
  description?: string;
  price: number;
  eps: number;
  fcf: number; // Free Cash Flow per share
  ps: number; // Price to Sales Ratio
  growthRate: number; // Percentage (e.g., 15 for 15%)
  currency: string;
  historical: HistoricalData;
  stockPerformance?: {
    return1y: number;
    return3y: number;
    return5y: number;
  };
  priceHistory?: PricePoint[]; // Kept for backward compatibility if needed, but valuationHistory is preferred
  valuationHistory?: ValuationPoint[];
  news?: NewsItem[];
  sentiment?: SentimentAnalysis;
  report?: SimplifierReport;
}

export type TerminalMethod = 'multiple' | 'growth';
export type MetricType = 'EPS' | 'FCF';

export interface DCFParams {
  discountRate: number; // Percentage
  terminalMultiple: number;
  terminalGrowthRate: number; // Percentage, used if method is 'growth'
  terminalMethod: TerminalMethod;
  years: number;
  growthRate: number; // Percentage
}

export interface CalculationResult {
  intrinsicValue: number;
  impliedGrowthRate: number; // The reverse DCF result
  upside: number; // Percentage
  projectedCashFlows: number[];
  terminalValue: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Scenario {
  name: string;
  growthRate: number;
  terminalValueInput: number; // Can be Multiple or Growth Rate % depending on method
}
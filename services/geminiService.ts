import { GoogleGenAI } from "@google/genai";
import { StockData, GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function fetchStockData(ticker: string): Promise<{ data: StockData; sources: GroundingSource[] }> {
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Act as a senior equity research analyst. Conduct a comprehensive "Stock Simplifier" analysis for the ticker "${ticker}".
      
      I need 6 categories of data:
      1. Current Financials (Price, EPS, FCF, P/S, Consensus Growth).
      2. Historical Growth & Valuation (CAGR for Revenue, EPS, FCF AND Historical Valuation Multiples).
      3. Stock Performance & Valuation History (10-year price and year-end valuation multiples).
      4. Recent Major News (Top 3 events/headlines).
      5. Sentiment Analysis (Market vs Analyst vs Media).
      6. Qualitative "Stock Simplifier" Report (Business Phase, Moat, Risks, etc.) with high quantitative density.

      Data Requirements:
      - **Price**: Current market price.
      - **EPS**: Trailing Twelve Month.
      - **FCF**: Trailing Twelve Month Free Cash Flow per share.
      - **P/S**: Current Price-to-Sales Ratio (TTM).
      - **Growth Rate**: Estimated annual earnings growth for next 5 years (analyst consensus).
      - **ROIC**: Return on Invested Capital (TTM).
      - **Gross Margin**: TTM %.

      Historical Data Requirements:
      - Growth Rates: 5y, 3y, 1y for Revenue, EPS, and FCF.
      - **Valuation Multiples**: 5-Year Average P/E Ratio, 5-Year Average Price/FCF Ratio, and 5-Year Average Price/Sales Ratio.

      Stock Chart & Valuation History Requirements:
      - **Performance**: Total Return % for 1-Year, 3-Year, and 5-Year periods.
      - **Valuation History**: Array for the last 10 years (e.g., 2014... 2024) containing:
         - Year-end closing price.
         - P/E Ratio at year-end.
         - Price/FCF Ratio at year-end.
         - Price/Sales Ratio at year-end.
      
      *If 10 years of data is not fully available (e.g. IPO was recent), return as many years as possible.*

      News Requirements:
      - Top 3 most important news headlines or events for this stock in the last 6 months.

      Sentiment Analysis Requirements:
      - **Market**: Based on recent price action/momentum (Bullish/Neutral/Bearish).
      - **Analysts**: Based on ratings/targets (Bullish/Neutral/Bearish).
      - **Media**: Based on headline tone (Bullish/Neutral/Bearish).
      - **Summary**: A brief sentence explaining the divergence or consensus.

      Qualitative Analysis Requirements (Evaluate rigorously with **NUMBERS**):
      **CRITICAL**: Include specific numbers (margins, market share %, growth rates, segment revenue) in your summaries and details.
      
      1. **Global Confidence Score**: Provide a score (0-100) on how confident you are in this analysis based on the availability and reliability of data.
      2. **Business Phase**: Strictly categorize into ONE of these 6 phases: "Startup", "Hypergrowth", "Self-Funding", "Operating Leverage", "Capital Return", "Decline".
      3. **BusinessModel**: Revenue segments with % breakdown. Recurring revenue %? Pricing power?
      4. **Moat**: Width (None/Narrow/Wide) and Trend (Shrinking/Stable/Widening). Sources.
      5. **Growth**: Where will future growth come from? Specific TAM numbers or growth targets.
      6. **Risks**: Concentration %, Competition names, specific macro headwinds.
      7. **Financial Health**: Net Debt/EBITDA, Interest Coverage, specific margin trends.
      8. **Verdict**: Your overall rating (Strong Buy/Buy/Hold/Sell) and summary.

      **RATINGS & CONFIDENCE**:
      For EACH qualitative section (BusinessModel, Moat, Growth, FinancialHealth, Risks), you must provide:
      - \`rating\`: "Red", "Yellow", or "Green" (Based on quality/execution risk).
      - \`confidence\`: "High", "Medium", or "Low" (Based on how much data you found to support this specific section).
      
      Return the data strictly as a JSON object inside a markdown code block.
      
      JSON Structure:
      \`\`\`json
      {
        "ticker": "string",
        "price": number,
        "eps": number,
        "fcf": number,
        "ps": number,
        "growthRate": number,
        "currency": "string",
        "historical": {
            "revenueGrowth5y": number | null,
            "revenueGrowth3y": number | null,
            "revenueGrowth1y": number | null,
            "epsGrowth5y": number | null,
            "epsGrowth3y": number | null,
            "epsGrowth1y": number | null,
            "fcfGrowth5y": number | null,
            "fcfGrowth3y": number | null,
            "fcfGrowth1y": number | null,
            "avgPe5y": number | null,
            "avgPcf5y": number | null,
            "avgPs5y": number | null
        },
        "stockPerformance": {
            "return1y": number,
            "return3y": number,
            "return5y": number
        },
        "valuationHistory": [
            { "year": "string", "price": number, "pe": number | null, "pfcf": number | null, "ps": number | null }
        ],
        "news": [
            { "date": "string", "headline": "string", "summary": "string" }
        ],
        "sentiment": {
            "market": "Bullish/Neutral/Bearish",
            "analysts": "Bullish/Neutral/Bearish",
            "media": "Bullish/Neutral/Bearish",
            "summary": "string"
        },
        "report": {
            "confidenceScore": number,
            "businessPhase": { "phase": "string", "description": "string" },
            "businessModel": { "rating": "Red/Yellow/Green", "confidence": "High/Medium/Low", "summary": "string", "details": ["string"], "segments": ["string"] },
            "moatAnalysis": { "rating": "Red/Yellow/Green", "confidence": "High/Medium/Low", "summary": "string", "details": ["string"], "width": "None/Narrow/Wide", "trend": "Shrinking/Stable/Widening", "sources": ["string"] },
            "growthAnalysis": { "rating": "Red/Yellow/Green", "confidence": "High/Medium/Low", "summary": "string", "details": ["string"], "drivers": ["string"] },
            "financialHealth": { "rating": "Red/Yellow/Green", "confidence": "High/Medium/Low", "summary": "string", "details": ["string"], "roic": number | null, "grossMargin": number | null },
            "riskAnalysis": { "rating": "Red/Yellow/Green", "confidence": "High/Medium/Low", "summary": "string", "details": ["string"], "mainRisks": ["string"] },
            "verdict": { "rating": "Strong Buy/Buy/Hold/Sell", "summary": "string" }
        }
      }
      \`\`\`
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    
    // Extract Sources
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach((chunk) => {
      if (chunk.web?.uri && chunk.web?.title) {
        sources.push({
          title: chunk.web.title,
          uri: chunk.web.uri,
        });
      }
    });

    // Extract JSON from Markdown code block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error("Failed to parse financial data from AI response.");
    }

    const jsonString = jsonMatch[1];
    const parsedData = JSON.parse(jsonString);

    // Process Valuation History to ensure it is sorted ASCENDING (Oldest -> Newest) for correct Charting
    const rawValuationHistory = parsedData.valuationHistory || parsedData.priceHistory || [];
    const sortedValuationHistory = rawValuationHistory
        .map((p: any) => ({
            year: p.year,
            price: Number(p.price),
            pe: p.pe ? Number(p.pe) : null,
            pfcf: p.pfcf ? Number(p.pfcf) : null,
            ps: p.ps ? Number(p.ps) : null
        }))
        .sort((a: any, b: any) => parseInt(a.year) - parseInt(b.year));

    return {
      data: {
        ticker: parsedData.ticker || ticker.toUpperCase(),
        price: Number(parsedData.price),
        eps: Number(parsedData.eps),
        fcf: Number(parsedData.fcf),
        ps: Number(parsedData.ps || 0),
        growthRate: Number(parsedData.growthRate),
        currency: parsedData.currency || "USD",
        historical: {
            revenueGrowth5y: parsedData.historical?.revenueGrowth5y ?? null,
            revenueGrowth3y: parsedData.historical?.revenueGrowth3y ?? null,
            revenueGrowth1y: parsedData.historical?.revenueGrowth1y ?? null,
            epsGrowth5y: parsedData.historical?.epsGrowth5y ?? null,
            epsGrowth3y: parsedData.historical?.epsGrowth3y ?? null,
            epsGrowth1y: parsedData.historical?.epsGrowth1y ?? null,
            fcfGrowth5y: parsedData.historical?.fcfGrowth5y ?? null,
            fcfGrowth3y: parsedData.historical?.fcfGrowth3y ?? null,
            fcfGrowth1y: parsedData.historical?.fcfGrowth1y ?? null,
            avgPe5y: parsedData.historical?.avgPe5y ?? null,
            avgPcf5y: parsedData.historical?.avgPcf5y ?? null,
            avgPs5y: parsedData.historical?.avgPs5y ?? null,
        },
        stockPerformance: parsedData.stockPerformance,
        valuationHistory: sortedValuationHistory,
        news: parsedData.news || [],
        sentiment: parsedData.sentiment,
        report: parsedData.report
      },
      sources,
    };

  } catch (error) {
    console.error("Error fetching stock data:", error);
    throw new Error("Could not retrieve stock data. Please check the ticker or try again.");
  }
}
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ValuationPoint } from '../types';

interface StockChartProps {
  data: ValuationPoint[];
  ticker: string;
  defaultMetric?: 'Price' | 'PE' | 'PFCF' | 'PS';
}

export const StockChart: React.FC<StockChartProps> = ({ data, ticker, defaultMetric = 'Price' }) => {
  const [metric, setMetric] = useState<'Price' | 'PE' | 'PFCF' | 'PS'>(defaultMetric);
  const [yearsToShow, setYearsToShow] = useState<number>(10);

  // Initialize yearsToShow
  useEffect(() => {
    if (data && data.length > 0) {
        setYearsToShow(data.length);
    }
  }, [data]);

  // Sort data ascending (Old -> New) to ensure chart flows Left -> Right
  const sortedData = useMemo(() => {
     if (!data) return [];
     return [...data].sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [data]);

  // Slice data based on slider (Take the last N years)
  const visibleData = sortedData.slice(-yearsToShow);

  if (!data || data.length === 0) {
    return (
        <div className="h-[200px] w-full flex items-center justify-center text-gray-500 text-xs border border-gray-700 rounded-lg bg-gray-900/50">
            No chart data available
        </div>
    );
  }

  // Determine color and label based on metric
  let color = "#10b981"; // Emerald for Price
  let label = "Price";
  let dataKey = "price";
  let prefix = "$";

  if (metric === 'PE') {
    color = "#3b82f6"; // Blue
    label = "P/E Ratio";
    dataKey = "pe";
    prefix = "";
  } else if (metric === 'PFCF') {
    color = "#8b5cf6"; // Purple
    label = "P/FCF Ratio";
    dataKey = "pfcf";
    prefix = "";
  } else if (metric === 'PS') {
    color = "#f59e0b"; // Amber
    label = "P/S Ratio";
    dataKey = "ps";
    prefix = "";
  }

  return (
    <div className="w-full flex flex-col gap-2"> 
      
      {/* Controls Row: Toggles and Slider compact */}
      <div className="flex flex-wrap justify-between items-center gap-2 bg-gray-900/50 p-1.5 rounded-lg border border-gray-700/50">
          
          {/* Metric Toggles */}
          <div className="flex gap-0.5">
            <button 
                onClick={() => setMetric('Price')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${metric === 'Price' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
                Price
            </button>
            <button 
                onClick={() => setMetric('PE')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${metric === 'PE' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
                P/E
            </button>
            <button 
                onClick={() => setMetric('PFCF')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${metric === 'PFCF' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
                P/FCF
            </button>
            <button 
                onClick={() => setMetric('PS')}
                className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${metric === 'PS' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
                P/S
            </button>
          </div>

          {/* History Slider */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[9px] text-gray-400 whitespace-nowrap">{yearsToShow}Y</span>
            <input 
                type="range"
                min="3"
                max={Math.max(data.length, 5)} 
                step="1"
                value={yearsToShow}
                onChange={(e) => setYearsToShow(parseInt(e.target.value))}
                className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
      </div>

      {/* Chart Area - Reduced Height */}
      <div className="w-full h-[180px] bg-gray-900/30 rounded-lg border border-gray-700/30 overflow-hidden relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visibleData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`color${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="year" 
              stroke="#6b7280" 
              fontSize={9} 
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              tickMargin={2}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={9} 
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              width={35}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '4px' }}
              itemStyle={{ color: color, fontSize: '11px' }}
              labelStyle={{ color: '#9ca3af', fontSize: '9px', marginBottom: '1px' }}
              formatter={(value: any) => [value ? `${prefix}${value}` : 'N/A', label]}
            />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2} 
              fillOpacity={1} 
              fill={`url(#color${metric})`}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
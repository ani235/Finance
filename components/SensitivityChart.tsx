import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { DCFParams } from '../types';
import { calculateIntrinsicValue } from '../utils/dcfLogic';

interface SensitivityChartProps {
  eps: number;
  currentParams: DCFParams;
  currentPrice: number;
}

export const SensitivityChart: React.FC<SensitivityChartProps> = ({
  eps,
  currentParams,
  currentPrice,
}) => {
  // Generate data points around the current growth rate
  const data = [];
  const startGrowth = Math.max(-10, Math.floor(currentParams.growthRate - 10));
  const endGrowth = Math.ceil(currentParams.growthRate + 10);

  for (let g = startGrowth; g <= endGrowth; g += 2) {
    const { value } = calculateIntrinsicValue(eps, {
      ...currentParams,
      growthRate: g,
    });
    data.push({
      growthRate: g,
      intrinsicValue: parseFloat(value.toFixed(2)),
    });
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="growthRate" 
            stroke="#9ca3af" 
            label={{ value: 'Growth Rate (%)', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 12 }}
            tick={{fontSize: 12}}
          />
          <YAxis 
            stroke="#9ca3af" 
            tick={{fontSize: 12}}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6' }}
            itemStyle={{ color: '#10b981' }}
            labelFormatter={(value) => `Growth: ${value}%`}
          />
          <ReferenceLine y={currentPrice} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Current Price', fill: '#ef4444', fontSize: 10 }} />
          <ReferenceLine x={currentParams.growthRate} stroke="#10b981" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="intrinsicValue" 
            stroke="#10b981" 
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
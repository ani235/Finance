import { DCFParams } from "../types";

export function calculateIntrinsicValue(
  baseValue: number,
  params: DCFParams
): { value: number; flows: number[]; tv: number } {
  const { discountRate, terminalMultiple, terminalGrowthRate, terminalMethod, years, growthRate } = params;
  const r = discountRate / 100;
  const g = growthRate / 100;
  const gTerm = terminalGrowthRate / 100;

  let currentValue = baseValue;
  let sumPv = 0;
  const flows: number[] = [];

  // 1. Calculate PV of projected cash flows/earnings
  for (let i = 1; i <= years; i++) {
    currentValue = currentValue * (1 + g);
    const pv = currentValue / Math.pow(1 + r, i);
    sumPv += pv;
    flows.push(currentValue);
  }

  // 2. Calculate Terminal Value
  let terminalValue = 0;

  if (terminalMethod === 'growth') {
    // Perpetuity Growth Method: TV = (Final Value * (1 + gTerm)) / (r - gTerm)
    // Note: r must be greater than gTerm for this formula to hold.
    if (r > gTerm) {
      terminalValue = (currentValue * (1 + gTerm)) / (r - gTerm);
    } else {
      // If discount rate <= terminal growth, value approaches infinity. 
      terminalValue = 0; 
    }
  } else {
    // Exit Multiple Method: TV = Final Year Value * Terminal Multiple
    terminalValue = currentValue * terminalMultiple;
  }

  const pvTerminalValue = terminalValue / Math.pow(1 + r, years);

  // 3. Total Intrinsic Value
  const totalValue = sumPv + pvTerminalValue;

  return { value: totalValue, flows, tv: terminalValue };
}

export function calculateImpliedGrowthRate(
  currentPrice: number,
  baseValue: number,
  params: Omit<DCFParams, "growthRate">
): number {
  // Binary search to find the growth rate that makes Intrinsic Value == Current Price
  let low = -0.50; // -50%
  let high = 1.00; // 100%
  let mid = 0;
  const tolerance = 0.01; // $0.01 precision
  const maxIterations = 100;

  for (let i = 0; i < maxIterations; i++) {
    mid = (low + high) / 2;
    const { value } = calculateIntrinsicValue(baseValue, { ...params, growthRate: mid * 100 });
    
    // Safety check for invalid terminal value calculation
    if (value === 0 && params.terminalMethod === 'growth' && (params.discountRate/100) <= (params.terminalGrowthRate/100)) {
       return 0; 
    }

    if (Math.abs(value - currentPrice) < tolerance) {
      return mid * 100;
    }

    if (value > currentPrice) {
      high = mid; // Needs less growth
    } else {
      low = mid; // Needs more growth
    }
  }

  return mid * 100;
}
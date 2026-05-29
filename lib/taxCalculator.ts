export interface TaxConfig {
  tax_name: string;
  effective_rate_percentage: number;
  deduction_type: 'standard' | 'itemized';
}

export interface TaxSummary {
  grossIncome: number;
  totalDeductible: number;
  taxableIncome: number;
  estimatedTaxOwed: number;
  effectiveRate: number;
  breakdown: { tax_name: string; amount: number }[];
}

export function calculateTaxSummary(
  grossIncome: number,
  deductibleExpenses: number,
  taxConfigs: TaxConfig[]
): TaxSummary {
  const taxableIncome = Math.max(0, grossIncome - deductibleExpenses);
  const breakdown = taxConfigs.map((cfg) => ({
    tax_name: cfg.tax_name,
    amount: parseFloat(((taxableIncome * cfg.effective_rate_percentage) / 100).toFixed(2)),
  }));
  const estimatedTaxOwed = breakdown.reduce((s, b) => s + b.amount, 0);
  const effectiveRate = grossIncome > 0 ? estimatedTaxOwed / grossIncome : 0;

  return {
    grossIncome,
    totalDeductible: deductibleExpenses,
    taxableIncome,
    estimatedTaxOwed,
    effectiveRate,
    breakdown,
  };
}

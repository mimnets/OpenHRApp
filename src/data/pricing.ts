// Single source of truth for public pricing. The Paddle catalog prices must match these.
export const PRICING = {
  currency: 'USD',
  monthly: 3,
  yearly: 24,
  refundDays: 14,
  adFreeTrialDays: 14,
  merchantOfRecord: 'Paddle.com',
} as const;

/** Yearly price as a monthly equivalent, e.g. "$2". */
export const yearlyPerMonth = () => `$${(PRICING.yearly / 12).toFixed(PRICING.yearly % 12 ? 2 : 0)}`;

export const PRODUCT_NAME = "FormChat";
export const PLANS = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    publishedForms: 1,
    submissions: 50,
    products: false,
    branding: false,
    csv: false,
    analytics: false,
  },
  business: {
    name: "Business",
    monthlyPrice: 9,
    yearlyPrice: 79,
    publishedForms: 10,
    submissions: 1000,
    products: true,
    branding: true,
    csv: true,
    analytics: true,
  },
} as const;
export const CURRENCIES = ["USD", "AED", "EUR", "GBP", "SAR"] as const;
export const QUESTION_TYPES = [
  "short text",
  "long text",
  "phone",
  "email",
  "date",
  "time",
  "number",
  "address",
  "single choice",
  "multiple choice",
  "dropdown",
  "yes/no",
  "rating",
  "url",
] as const;
export const PRESETS = ["#087f46", "#0b3b29", "#437820", "#25685b", "#4b692f"];

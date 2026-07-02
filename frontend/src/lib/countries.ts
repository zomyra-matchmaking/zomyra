export type Country = {
  name: string;
  code: string;
  dial: string;
  flag: string;
  length: number;
};

export const COUNTRIES: Country[] = [
  { name: "India", code: "IN", dial: "+91", flag: "🇮🇳", length: 10 },
  { name: "United States", code: "US", dial: "+1", flag: "🇺🇸", length: 10 },
  { name: "United Kingdom", code: "GB", dial: "+44", flag: "🇬🇧", length: 10 },
  { name: "Canada", code: "CA", dial: "+1", flag: "🇨🇦", length: 10 },
  { name: "Australia", code: "AU", dial: "+61", flag: "🇦🇺", length: 9 },
  { name: "United Arab Emirates", code: "AE", dial: "+971", flag: "🇦🇪", length: 9 },
  { name: "Singapore", code: "SG", dial: "+65", flag: "🇸🇬", length: 8 },
  { name: "Germany", code: "DE", dial: "+49", flag: "🇩🇪", length: 11 },
  { name: "France", code: "FR", dial: "+33", flag: "🇫🇷", length: 9 },
  { name: "Nepal", code: "NP", dial: "+977", flag: "🇳🇵", length: 10 },
  { name: "Bangladesh", code: "BD", dial: "+880", flag: "🇧🇩", length: 10 },
  { name: "Sri Lanka", code: "LK", dial: "+94", flag: "🇱🇰", length: 9 },
  { name: "Pakistan", code: "PK", dial: "+92", flag: "🇵🇰", length: 10 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

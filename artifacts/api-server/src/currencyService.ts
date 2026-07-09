// Multi-currency support for Event Perfekt
export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // Relative to USD
}

export const SUPPORTED_CURRENCIES: { [key: string]: CurrencyInfo } = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRate: 1.0
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    exchangeRate: 0.79 // Example rate
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    exchangeRate: 0.92 // Example rate
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira',
    exchangeRate: 750.0 // Example rate
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    exchangeRate: 1.35 // Example rate
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    exchangeRate: 1.52 // Example rate
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    exchangeRate: 18.5 // Example rate
  },
  KES: {
    code: 'KES',
    symbol: 'KSh',
    name: 'Kenyan Shilling',
    exchangeRate: 150.0 // Example rate
  },
  GHS: {
    code: 'GHS',
    symbol: '₵',
    name: 'Ghanaian Cedi',
    exchangeRate: 12.0 // Example rate
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    exchangeRate: 83.0 // Example rate
  }
};

export class CurrencyService {
  
  static getSupportedCurrencies(): CurrencyInfo[] {
    return Object.values(SUPPORTED_CURRENCIES);
  }
  
  static getCurrencyInfo(code: string): CurrencyInfo | null {
    return SUPPORTED_CURRENCIES[code.toUpperCase()] || null;
  }
  
  static formatAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencyInfo(currencyCode);
    if (!currency) {
      return `${amount.toLocaleString()}`;
    }
    
    // Format based on currency
    switch (currencyCode.toUpperCase()) {
      case 'NGN':
      case 'KES':
      case 'ZAR':
      case 'GHS':
      case 'INR':
        return `${currency.symbol}${amount.toLocaleString()}`;
      case 'USD':
      case 'CAD':
      case 'AUD':
        return `${currency.symbol}${amount.toLocaleString()}`;
      case 'GBP':
        return `${currency.symbol}${amount.toLocaleString()}`;
      case 'EUR':
        return `${currency.symbol}${amount.toLocaleString()}`;
      default:
        return `${currency.symbol}${amount.toLocaleString()}`;
    }
  }
  
  static convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
    const fromRate = this.getCurrencyInfo(fromCurrency)?.exchangeRate || 1;
    const toRate = this.getCurrencyInfo(toCurrency)?.exchangeRate || 1;
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }
  
  static calculatePricing(baseAmount: number, currency: string) {
    const currencyInfo = this.getCurrencyInfo(currency);
    if (!currencyInfo) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
    
    // Calculate pricing components
    const subtotal = Math.round(baseAmount * 0.8);
    const taxRate = this.getTaxRate(currency);
    const taxes = Math.round(subtotal * taxRate);
    const total = subtotal + taxes;
    const deposit = Math.round(total * 0.3); // 30% deposit
    
    return {
      currency: currency.toUpperCase(),
      currencySymbol: currencyInfo.symbol,
      baseAmount,
      subtotal,
      taxRate,
      taxes,
      total,
      deposit,
      balance: total - deposit,
      formatted: {
        baseAmount: this.formatAmount(baseAmount, currency),
        subtotal: this.formatAmount(subtotal, currency),
        taxes: this.formatAmount(taxes, currency),
        total: this.formatAmount(total, currency),
        deposit: this.formatAmount(deposit, currency),
        balance: this.formatAmount(total - deposit, currency)
      }
    };
  }
  
  private static getTaxRate(currency: string): number {
    // Different tax rates by country/currency
    switch (currency.toUpperCase()) {
      case 'NGN': return 0.075; // 7.5% VAT in Nigeria
      case 'GBP': return 0.20;  // 20% VAT in UK
      case 'EUR': return 0.19;  // Average VAT in Europe
      case 'USD': return 0.08;  // Average sales tax in US
      case 'CAD': return 0.13;  // Average tax in Canada
      case 'ZAR': return 0.15;  // 15% VAT in South Africa
      case 'KES': return 0.16;  // 16% VAT in Kenya
      case 'GHS': return 0.15;  // VAT in Ghana
      case 'INR': return 0.18;  // GST in India
      default: return 0.10;     // Default 10%
    }
  }
  
  static getBudgetRanges(currency: string): string[] {
    const currencyInfo = this.getCurrencyInfo(currency);
    if (!currencyInfo) return [];
    
    const baseRanges = [
      [5000, 15000],
      [15000, 35000],
      [35000, 75000],
      [75000, 150000],
      [150000, 300000],
      [300000, 500000],
      [500000, null] // 500k+
    ];
    
    return baseRanges.map(([min, max]) => {
      const convertedMin = Math.round(this.convertAmount(min as number, 'USD', currency));
      const convertedMax = max != null ? Math.round(this.convertAmount(max as number, 'USD', currency)) : null;
      
      if (convertedMax !== null) {
        return `${this.formatAmount(convertedMin, currency)} - ${this.formatAmount(convertedMax, currency)}`;
      } else {
        return `${this.formatAmount(convertedMin, currency)}+`;
      }
    });
  }
}
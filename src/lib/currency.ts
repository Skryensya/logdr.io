import { CurrencyConfig } from '@/types/database';

export const CURRENCIES: Record<string, CurrencyConfig> = {
  CLP: { 
    code: "CLP", 
    name: "Peso Chileno", 
    symbol: "$", 
    minorUnit: 0, 
    defaultLocale: "es-CL" 
  },
  USD: { 
    code: "USD", 
    name: "US Dollar", 
    symbol: "$", 
    minorUnit: 2, 
    defaultLocale: "en-US" 
  },
  EUR: { 
    code: "EUR", 
    name: "Euro", 
    symbol: "€", 
    minorUnit: 2, 
    defaultLocale: "en-EU" 
  },
  BTC: { 
    code: "BTC", 
    name: "Bitcoin", 
    symbol: "₿", 
    minorUnit: 8, 
    defaultLocale: "en-US" 
  }
};

export class MoneyAmount {
  constructor(
    private amount: number,    // entero en unidad mínima
    private currency: string
  ) {
    if (!CURRENCIES[currency]) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
  }

  get rawAmount(): number {
    return this.amount;
  }

  get currencyCode(): string {
    return this.currency;
  }

  get config(): CurrencyConfig {
    return CURRENCIES[this.currency];
  }

  /**
   * Converts the raw amount to display value (with decimals)
   */
  toDecimal(): number {
    const config = CURRENCIES[this.currency];
    const divisor = Math.pow(10, config.minorUnit);
    return this.amount / divisor;
  }

  /**
   * Formats the amount for display
   */
  toDisplay(locale?: string): string {
    const config = CURRENCIES[this.currency];
    const displayLocale = locale || config.defaultLocale;
    const value = this.toDecimal();
    
    return new Intl.NumberFormat(displayLocale, {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: config.minorUnit,
      maximumFractionDigits: config.minorUnit
    }).format(value);
  }

  /**
   * Creates a MoneyAmount from user input (string with decimals)
   */
  static fromUserInput(input: string, currency: string): MoneyAmount {
    if (!CURRENCIES[currency]) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const config = CURRENCIES[currency];
    const multiplier = Math.pow(10, config.minorUnit);
    
    // Parse the input as float and convert to integer
    const parsedValue = parseFloat(input.replace(/[^\d.-]/g, ''));
    if (isNaN(parsedValue)) {
      throw new Error(`Invalid numeric input: ${input}`);
    }
    
    const amount = Math.round(parsedValue * multiplier);
    return new MoneyAmount(amount, currency);
  }

  /**
   * Creates a MoneyAmount from a decimal value
   */
  static fromDecimal(decimal: number, currency: string): MoneyAmount {
    if (!CURRENCIES[currency]) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    const config = CURRENCIES[currency];
    const multiplier = Math.pow(10, config.minorUnit);
    const amount = Math.round(decimal * multiplier);
    
    return new MoneyAmount(amount, currency);
  }

  /**
   * Creates a MoneyAmount from raw integer amount
   */
  static fromRaw(amount: number, currency: string): MoneyAmount {
    return new MoneyAmount(amount, currency);
  }

  /**
   * Adds another MoneyAmount (must be same currency)
   */
  add(other: MoneyAmount): MoneyAmount {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot add different currencies: ${this.currency} and ${other.currency}`);
    }
    return new MoneyAmount(this.amount + other.amount, this.currency);
  }

  /**
   * Subtracts another MoneyAmount (must be same currency)
   */
  subtract(other: MoneyAmount): MoneyAmount {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot subtract different currencies: ${this.currency} and ${other.currency}`);
    }
    return new MoneyAmount(this.amount - other.amount, this.currency);
  }

  /**
   * Multiplies by a scalar
   */
  multiply(scalar: number): MoneyAmount {
    return new MoneyAmount(Math.round(this.amount * scalar), this.currency);
  }

  /**
   * Divides by a scalar
   */
  divide(scalar: number): MoneyAmount {
    if (scalar === 0) {
      throw new Error("Cannot divide by zero");
    }
    return new MoneyAmount(Math.round(this.amount / scalar), this.currency);
  }

  /**
   * Returns the absolute value
   */
  abs(): MoneyAmount {
    return new MoneyAmount(Math.abs(this.amount), this.currency);
  }

  /**
   * Returns the negative value
   */
  negate(): MoneyAmount {
    return new MoneyAmount(-this.amount, this.currency);
  }

  /**
   * Checks if the amount is zero
   */
  isZero(): boolean {
    return this.amount === 0;
  }

  /**
   * Checks if the amount is positive
   */
  isPositive(): boolean {
    return this.amount > 0;
  }

  /**
   * Checks if the amount is negative
   */
  isNegative(): boolean {
    return this.amount < 0;
  }

  /**
   * Compares with another MoneyAmount
   */
  compare(other: MoneyAmount): number {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot compare different currencies: ${this.currency} and ${other.currency}`);
    }
    
    if (this.amount < other.amount) return -1;
    if (this.amount > other.amount) return 1;
    return 0;
  }

  /**
   * Checks equality with another MoneyAmount
   */
  equals(other: MoneyAmount): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }

  /**
   * Converts to JSON representation
   */
  toJSON(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency
    };
  }

  /**
   * Creates MoneyAmount from JSON representation
   */
  static fromJSON(json: { amount: number; currency: string }): MoneyAmount {
    return new MoneyAmount(json.amount, json.currency);
  }

  /**
   * Returns string representation for debugging
   */
  toString(): string {
    return `${this.amount} ${this.currency} (${this.toDisplay()})`;
  }
}

/**
 * Helper function to validate currency code
 */
export function isValidCurrency(currency: string): currency is keyof typeof CURRENCIES {
  return currency in CURRENCIES;
}

/**
 * Helper function to get all available currencies
 */
export function getAvailableCurrencies(): CurrencyConfig[] {
  return Object.values(CURRENCIES);
}

/**
 * Helper function to format amount without creating MoneyAmount instance
 */
export function formatAmount(amount: number, currency: string, locale?: string): string {
  if (!CURRENCIES[currency]) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  const money = MoneyAmount.fromRaw(amount, currency);
  return money.toDisplay(locale);
}
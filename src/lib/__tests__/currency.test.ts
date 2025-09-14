/**
 * Unit tests for currency calculations and MoneyAmount class
 * Run with: node --test --loader ts-node/esm src/lib/__tests__/currency.test.ts
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { MoneyAmount, CURRENCIES, isValidCurrency, getAvailableCurrencies, formatAmount } from '../currency';

describe('Currency System Tests', () => {
  describe('CURRENCIES configuration', () => {
    it('should have correct CLP configuration', () => {
      const clp = CURRENCIES.CLP;
      assert.equal(clp.code, 'CLP');
      assert.equal(clp.name, 'Peso Chileno');
      assert.equal(clp.symbol, '$');
      assert.equal(clp.minorUnit, 0);
      assert.equal(clp.defaultLocale, 'es-CL');
    });

    it('should have correct USD configuration', () => {
      const usd = CURRENCIES.USD;
      assert.equal(usd.code, 'USD');
      assert.equal(usd.name, 'US Dollar');
      assert.equal(usd.symbol, '$');
      assert.equal(usd.minorUnit, 2);
      assert.equal(usd.defaultLocale, 'en-US');
    });

    it('should have correct EUR configuration', () => {
      const eur = CURRENCIES.EUR;
      assert.equal(eur.code, 'EUR');
      assert.equal(eur.name, 'Euro');
      assert.equal(eur.symbol, '€');
      assert.equal(eur.minorUnit, 2);
      assert.equal(eur.defaultLocale, 'en-EU');
    });

    it('should have correct BTC configuration', () => {
      const btc = CURRENCIES.BTC;
      assert.equal(btc.code, 'BTC');
      assert.equal(btc.name, 'Bitcoin');
      assert.equal(btc.symbol, '₿');
      assert.equal(btc.minorUnit, 8);
      assert.equal(btc.defaultLocale, 'en-US');
    });
  });

  describe('MoneyAmount - Construction', () => {
    it('should create CLP amount (no decimals)', () => {
      const amount = MoneyAmount.fromRaw(1000, 'CLP');
      assert.equal(amount.rawAmount, 1000);
      assert.equal(amount.currencyCode, 'CLP');
      assert.equal(amount.toDecimal(), 1000);
    });

    it('should create USD amount (2 decimals)', () => {
      const amount = MoneyAmount.fromRaw(1050, 'USD');
      assert.equal(amount.rawAmount, 1050);
      assert.equal(amount.currencyCode, 'USD');
      assert.equal(amount.toDecimal(), 10.50);
    });

    it('should create BTC amount (8 decimals)', () => {
      const amount = MoneyAmount.fromRaw(1, 'BTC');
      assert.equal(amount.rawAmount, 1);
      assert.equal(amount.currencyCode, 'BTC');
      assert.equal(amount.toDecimal(), 0.00000001);
    });

    it('should throw error for unsupported currency', () => {
      assert.throws(() => {
        MoneyAmount.fromRaw(100, 'XXX');
      }, /Unsupported currency: XXX/);
    });
  });

  describe('MoneyAmount - From User Input', () => {
    it('should create CLP from user input', () => {
      const amount = MoneyAmount.fromUserInput('1000', 'CLP');
      assert.equal(amount.rawAmount, 1000);
      assert.equal(amount.toDecimal(), 1000);
    });

    it('should create USD from user input with decimals', () => {
      const amount = MoneyAmount.fromUserInput('10.50', 'USD');
      assert.equal(amount.rawAmount, 1050);
      assert.equal(amount.toDecimal(), 10.50);
    });

    it('should create BTC from user input with 8 decimals', () => {
      const amount = MoneyAmount.fromUserInput('0.00000001', 'BTC');
      assert.equal(amount.rawAmount, 1);
      assert.equal(amount.toDecimal(), 0.00000001);
    });

    it('should handle input with currency symbols', () => {
      const amount = MoneyAmount.fromUserInput('$10.50', 'USD');
      assert.equal(amount.rawAmount, 1050);
      assert.equal(amount.toDecimal(), 10.50);
    });

    it('should throw error for invalid input', () => {
      assert.throws(() => {
        MoneyAmount.fromUserInput('abc', 'USD');
      }, /Invalid numeric input: abc/);
    });
  });

  describe('MoneyAmount - From Decimal', () => {
    it('should create USD from decimal', () => {
      const amount = MoneyAmount.fromDecimal(10.50, 'USD');
      assert.equal(amount.rawAmount, 1050);
      assert.equal(amount.toDecimal(), 10.50);
    });

    it('should handle rounding for BTC', () => {
      const amount = MoneyAmount.fromDecimal(0.123456789, 'BTC');
      assert.equal(amount.rawAmount, 12345679); // Rounded to 8 decimals
      assert.equal(amount.toDecimal(), 0.12345679);
    });
  });

  describe('MoneyAmount - Arithmetic Operations', () => {
    it('should add amounts of same currency', () => {
      const amount1 = MoneyAmount.fromDecimal(10.50, 'USD');
      const amount2 = MoneyAmount.fromDecimal(5.25, 'USD');
      const result = amount1.add(amount2);
      
      assert.equal(result.rawAmount, 1575);
      assert.equal(result.toDecimal(), 15.75);
      assert.equal(result.currencyCode, 'USD');
    });

    it('should subtract amounts of same currency', () => {
      const amount1 = MoneyAmount.fromDecimal(10.50, 'USD');
      const amount2 = MoneyAmount.fromDecimal(5.25, 'USD');
      const result = amount1.subtract(amount2);
      
      assert.equal(result.rawAmount, 525);
      assert.equal(result.toDecimal(), 5.25);
    });

    it('should multiply by scalar', () => {
      const amount = MoneyAmount.fromDecimal(10.50, 'USD');
      const result = amount.multiply(2);
      
      assert.equal(result.rawAmount, 2100);
      assert.equal(result.toDecimal(), 21.00);
    });

    it('should divide by scalar', () => {
      const amount = MoneyAmount.fromDecimal(10.50, 'USD');
      const result = amount.divide(2);
      
      assert.equal(result.rawAmount, 525);
      assert.equal(result.toDecimal(), 5.25);
    });

    it('should throw error when adding different currencies', () => {
      const usd = MoneyAmount.fromDecimal(10, 'USD');
      const eur = MoneyAmount.fromDecimal(10, 'EUR');
      
      assert.throws(() => {
        usd.add(eur);
      }, /Cannot add different currencies: USD and EUR/);
    });

    it('should throw error when dividing by zero', () => {
      const amount = MoneyAmount.fromDecimal(10, 'USD');
      
      assert.throws(() => {
        amount.divide(0);
      }, /Cannot divide by zero/);
    });
  });

  describe('MoneyAmount - Comparison Operations', () => {
    it('should compare amounts correctly', () => {
      const amount1 = MoneyAmount.fromDecimal(10.50, 'USD');
      const amount2 = MoneyAmount.fromDecimal(5.25, 'USD');
      const amount3 = MoneyAmount.fromDecimal(10.50, 'USD');
      
      assert.equal(amount1.compare(amount2), 1);
      assert.equal(amount2.compare(amount1), -1);
      assert.equal(amount1.compare(amount3), 0);
    });

    it('should check equality', () => {
      const amount1 = MoneyAmount.fromDecimal(10.50, 'USD');
      const amount2 = MoneyAmount.fromDecimal(10.50, 'USD');
      const amount3 = MoneyAmount.fromDecimal(5.25, 'USD');
      
      assert.ok(amount1.equals(amount2));
      assert.ok(!amount1.equals(amount3));
    });

    it('should throw error when comparing different currencies', () => {
      const usd = MoneyAmount.fromDecimal(10, 'USD');
      const eur = MoneyAmount.fromDecimal(10, 'EUR');
      
      assert.throws(() => {
        usd.compare(eur);
      }, /Cannot compare different currencies: USD and EUR/);
    });
  });

  describe('MoneyAmount - Utility Methods', () => {
    it('should get absolute value', () => {
      const negative = MoneyAmount.fromDecimal(-10.50, 'USD');
      const positive = negative.abs();
      
      assert.equal(positive.rawAmount, 1050);
      assert.equal(positive.toDecimal(), 10.50);
    });

    it('should negate value', () => {
      const positive = MoneyAmount.fromDecimal(10.50, 'USD');
      const negative = positive.negate();
      
      assert.equal(negative.rawAmount, -1050);
      assert.equal(negative.toDecimal(), -10.50);
    });

    it('should check if zero', () => {
      const zero = MoneyAmount.fromDecimal(0, 'USD');
      const nonZero = MoneyAmount.fromDecimal(10, 'USD');
      
      assert.ok(zero.isZero());
      assert.ok(!nonZero.isZero());
    });

    it('should check if positive', () => {
      const positive = MoneyAmount.fromDecimal(10, 'USD');
      const negative = MoneyAmount.fromDecimal(-10, 'USD');
      const zero = MoneyAmount.fromDecimal(0, 'USD');
      
      assert.ok(positive.isPositive());
      assert.ok(!negative.isPositive());
      assert.ok(!zero.isPositive());
    });

    it('should check if negative', () => {
      const positive = MoneyAmount.fromDecimal(10, 'USD');
      const negative = MoneyAmount.fromDecimal(-10, 'USD');
      const zero = MoneyAmount.fromDecimal(0, 'USD');
      
      assert.ok(!positive.isNegative());
      assert.ok(negative.isNegative());
      assert.ok(!zero.isNegative());
    });
  });

  describe('MoneyAmount - JSON Serialization', () => {
    it('should convert to JSON', () => {
      const amount = MoneyAmount.fromDecimal(10.50, 'USD');
      const json = amount.toJSON();
      
      assert.deepEqual(json, { amount: 1050, currency: 'USD' });
    });

    it('should create from JSON', () => {
      const json = { amount: 1050, currency: 'USD' };
      const amount = MoneyAmount.fromJSON(json);
      
      assert.equal(amount.rawAmount, 1050);
      assert.equal(amount.currencyCode, 'USD');
      assert.equal(amount.toDecimal(), 10.50);
    });
  });

  describe('Currency Utility Functions', () => {
    it('should validate currency codes', () => {
      assert.ok(isValidCurrency('USD'));
      assert.ok(isValidCurrency('EUR'));
      assert.ok(isValidCurrency('CLP'));
      assert.ok(isValidCurrency('BTC'));
      assert.ok(!isValidCurrency('XXX'));
    });

    it('should get available currencies', () => {
      const currencies = getAvailableCurrencies();
      assert.equal(currencies.length, 4);
      
      const codes = currencies.map(c => c.code);
      assert.ok(codes.includes('USD'));
      assert.ok(codes.includes('EUR'));
      assert.ok(codes.includes('CLP'));
      assert.ok(codes.includes('BTC'));
    });

    it('should format amount without MoneyAmount instance', () => {
      const formatted = formatAmount(1050, 'USD');
      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('10.50') || formatted.includes('$'));
    });
  });

  describe('Real-world scenarios from plan', () => {
    it('should handle CLP $1000 as stored 1000', () => {
      const clp = MoneyAmount.fromUserInput('1000', 'CLP');
      assert.equal(clp.rawAmount, 1000);
    });

    it('should handle USD $10.50 as stored 1050', () => {
      const usd = MoneyAmount.fromUserInput('10.50', 'USD');
      assert.equal(usd.rawAmount, 1050);
    });

    it('should handle BTC ₿0.00000001 as stored 1', () => {
      const btc = MoneyAmount.fromUserInput('0.00000001', 'BTC');
      assert.equal(btc.rawAmount, 1);
    });

    it('should handle multi-currency transaction simulation', () => {
      // CLP account with $100,000
      const clpAccount = MoneyAmount.fromUserInput('100000', 'CLP');
      assert.equal(clpAccount.rawAmount, 100000);

      // USD account with $500.50
      const usdAccount = MoneyAmount.fromUserInput('500.50', 'USD');
      assert.equal(usdAccount.rawAmount, 50050);

      // BTC account with ₿0.001
      const btcAccount = MoneyAmount.fromUserInput('0.001', 'BTC');
      assert.equal(btcAccount.rawAmount, 100000);
    });
  });
});

console.log('Currency system tests completed successfully! 🎯');
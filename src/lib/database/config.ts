/**
 * Database configuration and schema definitions
 */

import { PouchDBIndex } from "@/types/database";

/**
 * Required indexes for optimal query performance
 */
export const REQUIRED_INDEXES: PouchDBIndex[] = [
  {
    index: {
      fields: ["type", "archived", "updatedAt"],
    },
    name: "accounts-active",
    ddoc: "accounts-active",
  },
  {
    index: {
      fields: ["yearMonth", "accountId", "currency"],
    },
    name: "lines-monthly-account",
    ddoc: "lines-monthly-account",
  },
  {
    index: {
      fields: ["yearMonth", "categoryId", "currency"],
    },
    name: "lines-monthly-category",
    ddoc: "lines-monthly-category",
  },
  {
    index: {
      fields: ["transactionId", "createdAt"],
    },
    name: "lines-by-transaction",
    ddoc: "lines-by-transaction",
  },
  {
    index: {
      fields: ["date", "categoryId"],
    },
    name: "transactions-by-date",
    ddoc: "transactions-by-date",
  },
];

/**
 * Map/Reduce design documents for balance calculations
 */
export const DESIGN_DOCS = {
  balance_views: {
    _id: "_design/balance_views",
    views: {
      monthly_balance: {
        map: `function(doc) {
          if (doc._id.startsWith('line::')) {
            emit([doc.yearMonth, doc.accountId, doc.currency], doc.amount);
          }
        }`,
        reduce: "_sum",
      },
      monthly_by_category: {
        map: `function(doc) {
          if (doc._id.startsWith('line::') && doc.categoryId) {
            emit([doc.yearMonth, doc.categoryId, doc.currency], doc.amount);
          }
        }`,
        reduce: "_sum",
      },
      monthly_cashflow: {
        map: `function(doc) {
          if (doc._id.startsWith('line::')) {
            var kind = doc.amount >= 0 ? 'in' : 'out';
            emit([doc.yearMonth, doc.currency, kind], Math.abs(doc.amount));
          }
        }`,
        reduce: "_sum",
      },
    },
  },
};

/**
 * Statistics and quick stats database queries
 */

import { QueryContext, getRawDB } from './types';

/**
 * Get quick database statistics
 */
export async function getQuickStats(
  context: QueryContext
): Promise<{
  totalTransactions: number;
  totalAccounts: number;
  totalCategories: number;
  lastTransactionDate?: string;
}> {
  const rawDB = getRawDB(context.db);
  
  // Count documents by type
  const [txnResult, accountResult, categoryResult] = await Promise.all([
    rawDB.find({
      selector: { _id: { $regex: "^txn::" } },
      fields: ['_id', 'date'],
      sort: [{ date: 'desc' }],
      limit: 1
    }),
    rawDB.find({
      selector: { _id: { $regex: "^account::" } },
      fields: ['_id']
    }),
    rawDB.find({
      selector: { _id: { $regex: "^category::" } },
      fields: ['_id']
    })
  ]);
  
  // For transactions, we need to count all of them
  const allTxnResult = await rawDB.find({
    selector: { _id: { $regex: "^txn::" } },
    fields: ['_id']
  });
  
  return {
    totalTransactions: allTxnResult.docs.length,
    totalAccounts: accountResult.docs.length,
    totalCategories: categoryResult.docs.length,
    lastTransactionDate: txnResult.docs[0]?.date
  };
}

/**
 * Get document counts by type
 */
export async function getDocumentCounts(
  context: QueryContext
): Promise<{
  accounts: number;
  categories: number;
  transactions: number;
  transactionLines: number;
}> {
  const rawDB = getRawDB(context.db);
  
  const [accounts, categories, transactions, lines] = await Promise.all([
    rawDB.find({ selector: { _id: { $regex: "^account::" } }, fields: ['_id'] }),
    rawDB.find({ selector: { _id: { $regex: "^category::" } }, fields: ['_id'] }),
    rawDB.find({ selector: { _id: { $regex: "^txn::" } }, fields: ['_id'] }),
    rawDB.find({ selector: { _id: { $regex: "^line::" } }, fields: ['_id'] })
  ]);

  return {
    accounts: accounts.docs.length,
    categories: categories.docs.length,
    transactions: transactions.docs.length,
    transactionLines: lines.docs.length
  };
}
/**
 * Demo and examples for Phase 1 implementation
 * This file demonstrates how to use the new PouchDB offline-first system
 */

import { createValidatedUserDatabase } from '@/lib/database';
import { createQueries } from '@/lib/queries';
import { MoneyAmount } from '@/lib/currency';

/**
 * Example: Setting up a new user with Phase 1 system
 */
export async function setupNewUserDemo(userId: string, email: string, displayName: string) {
  console.log('=== Phase 1 Demo: Setting up new user ===');
  
  try {
    // Initialize database for user
    const db = await createValidatedUserDatabase(userId);
    
    // Update user info
    await db.updateUser({
      email,
      displayName,
      homeCurrency: 'USD',
      locale: 'en-US'
    });
    console.log('✅ User database initialized');

    console.log('✅ User setup completed successfully');

    return db;
  } catch (error) {
    console.error('❌ Error setting up user:', error);
    throw error;
  }
}

/**
 * Example: Creating accounts and categories
 */
export async function createSampleDataDemo() {
  console.log('=== Phase 1 Demo: Creating sample data ===');
  
  // For demo purposes, create a new database instance
  const db = await createValidatedUserDatabase('demo-user');

  try {
    // Create additional accounts
    const savingsAccount = await db.createAccount({
      name: 'Savings Account',
      type: 'asset',
      visible: true,
      archived: false,
      defaultCurrency: 'USD',
      minorUnit: 2,
      balance: 0
    });
    console.log('✅ Created savings account:', savingsAccount._id);

    // Create categories
    const groceriesCategory = await db.createCategory({
      name: 'Groceries',
      kind: 'expense',
      color: '#FF9500',
      icon: '🛒',
      archived: false
    });
    console.log('✅ Created groceries category:', groceriesCategory._id);

    return { savingsAccount, groceriesCategory };
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    throw error;
  }
}

/**
 * Example: Creating a double-entry transaction
 */
export async function createTransactionDemo() {
  console.log('=== Phase 1 Demo: Creating double-entry transaction ===');
  
  // For demo purposes, create a new database instance
  const db = await createValidatedUserDatabase('demo-user');

  try {
    // Get accounts
    const accounts = await db.listAccounts();
    const categories = await db.listCategories();
    
    if (accounts.length < 2) {
      throw new Error('Need at least 2 accounts for transaction');
    }

    const checkingAccount = accounts.find(a => a.name === 'Checking Account');
    const expenseAccount = accounts.find(a => a.type === 'expense');
    const groceriesCategory = categories.find(c => c.name === 'Groceries');

    if (!checkingAccount || !expenseAccount) {
      throw new Error('Could not find required accounts');
    }

    // Create grocery purchase transaction: $50.00
    const amount = MoneyAmount.fromUserInput('50.00', 'USD');
    
    const transaction = await db.createTransaction(
      {
        date: '2024-01-15',
        description: 'Grocery shopping at Whole Foods',
        categoryId: groceriesCategory?._id
      },
      [
        {
          accountId: checkingAccount._id,
          amount: -amount.rawAmount, // Debit checking account
          currency: 'USD',
          categoryId: groceriesCategory?._id,
          date: '2024-01-15'
        },
        {
          accountId: expenseAccount._id,
          amount: amount.rawAmount, // Credit expense account
          currency: 'USD',
          categoryId: groceriesCategory?._id,
          date: '2024-01-15'
        }
      ]
    );

    console.log('✅ Created transaction:', transaction.transaction._id);
    console.log('💰 Amount:', amount.toDisplay());
    console.log('📝 Description:', transaction.transaction.description);
    console.log('📊 Lines:', transaction.lines.length);

    return transaction;
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw error;
  }
}

/**
 * Example: Using queries and views
 */
export async function queryDataDemo() {
  console.log('=== Phase 1 Demo: Querying data with views ===');
  
  // For demo purposes, create a new database instance
  const db = await createValidatedUserDatabase('demo-user');

  try {
    const queries = createQueries(db);

    // Get monthly balances
    const balances = await queries.getMonthlyBalances('2024-01');
    console.log('📊 Monthly balances for January 2024:', balances.length);

    // Get account balance
    const accounts = await db.listAccounts();
    if (accounts.length > 0) {
      const accountBalances = await queries.getAccountBalance(accounts[0]._id);
      console.log('💰 Account balance:', accountBalances.map(b => b.toDisplay()));
    }

    // Get quick stats
    const stats = await queries.getQuickStats();
    console.log('📈 Quick stats:', stats);

    return { balances, stats };
  } catch (error) {
    console.error('❌ Error querying data:', error);
    throw error;
  }
}

/**
 * Example: Currency system demo
 */
export async function currencyDemo() {
  console.log('=== Phase 1 Demo: Currency system ===');
  
  try {
    // Different currencies
    const usdAmount = MoneyAmount.fromUserInput('100.50', 'USD');
    const clpAmount = MoneyAmount.fromUserInput('85000', 'CLP');
    const btcAmount = MoneyAmount.fromUserInput('0.00234567', 'BTC');

    console.log('💵 USD:', usdAmount.toDisplay()); // $100.50
    console.log('💰 CLP:', clpAmount.toDisplay()); // $85,000
    console.log('₿ BTC:', btcAmount.toDisplay());   // ₿0.00234567

    // Math operations
    const usd50 = MoneyAmount.fromUserInput('50.25', 'USD');
    const total = usdAmount.add(usd50);
    console.log('➕ Addition:', total.toDisplay()); // $150.75

    // Raw amounts for storage
    console.log('Raw amounts (stored as integers):');
    console.log('- USD $100.50 =', usdAmount.rawAmount); // 10050
    console.log('- CLP $85,000 =', clpAmount.rawAmount); // 85000
    console.log('- BTC ₿0.00234567 =', btcAmount.rawAmount); // 234567

    return { usdAmount, clpAmount, btcAmount };
  } catch (error) {
    console.error('❌ Error in currency demo:', error);
    throw error;
  }
}

/**
 * Complete Phase 1 demo workflow
 */
export async function runCompletePhase1Demo() {
  console.log('\n🚀 Starting Complete Phase 1 Demo\n');
  
  try {
    // 1. Setup new user
    await setupNewUserDemo('demo-user-123', 'demo@logdrio.com', 'Demo User');
    
    // 2. Create sample data
    await createSampleDataDemo();
    
    // 3. Currency demo
    await currencyDemo();
    
    // 4. Create transactions
    await createTransactionDemo();
    
    // 5. Query data
    await queryDataDemo();
    
    console.log('\n✅ Phase 1 demo completed successfully!');
    
    // Final health check
    console.log('\u2705 Performance demo completed');
    console.log('\n🏥 Final health check:', health);
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error);
    throw error;
  }
}

// Export for potential use in development/testing
export const Phase1Demo = {
  setupNewUserDemo,
  createSampleDataDemo,
  createTransactionDemo,
  queryDataDemo,
  currencyDemo,
  runCompletePhase1Demo
};
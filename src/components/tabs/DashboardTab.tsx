"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAccounts } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/contexts/AuthContext";
import { MoneyAmount } from "@/lib/currency";
import { CreditCard, BarChart3, FolderTree, TrendingUp } from "lucide-react";
import { LoginModal } from "@/components/auth/LoginModal";

export default function DashboardTab() {
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { transactions, isLoading: transactionsLoading, getTransactionLines } = useTransactions();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { isAnonymous } = useAuth();
  const [hasShownUpgradeToast, setHasShownUpgradeToast] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [transactionAmounts, setTransactionAmounts] = useState<Record<string, {amount: string, type: 'income' | 'expense' | 'transfer', currency: string}>>();

  // Show upgrade toast for anonymous users
  useEffect(() => {
    if (isAnonymous && !hasShownUpgradeToast) {
      const toastId = toast("💾 Save your data permanently", {
        description:
          "You're using guest mode. Create an account to keep your financial data safe and access it from any device.",
        duration: Infinity, // Keep toast visible until user dismisses
        action: {
          label: "Sign In with Google",
          onClick: () => {
            setShowLoginModal(true);
            toast.dismiss(toastId);
          },
        },
        cancel: {
          label: "Maybe later",
          onClick: () => {
            setHasShownUpgradeToast(true);
          },
        },
      });
      setHasShownUpgradeToast(true);
    }
  }, [isAnonymous, hasShownUpgradeToast]);

  // Calculate transaction amounts and types
  useEffect(() => {
    const calculateTransactionAmounts = async () => {
      if (!transactions.length || !accounts.length) return;

      const amounts: Record<string, {amount: string, type: 'income' | 'expense' | 'transfer', currency: string}> = {};

      for (const transaction of transactions) {
        try {
          const lines = await getTransactionLines(transaction._id);
          if (lines.length === 0) continue;

          // Find user accounts (not system accounts)
          const userAccountIds = new Set(accounts.map(acc => acc._id));
          const userLines = lines.filter(line => userAccountIds.has(line.accountId));
          const systemLines = lines.filter(line => !userAccountIds.has(line.accountId));

          if (userLines.length === 0) continue;

          // Determine transaction type and amount
          let type: 'income' | 'expense' | 'transfer';
          let displayAmount: number;
          let currency: string;

          if (userLines.length === 1) {
            // Single user account involved - either income or expense
            const userLine = userLines[0];
            displayAmount = Math.abs(userLine.amount);
            currency = userLine.currency;
            
            // Check if it's income or expense by looking at system accounts
            const hasIncomeAccount = systemLines.some(line => line.accountId.includes('income-account'));
            const hasExpenseAccount = systemLines.some(line => line.accountId.includes('expense-account'));
            
            if (hasIncomeAccount) {
              type = 'income';
            } else if (hasExpenseAccount) {
              type = 'expense';
            } else {
              // Default logic: positive amount to user account = income, negative = expense
              type = userLine.amount > 0 ? 'income' : 'expense';
            }
          } else {
            // Multiple user accounts involved - transfer
            type = 'transfer';
            // Use the absolute value of the first user line
            const firstUserLine = userLines[0];
            displayAmount = Math.abs(firstUserLine.amount);
            currency = firstUserLine.currency;
          }

          // Format the amount
          const moneyAmount = MoneyAmount.fromRaw(displayAmount, currency);
          amounts[transaction._id] = {
            amount: moneyAmount.toDisplay(),
            type,
            currency
          };

        } catch (error) {
          console.error(`Error calculating amount for transaction ${transaction._id}:`, error);
        }
      }

      setTransactionAmounts(amounts);
    };

    calculateTransactionAmounts();
  }, [transactions, accounts, getTransactionLines]);

  // Calculate stats
  const totalBalance = accounts.reduce(
    (sum, account) => sum + (account.balance || 0),
    0
  );
  const activeAccounts = accounts.filter((acc) => !acc.archived && acc.visible);
  const categoriesCount = categories.filter((cat) => !cat.archived).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Balance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountsLoading ? "..." : `$${totalBalance.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeAccounts.length} cuentas activas
            </p>
          </CardContent>
        </Card>

        {/* Active Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accountsLoading ? "..." : activeAccounts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {accounts.length - activeAccounts.length} archivadas
            </p>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactionsLoading ? "..." : transactions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              total registradas
            </p>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoriesLoading ? "..." : categoriesCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {categories.length - categoriesCount} archivadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Todas las Transacciones</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4">
            {transactionsLoading ? (
              <div className="text-muted-foreground">Cargando...</div>
            ) : transactions.length === 0 ? (
              <div className="text-muted-foreground">
                No hay transacciones
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction, index) => {
                  const transactionData = transactionAmounts?.[transaction._id];
                  
                  return (
                    <div
                      key={`${transaction._id}-${index}`}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(transaction.date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        {transaction.categoryId && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {categories.find(c => c._id === transaction.categoryId)?.name || 'Categoría'}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        {transactionData && (
                          <div className={`font-semibold text-sm ${
                            transactionData.type === 'income' 
                              ? 'text-green-600 dark:text-green-400' 
                              : transactionData.type === 'expense'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}>
                            {transactionData.type === 'income' ? '+' : transactionData.type === 'expense' ? '-' : ''}{transactionData.amount}
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {transaction.lineCount} líneas
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Upgrade to Full Account"
        description="Sign in to save your data permanently and access it from any device. Your current guest data will remain accessible."
      />
    </div>
  );
}

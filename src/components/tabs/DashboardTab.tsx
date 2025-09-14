"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAccounts } from "@/hooks/useAccounts";
import { useDatabase } from "@/contexts/DatabaseContext";
import { useCategories } from "@/hooks/useCategories";
import { useAuth } from "@/contexts/AuthContext";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { MoneyAmount } from "@/lib/currency";
import { CreditCard, BarChart3, FolderTree, TrendingUp } from "lucide-react";
import { LoginModal } from "@/components/auth/LoginModal";

export default function DashboardTab() {
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { 
    transactions, 
    totalCount, 
    isLoading: transactionsLoading,
    isLoadingMore,
    hasMore,
    loadMoreTransactions
  } = useDatabase();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { isAnonymous } = useAuth();
  const [hasShownUpgradeToast, setHasShownUpgradeToast] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Infinite scroll setup
  const loadMoreRef = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore,
    onLoadMore: loadMoreTransactions,
    threshold: 200
  });

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
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Todas las Transacciones</CardTitle>
            {!transactionsLoading && (
              <div className="text-sm text-muted-foreground">
                Mostrando {transactions.length} de {totalCount}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px] p-4" ref={scrollAreaRef}>
            {transactionsLoading && transactions.length === 0 ? (
              <div className="text-muted-foreground">Cargando...</div>
            ) : transactions.length === 0 ? (
              <div className="text-muted-foreground">
                No hay transacciones
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction, index) => {
                  const transactionNumber = totalCount - index;
                  const displayAmount = Math.abs(transaction.amount);
                  
                  return (
                    <div
                      key={`${transaction.id}-${index}`}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                          {transactionNumber}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(transaction.date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                          <Badge variant="outline" className="mt-1 text-xs capitalize">
                            {transaction.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className={`font-semibold text-sm ${
                          transaction.type === 'income' 
                            ? 'text-green-600 dark:text-green-400' 
                            : transaction.type === 'expense'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                          ${displayAmount.toLocaleString()} {transaction.currency}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Infinite scroll trigger */}
                {hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Cargando más...</span>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Scroll para cargar más
                      </div>
                    )}
                  </div>
                )}
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

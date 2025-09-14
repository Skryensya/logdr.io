"use client";

import { useState } from "react";
import { Bug, AlertTriangle, Trash2, Database } from "lucide-react";
import { faker } from '@faker-js/faker';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useDatabase } from "@/contexts/DatabaseContext";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { format, subDays } from "date-fns";

export default function DebugMenu() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { createTransaction, clearAllTransactions } = useDatabase();
  const { accounts } = useAccounts();
  const { getCategoryOptions } = useCategories();

  const nukeAllData = async () => {
    try {
      // Clear all simple data
      await clearAllTransactions();
      
      // Clear all localStorage (this will handle everything)
      localStorage.clear();

      // Clear all sessionStorage
      sessionStorage.clear();

      // Get all IndexedDB databases and delete them
      if ('databases' in indexedDB) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases.map(db => {
            return new Promise<void>((resolve, reject) => {
              if (!db.name) {
                resolve();
                return;
              }
              const deleteReq = indexedDB.deleteDatabase(db.name);
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => reject(deleteReq.error);
              deleteReq.onblocked = () => {
                console.warn(`Database ${db.name} deletion blocked`);
                resolve(); // Continue anyway
              };
            });
          })
        );
      }

      toast.success("🧹 Todos los datos han sido eliminados", {
        description: "Todas las transacciones y datos locales limpiados"
      });

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error("Error nuking data:", error);
      toast.error("Error al limpiar los datos", {
        description: "Revisa la consola para más detalles"
      });
    }
  };

  const handleNukeConfirm = () => {
    setShowConfirmModal(false);
    nukeAllData();
  };

  const generateRandomTransactions = async (count: number = 100) => {
    setIsGenerating(true);
    
    const descriptions = {
      expense: [
        "Compra en supermercado", "Gasolina para el auto", "Almuerzo en restaurante",
        "Pago de electricidad", "Pago de agua", "Internet y cable",
        "Reparación auto", "Medicamentos", "Ropa y vestuario",
        "Gimnasio mensual", "Netflix", "Spotify", "Transporte público"
      ],
      income: [
        "Salario mensual", "Freelance trabajo", "Venta de artículo",
        "Bonificación", "Dividendos", "Arriendo recibido",
        "Trabajo extra", "Comisión de ventas", "Reembolso"
      ],
      transfer: [
        "Transferencia entre cuentas", "Ahorro mensual", "Pago de deuda",
        "Inversión", "Depósito a plazo", "Retiro de inversión"
      ]
    };

    // Target balance: 3,000,000 CLP
    const targetBalance = 3000000;
    
    // Calculate realistic income/expense ratio
    const incomeRatio = 0.4; // 40% income
    const expenseRatio = 0.55; // 55% expenses  
    const transferRatio = 0.05; // 5% transfers
    
    const incomeCount = Math.floor(count * incomeRatio);
    const expenseCount = Math.floor(count * expenseRatio);
    const transferCount = count - incomeCount - expenseCount;
    
    // Calculate amounts to reach target balance
    const totalIncome = targetBalance * 1.2; // 20% more income than target
    const totalExpense = totalIncome - targetBalance;
    const totalTransfer = targetBalance * 0.1; // 10% for transfers
    
    const avgIncomeAmount = Math.floor(totalIncome / incomeCount);
    const avgExpenseAmount = Math.floor(totalExpense / expenseCount);
    const avgTransferAmount = Math.floor(totalTransfer / transferCount);

    try {
      console.log(`🚀 Generando ${count} transacciones realistas...`);
      console.log(`📊 Target balance: $${targetBalance.toLocaleString()}`);
      console.log(`💰 ${incomeCount} ingresos (~$${avgIncomeAmount.toLocaleString()} c/u)`);
      console.log(`💸 ${expenseCount} gastos (~$${avgExpenseAmount.toLocaleString()} c/u)`);
      console.log(`🔄 ${transferCount} transferencias (~$${avgTransferAmount.toLocaleString()} c/u)`);
      
      const transactions = [];
      
      // Generate income transactions
      for (let i = 0; i < incomeCount; i++) {
        const variation = faker.number.float({ min: 0.5, max: 1.8 });
        const amount = Math.floor(avgIncomeAmount * variation);
        const description = faker.helpers.arrayElement(descriptions.income);
        const date = generateRandomDate();
        
        transactions.push({ description, amount, type: 'income' as const, date });
      }
      
      // Generate expense transactions
      for (let i = 0; i < expenseCount; i++) {
        const variation = faker.number.float({ min: 0.3, max: 2.0 });
        const amount = Math.floor(avgExpenseAmount * variation);
        const description = faker.helpers.arrayElement(descriptions.expense);
        const date = generateRandomDate();
        
        transactions.push({ description, amount, type: 'expense' as const, date });
      }
      
      // Generate transfer transactions
      for (let i = 0; i < transferCount; i++) {
        const variation = faker.number.float({ min: 0.5, max: 1.5 });
        const amount = Math.floor(avgTransferAmount * variation);
        const description = faker.helpers.arrayElement(descriptions.transfer);
        const date = generateRandomDate();
        
        transactions.push({ description, amount, type: 'transfer' as const, date });
      }
      
      // Sort by date (oldest first) for realistic chronology
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Create transactions in database
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        await createTransaction(tx.description, tx.amount, tx.type, 'CLP', tx.date);
        
        if (i % 20 === 0) {
          console.log(`✅ Creadas ${i + 1}/${transactions.length} transacciones`);
        }
      }

      const actualTotal = transactions.reduce((sum, tx) => {
        return sum + (tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0);
      }, 0);

      console.log(`🎯 Completadas todas las ${count} transacciones`);
      console.log(`💰 Balance calculado: $${actualTotal.toLocaleString()} CLP`);
      toast.success(`🎯 ${count} transacciones creadas`, {
        description: `Balance final: $${actualTotal.toLocaleString()} CLP - Periodo: 3 meses`
      });

    } catch (error) {
      console.error("❌ Error generating transactions:", error);
      toast.error("Error generando transacciones", {
        description: error instanceof Error ? error.message : "Error desconocido"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate random date within the last 3 months
  const generateRandomDate = () => {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    const randomTime = faker.date.between({ from: threeMonthsAgo, to: today });
    return randomTime.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Only show in development or if explicitly enabled
  if (process.env.NODE_ENV === 'production' && !localStorage.getItem('debug-mode')) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Bug className="h-4 w-4" />
            <span className="sr-only">Debug Menu</span>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem 
            onClick={() => generateRandomTransactions(100)}
            disabled={isGenerating}
            className="focus:text-blue-600"
          >
            <Database className="mr-2 h-4 w-4" />
            <span>
              {isGenerating ? 'Generando...' : 'Insert 100 Transactions'}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowConfirmModal(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Nuke All Data</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <DialogTitle>⚠️ Acción Destructiva</DialogTitle>
            </div>
            <div className="text-left space-y-3 text-sm text-muted-foreground">
              <div>
                Esta acción eliminará <strong>TODOS</strong> los datos locales:
              </div>
              <ul className="list-disc list-inside space-y-1">
                <li>Todas las bases de datos IndexedDB</li>
                <li>Todo el contenido de LocalStorage</li>
                <li>Todo el contenido de SessionStorage</li>
                <li>Todas las cookies del sitio</li>
              </ul>
              <div className="text-destructive font-medium">
                Esta acción NO se puede deshacer.
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="destructive"
              onClick={handleNukeConfirm}
              className="sm:mr-2"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar Todo
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
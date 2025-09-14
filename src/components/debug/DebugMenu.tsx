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
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { format, subDays } from "date-fns";

export default function DebugMenu() {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { createTransaction } = useTransactions();
  const { accounts } = useAccounts();
  const { getCategoryOptions } = useCategories();

  const nukeAllData = async () => {
    try {
      // Clear all localStorage
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
      } else {
        // Fallback for older browsers - try to delete common database names
        const commonDbNames = [
          'logdrio-db',
          'user-database',
          'transactions-db',
          'accounts-db',
          'categories-db'
        ];
        
        await Promise.all(
          commonDbNames.map(dbName => {
            return new Promise<void>((resolve) => {
              const deleteReq = indexedDB.deleteDatabase(dbName);
              deleteReq.onsuccess = () => resolve();
              deleteReq.onerror = () => resolve(); // Don't fail if DB doesn't exist
              deleteReq.onblocked = () => resolve();
            });
          })
        );
      }

      // Clear all cookies (same-origin only)
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      });

      toast.success("🧹 Todos los datos han sido eliminados", {
        description: "IndexedDB, LocalStorage, SessionStorage y cookies limpiados"
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
    if (accounts.length === 0) {
      toast.error("No hay cuentas disponibles", {
        description: "Crea al menos una cuenta antes de generar transacciones"
      });
      return;
    }

    setIsGenerating(true);
    const categoryOptions = getCategoryOptions();
    const availableAccounts = accounts.filter(acc => !acc.archived && acc.visible && acc._id);
    
    const transactionTypes = ['expense', 'income', 'transfer'] as const;
    const expenseDescriptions = [
      "Compra en supermercado",
      "Gasolina para el auto",
      "Almuerzo en restaurante",
      "Compra en farmacia",
      "Transporte público",
      "Café con amigos",
      "Compra en línea",
      "Servicios básicos",
      "Reparación del auto",
      "Compras varias"
    ];
    
    const incomeDescriptions = [
      "Salario mensual",
      "Freelance trabajo",
      "Venta de artículo",
      "Reembolso de gastos",
      "Intereses bancarios",
      "Bono de rendimiento",
      "Ingreso extra",
      "Comisión por venta",
      "Dividendos",
      "Pago por servicios"
    ];

    const transferDescriptions = [
      "Transferencia entre cuentas",
      "Ahorro mensual",
      "Pago de deuda",
      "Inversión",
      "Reserva de emergencia",
      "Fondos para vacaciones",
      "Separar dinero",
      "Reorganización de fondos"
    ];

    try {
      for (let i = 0; i < count; i++) {
        const type = faker.helpers.arrayElement(transactionTypes);
        const date = format(faker.date.between({ 
          from: subDays(new Date(), 90), 
          to: new Date() 
        }), 'yyyy-MM-dd');
        
        let description: string;
        let amount: number;
        let fromAccount: typeof availableAccounts[0];
        let toAccount: typeof availableAccounts[0] | undefined;

        switch (type) {
          case 'expense':
            description = faker.helpers.arrayElement(expenseDescriptions);
            amount = faker.number.int({ min: 500, max: 50000 }); // $500 - $50,000 CLP
            fromAccount = faker.helpers.arrayElement(availableAccounts);
            break;
            
          case 'income':
            description = faker.helpers.arrayElement(incomeDescriptions);
            amount = faker.number.int({ min: 5000, max: 200000 }); // $5,000 - $200,000 CLP
            fromAccount = faker.helpers.arrayElement(availableAccounts);
            break;
            
          case 'transfer':
            description = faker.helpers.arrayElement(transferDescriptions);
            amount = faker.number.int({ min: 1000, max: 100000 }); // $1,000 - $100,000 CLP
            fromAccount = faker.helpers.arrayElement(availableAccounts);
            // Ensure different account for transfer
            const otherAccounts = availableAccounts.filter(acc => acc._id !== fromAccount._id);
            if (otherAccounts.length === 0) {
              // Skip if only one account available
              continue;
            }
            toAccount = faker.helpers.arrayElement(otherAccounts);
            break;
        }

        const categoryId = categoryOptions.length > 0 && faker.datatype.boolean(0.7) 
          ? faker.helpers.arrayElement(categoryOptions).value 
          : undefined;

        const tags = faker.datatype.boolean(0.3) 
          ? faker.helpers.arrayElements(['trabajo', 'personal', 'urgente', 'recurrente', 'planeado'], { min: 1, max: 2 })
          : undefined;

        // Create transaction input
        const transactionInput = {
          date,
          description,
          categoryId,
          tags
        };

        // Create transaction lines based on type
        let lines;
        const amountInCents = Math.round(amount * 100);
        const currency = fromAccount!.defaultCurrency;

        switch (type) {
          case 'expense':
            lines = [
              {
                accountId: fromAccount!._id,
                amount: -amountInCents,
                currency,
                categoryId
              },
              {
                accountId: 'account::expense-account',
                amount: amountInCents,
                currency,
                categoryId
              }
            ];
            break;
            
          case 'income':
            lines = [
              {
                accountId: fromAccount!._id,
                amount: amountInCents,
                currency,
                categoryId
              },
              {
                accountId: 'account::income-account',
                amount: -amountInCents,
                currency,
                categoryId
              }
            ];
            break;
            
          case 'transfer':
            const toCurrency = toAccount!.defaultCurrency;
            lines = [
              {
                accountId: fromAccount!._id,
                amount: -amountInCents,
                currency,
                categoryId
              },
              {
                accountId: toAccount!._id,
                amount: amountInCents,
                currency: toCurrency,
                categoryId
              }
            ];
            break;
        }

        await createTransaction(transactionInput, lines!);
        
        // Small delay to avoid overwhelming the system
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      toast.success(`🎯 ${count} transacciones generadas`, {
        description: "Transacciones aleatorias creadas exitosamente"
      });

    } catch (error) {
      console.error("Error generating transactions:", error);
      toast.error("Error generando transacciones", {
        description: "Revisa la consola para más detalles"
      });
    } finally {
      setIsGenerating(false);
    }
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
            <DialogDescription className="text-left space-y-2">
              <p>
                Esta acción eliminará <strong>TODOS</strong> los datos locales:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Todas las bases de datos IndexedDB</li>
                <li>Todo el contenido de LocalStorage</li>
                <li>Todo el contenido de SessionStorage</li>
                <li>Todas las cookies del sitio</li>
              </ul>
              <p className="text-destructive font-medium">
                Esta acción NO se puede deshacer.
              </p>
            </DialogDescription>
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
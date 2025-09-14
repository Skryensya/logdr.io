"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DataTable, { Column, ActionItem } from '@/components/data/DataTable';
import TransactionForm from '@/components/forms/TransactionForm';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { Transaction } from '@/types/database';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

export default function TransactionsTab() {
  const { transactions, isLoading } = useTransactions();
  const { categories } = useCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Create category lookup for display
  const categoryLookup = categories.reduce((acc, cat) => {
    acc[cat._id] = cat;
    return acc;
  }, {} as Record<string, any>);

  const columns: Column<Transaction>[] = [
    {
      key: '#',
      label: '#',
      render: (_, item) => {
        const index = filteredTransactions.findIndex(t => t._id === item._id);
        return filteredTransactions.length - index;
      }
    },
    {
      key: 'date',
      label: 'Fecha',
      render: (value) => new Date(value).toLocaleDateString()
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (value) => (
        <div className="font-medium max-w-xs truncate">
          {value}
        </div>
      )
    },
    {
      key: 'categoryId',
      label: 'Categoría',
      render: (value) => {
        if (!value) return <Badge variant="outline">Sin categoría</Badge>;
        const category = categoryLookup[value];
        return (
          <Badge variant="secondary" style={{ backgroundColor: category?.color }}>
            {category?.icon} {category?.name || 'Categoría desconocida'}
          </Badge>
        );
      }
    },
    {
      key: 'lineCount',
      label: 'Líneas',
      render: (value) => (
        <Badge variant="outline">
          {value}
        </Badge>
      )
    },
    {
      key: 'tags',
      label: 'Etiquetas',
      render: (value) => {
        if (!value || value.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1">
            {value.slice(0, 2).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {value.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{value.length - 2}
              </Badge>
            )}
          </div>
        );
      }
    }
  ];

  const actions: ActionItem<Transaction>[] = [
    {
      label: 'Editar',
      onClick: (transaction) => {
        setEditingTransaction(transaction);
        setShowForm(true);
      }
    },
    {
      label: 'Ver Detalles',
      onClick: (transaction) => {
        // This would open a detailed view or the transaction lines
        console.log('View details for transaction:', transaction._id);
      }
    }
  ];

  const handleCreateNew = () => {
    setEditingTransaction(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
  };

  // Filter transactions based on search term
  const filteredTransactions = transactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Buscar y Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripción o etiquetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros avanzados
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground">
                Los filtros avanzados estarán disponibles próximamente:
              </div>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• Filtrar por rango de fechas</li>
                <li>• Filtrar por categoría</li>
                <li>• Filtrar por cuenta</li>
                <li>• Filtrar por monto</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <DataTable
        title={`Transacciones (${filteredTransactions.length})`}
        data={filteredTransactions}
        columns={columns}
        actions={actions}
        onCreateNew={handleCreateNew}
        createButtonLabel="Nueva Transacción"
        isLoading={isLoading}
        emptyMessage={
          searchTerm 
            ? "No se encontraron transacciones que coincidan con tu búsqueda."
            : "No hay transacciones registradas. Crea tu primera transacción para comenzar."
        }
      />

      {/* Transaction Form */}
      {showForm && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionForm 
              transaction={editingTransaction} 
              isEdit={!!editingTransaction} 
              onClose={handleCloseForm}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
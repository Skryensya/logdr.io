"use client";

import { Badge } from '@/components/ui/badge';
import DataTable, { Column, ActionItem } from '@/components/data/DataTable';
import { useAccounts } from '@/hooks/useAccounts';
import { useSidebar } from '@/hooks/useSidebar';
import { Account } from '@/types/database';
import { Eye, EyeOff, Archive, ArchiveRestore, Edit } from 'lucide-react';

export default function AccountsTab() {
  const { accounts, isLoading, archiveAccount, restoreAccount } = useAccounts();
  const sidebar = useSidebar();

  const columns: Column<Account>[] = [
    {
      key: '#',
      label: '#',
      render: (_, item) => {
        const activeIndex = activeAccounts.findIndex(a => a._id === item._id);
        const archivedIndex = archivedAccounts.findIndex(a => a._id === item._id);
        
        if (activeIndex >= 0) {
          return activeAccounts.length - activeIndex;
        } else if (archivedIndex >= 0) {
          return archivedAccounts.length - archivedIndex;
        }
        return '';
      }
    },
    {
      key: 'name',
      label: 'Nombre',
      render: (value, account) => (
        <div className="font-medium">
          {value}
          {!account.visible && <EyeOff className="inline h-4 w-4 ml-2 text-muted-foreground" />}
        </div>
      )
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value}
        </Badge>
      )
    },
    {
      key: 'defaultCurrency',
      label: 'Moneda',
      render: (value) => (
        <Badge variant="secondary">
          {value}
        </Badge>
      )
    },
    {
      key: 'balance',
      label: 'Balance',
      render: (value) => (
        <div className={`font-medium ${(value || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          ${(value || 0).toLocaleString()}
        </div>
      )
    },
    {
      key: 'archived',
      label: 'Estado',
      render: (value) => (
        <Badge variant={value ? 'secondary' : 'default'}>
          {value ? 'Archivada' : 'Activa'}
        </Badge>
      )
    }
  ];

  const actions: ActionItem<Account>[] = [
    {
      label: 'Editar',
      onClick: (account) => sidebar.openForm('account', account._id, account)
    },
    {
      label: 'Archivar',
      onClick: (account) => archiveAccount(account._id),
      variant: 'destructive'
    }
  ];

  const archivedActions: ActionItem<Account>[] = [
    {
      label: 'Restaurar',
      onClick: (account) => restoreAccount(account._id)
    }
  ];

  // Filter active and archived accounts
  const activeAccounts = accounts.filter(account => !account.archived);
  const archivedAccounts = accounts.filter(account => account.archived);

  return (
    <div className="space-y-6">
      {/* Active Accounts */}
      <DataTable
        title="Cuentas Activas"
        data={activeAccounts}
        columns={columns}
        actions={actions}
        onCreateNew={() => sidebar.openForm('account')}
        createButtonLabel="Nueva Cuenta"
        isLoading={isLoading}
        emptyMessage="No hay cuentas configuradas. Crea tu primera cuenta para comenzar."
      />

      {/* Archived Accounts */}
      {archivedAccounts.length > 0 && (
        <DataTable
          title="Cuentas Archivadas"
          data={archivedAccounts}
          columns={columns}
          actions={archivedActions}
          isLoading={isLoading}
          emptyMessage="No hay cuentas archivadas"
        />
      )}
    </div>
  );
}
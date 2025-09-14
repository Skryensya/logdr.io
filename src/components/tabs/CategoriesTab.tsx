"use client";

import { Badge } from '@/components/ui/badge';
import DataTable, { Column, ActionItem } from '@/components/data/DataTable';
import { useCategories } from '@/hooks/useCategories';
import { useSidebar } from '@/hooks/useSidebar';
import { Category } from '@/types/database';
import { FolderTree, Archive, ArchiveRestore, Edit } from 'lucide-react';

export default function CategoriesTab() {
  const { categories, isLoading, archiveCategory, restoreCategory, getHierarchicalCategories } = useCategories();
  const sidebar = useSidebar();

  const columns: Column<Category>[] = [
    {
      key: 'name',
      label: 'Nombre',
      render: (value, category) => (
        <div className="flex items-center gap-2">
          {category.parentCategoryId && (
            <span className="text-muted-foreground">—</span>
          )}
          {category.icon && (
            <span className="text-sm">{category.icon}</span>
          )}
          <span className={`font-medium ${category.parentCategoryId ? 'text-sm' : ''}`}>
            {value}
          </span>
        </div>
      )
    },
    {
      key: 'kind',
      label: 'Tipo',
      render: (value) => (
        <Badge variant="outline" className="capitalize">
          {value === 'income' ? 'Ingreso' : 
           value === 'expense' ? 'Gasto' : 
           value === 'transfer' ? 'Transferencia' : value}
        </Badge>
      )
    },
    {
      key: 'color',
      label: 'Color',
      render: (value) => value ? (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border"
            style={{ backgroundColor: value }}
          />
          <span className="text-sm font-mono">{value}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">Sin color</span>
      )
    },
    {
      key: 'parentCategoryId',
      label: 'Padre',
      render: (value) => {
        if (!value) return <Badge variant="outline">Raíz</Badge>;
        const parent = categories.find(cat => cat._id === value);
        return (
          <Badge variant="secondary">
            {parent?.icon} {parent?.name || 'Desconocido'}
          </Badge>
        );
      }
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

  const actions: ActionItem<Category>[] = [
    {
      label: 'Editar',
      onClick: (category) => sidebar.openForm('category', category._id, category)
    },
    {
      label: 'Archivar',
      onClick: (category) => archiveCategory(category._id),
      variant: 'destructive'
    }
  ];

  const archivedActions: ActionItem<Category>[] = [
    {
      label: 'Restaurar',
      onClick: (category) => restoreCategory(category._id)
    }
  ];

  // Get hierarchical data for better display
  const hierarchicalCategories = getHierarchicalCategories();
  const flattenedActiveCategories: Category[] = [];
  const flattenedArchivedCategories = categories.filter(cat => cat.archived);

  // Flatten hierarchical structure for table display
  hierarchicalCategories.forEach(parent => {
    flattenedActiveCategories.push(parent);
    if (parent.children) {
      parent.children.forEach(child => {
        flattenedActiveCategories.push(child);
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Active Categories */}
      <DataTable
        title="Categorías Activas"
        data={flattenedActiveCategories}
        columns={columns}
        actions={actions}
        onCreateNew={() => sidebar.openForm('category')}
        createButtonLabel="Nueva Categoría"
        isLoading={isLoading}
        emptyMessage="No hay categorías configuradas. Crea tu primera categoría para organizar tus transacciones."
      />

      {/* Category Stats */}
      {!isLoading && hierarchicalCategories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FolderTree className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Categorías Padre</span>
            </div>
            <div className="text-2xl font-bold">
              {hierarchicalCategories.length}
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Subcategorías</span>
            </div>
            <div className="text-2xl font-bold">
              {hierarchicalCategories.reduce((sum, parent) => sum + (parent.children?.length || 0), 0)}
            </div>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Archivadas</span>
            </div>
            <div className="text-2xl font-bold">
              {flattenedArchivedCategories.length}
            </div>
          </div>
        </div>
      )}

      {/* Archived Categories */}
      {flattenedArchivedCategories.length > 0 && (
        <DataTable
          title="Categorías Archivadas"
          data={flattenedArchivedCategories}
          columns={columns}
          actions={archivedActions}
          isLoading={isLoading}
          emptyMessage="No hay categorías archivadas"
        />
      )}
    </div>
  );
}
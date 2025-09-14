"use client";

import { ReactNode } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, item: T) => ReactNode;
  sortable?: boolean;
}

export interface ActionItem<T> {
  label: string;
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive';
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: Column<T>[];
  actions?: ActionItem<T>[];
  onCreateNew?: () => void;
  createButtonLabel?: string;
  isLoading?: boolean;
  emptyMessage?: string;
}

export default function DataTable<T extends { _id: string }>({
  title,
  data,
  columns,
  actions = [],
  onCreateNew,
  createButtonLabel = "Crear nuevo",
  isLoading = false,
  emptyMessage = "No hay datos disponibles"
}: DataTableProps<T>) {
  const getValue = (item: T, key: string): any => {
    return key.split('.').reduce((obj, k) => obj?.[k], item as any);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {onCreateNew && (
            <Button onClick={onCreateNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {createButtonLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={String(column.key)}>
                    {column.label}
                  </TableHead>
                ))}
                {actions.length > 0 && (
                  <TableHead className="w-12">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="text-center py-8 text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item._id}>
                    {columns.map((column) => {
                      const value = getValue(item, String(column.key));
                      return (
                        <TableCell key={String(column.key)}>
                          {column.render ? column.render(value, item) : String(value || '')}
                        </TableCell>
                      );
                    })}
                    {actions.length > 0 && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Abrir menú</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((action, index) => (
                              <div key={index}>
                                <DropdownMenuItem
                                  onClick={() => action.onClick(item)}
                                  className={action.variant === 'destructive' ? 'text-destructive' : ''}
                                >
                                  {action.label}
                                </DropdownMenuItem>
                                {index < actions.length - 1 && action.variant === 'destructive' && (
                                  <DropdownMenuSeparator />
                                )}
                              </div>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
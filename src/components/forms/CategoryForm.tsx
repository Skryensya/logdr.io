"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoryCreateSchema, categoryUpdateSchema, CategoryInput, CategoryUpdate } from '@/lib/schemas';
import { Category } from '@/types/database';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCategories } from '@/hooks/useCategories';
import { useSidebar } from '@/hooks/useSidebar';

interface CategoryFormProps {
  category?: Category;
  isEdit?: boolean;
}

const categoryKindOptions = [
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'transfer', label: 'Transferencia' }
];

const commonIcons = ['💰', '🍕', '🏠', '🚗', '📱', '💊', '🛒', '⚡', '💡', '🎯', '📚', '🎮'];
const commonColors = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#f59e0b', '#10b981', '#6366f1'
];

export default function CategoryForm({ category, isEdit = false }: CategoryFormProps) {
  const { categories, createCategory, updateCategory } = useCategories();
  const { closeForm } = useSidebar();

  // Get parent categories (no circular references)
  const parentCategoryOptions = categories
    .filter(cat => 
      !cat.archived && 
      !cat.parentCategoryId && // Only root categories can be parents
      (!isEdit || cat._id !== category?._id) // Don't allow self-reference
    );

  const form = useForm<CategoryInput | CategoryUpdate>({
    resolver: zodResolver(isEdit ? categoryUpdateSchema : categoryCreateSchema),
    defaultValues: isEdit && category ? {
      name: category.name,
      kind: category.kind,
      parentCategoryId: category.parentCategoryId,
      color: category.color,
      icon: category.icon,
      archived: category.archived,
    } : {
      name: '',
      kind: 'expense',
      parentCategoryId: undefined,
      color: commonColors[0],
      icon: commonIcons[0],
      archived: false,
    }
  });

  const onSubmit = async (data: CategoryInput | CategoryUpdate) => {
    try {
      if (isEdit && category) {
        await updateCategory(category._id, data as CategoryUpdate);
      } else {
        await createCategory(data as CategoryInput);
      }
      closeForm();
    } catch (error) {
      // Error is already handled in the hooks with toast
      console.error('Form submission error:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Categoría</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Alimentación" {...field} />
              </FormControl>
              <FormDescription>
                Un nombre descriptivo para esta categoría.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Categoría</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoryKindOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Define si esta categoría es para ingresos, gastos o transferencias.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentCategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría Padre (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría padre" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Sin categoría padre</SelectItem>
                  {parentCategoryOptions.map((parent) => (
                    <SelectItem key={parent._id} value={parent._id}>
                      {parent.icon} {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Las subcategorías ayudan a organizar mejor tus transacciones.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ícono</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input placeholder="🍕" {...field} />
                    <div className="grid grid-cols-6 gap-2">
                      {commonIcons.map((icon) => (
                        <Button
                          key={icon}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(icon)}
                          className="h-8 text-lg"
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Un emoji para identificar rápidamente la categoría.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: field.value || commonColors[0] }}
                      />
                      <Input placeholder="#ef4444" {...field} />
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {commonColors.map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange(color)}
                          className="h-8 p-0"
                          style={{ backgroundColor: color }}
                        >
                          <span className="sr-only">{color}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Color para identificar la categoría en reportes.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {isEdit && (
          <FormField
            control={form.control}
            name="archived"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Categoría Archivada
                  </FormLabel>
                  <FormDescription>
                    Las categorías archivadas no aparecen en las listas principales.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting 
              ? 'Guardando...' 
              : isEdit 
                ? 'Actualizar Categoría' 
                : 'Crear Categoría'
            }
          </Button>
          <Button type="button" variant="outline" onClick={closeForm}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
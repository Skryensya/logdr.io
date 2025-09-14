"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { accountCreateSchema, accountUpdateSchema, AccountInput, AccountUpdate } from '@/lib/schemas';
import { Account } from '@/types/database';
import { CURRENCIES } from '@/lib/currency';
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
import { useAccounts } from '@/hooks/useAccounts';
import { useSidebar } from '@/hooks/useSidebar';
import { useEffect } from 'react';

interface AccountFormProps {
  account?: Account;
  isEdit?: boolean;
}

const accountTypeOptions = [
  { value: 'asset', label: 'Activo' },
  { value: 'liability', label: 'Pasivo' },
  { value: 'income', label: 'Ingreso' },
  { value: 'expense', label: 'Gasto' },
  { value: 'equity', label: 'Patrimonio' }
];

export default function AccountForm({ account, isEdit = false }: AccountFormProps) {
  const { createAccount, updateAccount } = useAccounts();
  const { closeForm } = useSidebar();

  const form = useForm<AccountInput | AccountUpdate>({
    resolver: zodResolver(isEdit ? accountUpdateSchema : accountCreateSchema),
    defaultValues: isEdit && account ? {
      name: account.name,
      type: account.type,
      visible: account.visible,
      archived: account.archived,
      defaultCurrency: account.defaultCurrency,
      minorUnit: account.minorUnit,
      balance: account.balance,
    } : {
      name: '',
      type: 'asset',
      visible: true,
      archived: false,
      defaultCurrency: 'CLP',
      minorUnit: 0,
      balance: 0,
    }
  });

  // Update minor unit when currency changes
  const watchCurrency = form.watch('defaultCurrency');
  useEffect(() => {
    if (watchCurrency && CURRENCIES[watchCurrency]) {
      form.setValue('minorUnit', CURRENCIES[watchCurrency].minorUnit);
    }
  }, [watchCurrency, form]);

  const onSubmit = async (data: AccountInput | AccountUpdate) => {
    try {
      if (isEdit && account) {
        await updateAccount(account._id, data as AccountUpdate);
      } else {
        await createAccount(data as AccountInput);
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
              <FormLabel>Nombre de la Cuenta</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Cuenta Corriente Banco Estado" {...field} />
              </FormControl>
              <FormDescription>
                Un nombre descriptivo para identificar esta cuenta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Cuenta</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo de cuenta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accountTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                El tipo contable de la cuenta (activo, pasivo, ingreso, gasto, patrimonio).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultCurrency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Moneda</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la moneda" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([code, config]) => (
                    <SelectItem key={code} value={code}>
                      {config.symbol} {config.name} ({code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                La moneda principal de esta cuenta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Balance Inicial</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  {...field}
                  onChange={e => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>
                El balance actual o inicial de la cuenta.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="visible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Cuenta Visible
                  </FormLabel>
                  <FormDescription>
                    Mostrar esta cuenta en el dashboard y reportes.
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

          {isEdit && (
            <FormField
              control={form.control}
              name="archived"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Cuenta Archivada
                    </FormLabel>
                    <FormDescription>
                      Las cuentas archivadas no aparecen en las listas principales.
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
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting 
              ? 'Guardando...' 
              : isEdit 
                ? 'Actualizar Cuenta' 
                : 'Crear Cuenta'
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
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { transactionCreateSchema, TransactionInput } from "@/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TransactionFormProps {
  onClose?: () => void;
}

type TransactionType = "expense" | "income" | "transfer";

interface TransactionFormData extends Omit<TransactionInput, "tags"> {
  tags: string;
  type: TransactionType;
  amount: number;
  fromAccountId: string;
  toAccountId?: string;
}

export default function TransactionForm({ onClose }: TransactionFormProps) {
  const { createTransaction } = useTransactions();
  const { getCategoryOptions } = useCategories();
  const { accounts } = useAccounts();

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  const categoryOptions = getCategoryOptions();
  const accountOptions = accounts
    .filter((acc) => !acc.archived && acc.visible && acc._id)
    .map((acc) => ({
      value: acc._id,
      label: `${acc.name} (${acc.defaultCurrency})`,
      currency: acc.defaultCurrency,
    }));

  const transactionTypes = [
    { value: "expense", label: "Gasto" },
    { value: "income", label: "Ingreso" },
    { value: "transfer", label: "Transferencia" },
  ] as const;

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(
      transactionCreateSchema
        .omit({ tags: true })
        .extend({
          tags: z.string().optional(),
          type: z.enum(["expense", "income", "transfer"]),
          amount: z.number().positive("El monto debe ser mayor a 0"),
          fromAccountId: z.string().min(1, "La cuenta es requerida"),
          toAccountId: z.string().optional(),
        })
        .refine(
          (data) => {
            if (data.type === "transfer") {
              return (
                data.toAccountId && data.toAccountId !== data.fromAccountId
              );
            }
            return true;
          },
          {
            message:
              "Para transferencias, debe seleccionar una cuenta destino diferente",
            path: ["toAccountId"],
          }
        )
    ),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      categoryId: "",
      tags: "",
      type: "expense",
      amount: 0,
      fromAccountId: "",
      toAccountId: "",
    },
  });

  const watchedType = form.watch("type");
  const watchedFromAccountId = form.watch("fromAccountId");

  const createTransactionLines = (data: TransactionFormData) => {
    const amount = Math.round(data.amount * 100); // Convert to cents
    const categoryId =
      data.categoryId && data.categoryId !== "none"
        ? data.categoryId
        : undefined;

    // Get currency from the selected account
    const fromAccount = accounts.find((acc) => acc._id === data.fromAccountId);
    const toAccount = accounts.find((acc) => acc._id === data.toAccountId);

    if (!fromAccount) {
      throw new Error("From account not found");
    }

    const fromCurrency = fromAccount.defaultCurrency;

    switch (data.type) {
      case "expense":
        return [
          {
            accountId: data.fromAccountId,
            amount: -amount, // Credit the account (money going out)
            currency: fromCurrency,
            categoryId,
          },
          {
            accountId: "account::expense-account", // System expense account
            amount: amount, // Debit the expense
            currency: fromCurrency,
            categoryId,
          },
        ];

      case "income":
        return [
          {
            accountId: data.fromAccountId,
            amount: amount, // Debit the account (money coming in)
            currency: fromCurrency,
            categoryId,
          },
          {
            accountId: "account::income-account", // System income account
            amount: -amount, // Credit the income
            currency: fromCurrency,
            categoryId,
          },
        ];

      case "transfer":
        if (!toAccount) {
          throw new Error("To account not found");
        }
        const toCurrency = toAccount.defaultCurrency;

        return [
          {
            accountId: data.fromAccountId,
            amount: -amount, // Credit the from account
            currency: fromCurrency,
            categoryId,
          },
          {
            accountId: data.toAccountId!,
            amount: amount, // Debit the to account
            currency: toCurrency,
            categoryId,
          },
        ];

      default:
        throw new Error("Invalid transaction type");
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    try {
      const transactionInput: TransactionInput = {
        date: data.date,
        description: data.description,
        categoryId:
          data.categoryId && data.categoryId !== "none"
            ? data.categoryId
            : undefined,
        tags: data.tags
          ? data.tags.split(",").map((tag) => tag.trim())
          : undefined,
      };

      const lines = createTransactionLines(data);
      await createTransaction(transactionInput, lines);
      handleClose();
    } catch (error) {
      // Error toast is already handled by useTransactions hook
      console.error("Form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value
                        ? format(new Date(field.value), "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) =>
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                    }
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ej: Compra de supermercado en Jumbo"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría (Opcional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Transacción</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => {
            const selectedAccount = accounts.find(
              (acc) => acc._id === watchedFromAccountId
            );
            const currency = selectedAccount?.defaultCurrency || "CLP";
            return (
              <FormItem>
                <FormLabel>Monto ({currency})</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="fromAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {watchedType === "expense"
                  ? "Cuenta de Origen (Pagar desde)"
                  : watchedType === "income"
                  ? "Cuenta de Destino (Recibir en)"
                  : "Cuenta de Origen"}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accountOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedType === "transfer" && (
          <FormField
            control={form.control}
            name="toAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta de Destino</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta destino" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accountOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiquetas (Opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: urgente, familiar, trabajo (separadas por comas)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Etiquetas separadas por comas para categorizar mejor la
                transacción.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="p-3 bg-muted/50 rounded text-sm">
          <p className="font-medium mb-1">
            {watchedType === "expense"
              ? "💸 Gasto"
              : watchedType === "income"
              ? "💰 Ingreso"
              : "🔄 Transferencia"}
          </p>
          <p className="text-muted-foreground text-xs">
            {watchedType === "expense"
              ? "El dinero saldrá de la cuenta seleccionada"
              : watchedType === "income"
              ? "El dinero ingresará a la cuenta seleccionada"
              : "El dinero se moverá entre las cuentas seleccionadas"}
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="submit">
            Crear{" "}
            {watchedType === "expense"
              ? "Gasto"
              : watchedType === "income"
              ? "Ingreso"
              : "Transferencia"}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}

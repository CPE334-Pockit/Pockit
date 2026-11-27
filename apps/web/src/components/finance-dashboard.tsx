import {
  type AllocationKind,
  allocationKinds,
  allocationRules,
  hasRepeatedExpenseAccount,
} from "@Pockit/api/finance/allocations";
import type { AppRouter } from "@Pockit/api/routers/index";
import { Button } from "@Pockit/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@Pockit/ui/components/card";
import { Input } from "@Pockit/ui/components/input";
import { Label } from "@Pockit/ui/components/label";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Plus,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";

import { type AccountActions, AccountManagement } from "./account-management";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;
type Account = Outputs["finance"]["accounts"]["list"][number];
type Transaction = Outputs["finance"]["transactions"]["history"][number];
type Summary = Outputs["finance"]["summary"]["get"];
type TransactionInput = Inputs["finance"]["transactions"]["create"];
export type HistoryFilters = NonNullable<
  Inputs["finance"]["transactions"]["history"]
>;
type HistorySearch = {
  apply: (input?: HistoryFilters) => void;
  transactions: Transaction[];
  filtered: boolean;
  pending: boolean;
  error?: string;
  retry: () => void;
};
type OpeningBalanceInput = Inputs["finance"]["accounts"]["setOpeningBalance"];

type Action =
  | "opening"
  | "income"
  | "purchase"
  | "repayment"
  | "payment"
  | "receipt";
type AllocationDraft = { id: string; accountId: string; amount: string };

type CorrectionInput = Inputs["finance"]["transactions"]["correct"];
type CorrectionAudit =
  Outputs["finance"]["transactions"]["correctionHistory"][number];
type SelectedCorrection = {
  action: CorrectionInput["action"];
  transaction: Transaction;
};
type CorrectionActions = {
  correct: (input: CorrectionInput) => Promise<unknown>;
  pending: boolean;
  auditOpen: boolean;
  toggleAudit: () => void;
  audit: CorrectionAudit[];
  auditPending: boolean;
  auditError?: string;
  retryAudit: () => void;
};
type FavoriteActions = {
  transactions: Transaction[];
  setFavorite: (
    input: Inputs["finance"]["transactions"]["setFavorite"],
  ) => Promise<unknown>;
  pending: boolean;
  loading: boolean;
  error?: string;
  retry: () => void;
};

type FinanceDashboardProps = {
  name: string;
  accounts: Account[];
  transactions: Transaction[];
  historySearch?: HistorySearch;
  correctionActions?: CorrectionActions;
  favoriteActions?: FavoriteActions;
  summary: Summary;
  accountActions: AccountActions;
  openingBalancePending?: boolean;
  transactionPending?: boolean;
  onSetOpeningBalance: (input: OpeningBalanceInput) => Promise<void>;
  onCreateTransaction: (input: TransactionInput) => Promise<void>;
};

const actionDetails: Record<Action, { label: string; hint: string }> = {
  opening: {
    label: "Starting balance",
    hint: "Set an account’s opening position.",
  },
  income: {
    label: "Income received",
    hint: "Log salary or another income receipt.",
  },
  purchase: {
    label: "Card purchase",
    hint: "Split a card charge across categories.",
  },
  payment: {
    label: "Payment or charge",
    hint: "Split an outgoing amount across several accounts.",
  },
  receipt: {
    label: "Receive money",
    hint: "Split an incoming amount across several sources.",
  },
  repayment: {
    label: "Repay card",
    hint: "Record a payment from your bank account.",
  },
};

function toMinorUnits(value: string): bigint | null {
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) return null;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -units : units;
}

function formatMinorUnits(value: bigint): string {
  const sign = value < 0n ? "−" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

function formatMoney(value: string | null | undefined): string {
  return `฿${value ?? "0.00"}`;
}

function totalMoney(values: (string | null)[]): string {
  const total = values.reduce(
    (sum, value) => sum + (value ? (toMinorUnits(value) ?? 0n) : 0n),
    0n,
  );
  return formatMinorUnits(total);
}

function allocationsMatch(
  total: string,
  allocations: AllocationDraft[],
): boolean {
  const totalUnits = toMinorUnits(total);
  if (totalUnits === null || totalUnits <= 0n || allocations.length === 0)
    return false;
  const amounts = allocations.map(({ amount }) => toMinorUnits(amount));
  return (
    amounts.every((amount) => amount !== null && amount > 0n) &&
    amounts.reduce<bigint>((sum, amount) => sum + (amount ?? 0n), 0n) ===
      totalUnits
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label
        htmlFor={id}
        className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function activeAccountId(accounts: Account[], selected: string) {
  return accounts.some(({ id }) => id === selected) ? selected : "";
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Account[];
  placeholder: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const selected = options.some(({ id }) => id === value) ? value : "";
  const seenNames = new Set<string>();
  const duplicateNames = new Set<string>();
  for (const { name } of options) {
    if (seenNames.has(name)) duplicateNames.add(name);
    seenNames.add(name);
  }
  return (
    <Field id={id} label={label}>
      <select
        id={id}
        value={selected}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || options.length === 0}
        required={required}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full border px-3 text-sm transition-colors outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {(!selected || !required) && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {duplicateNames.has(option.name)
              ? `${option.name} · ${formatMoney(option.balance ?? option.categoryTotal)} · ${option.id}`
              : option.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function DateField({
  id = "transaction-date",
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field id={id} label="Transaction date">
      <div className="relative">
        <Input
          id={id}
          type="date"
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
          required
          disabled={disabled}
          className="h-9 pl-9 text-sm [color-scheme:dark]"
        />
        <CalendarDays
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
      </div>
    </Field>
  );
}

function AmountField({
  id,
  label,
  value,
  onChange,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <Field id={id} label={label}>
      <div className="relative">
        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
          ฿
        </span>
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
          required
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="h-9 pl-8 text-sm tabular-nums"
        />
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </Field>
  );
}

function MoneyMovementForm({
  form,
  accounts,
  busy,
  onPost,
  initialDraft,
  saveLabel,
  canSubmit = true,
}: {
  form: TransactionInput["form"];
  accounts: Account[];
  busy: boolean;
  onPost: (input: TransactionInput) => Promise<void>;
  initialDraft?: TransactionInput;
  saveLabel?: string;
  canSubmit?: boolean;
}) {
  const fieldId = useId();
  const isPayment = form === "PAYMENT_CHARGE";
  const initialKind = isPayment ? "EXPENSE" : "INCOME";
  type Line = AllocationDraft & { kind: AllocationKind };
  const draft = initialDraft;
  const [sourceSelection, setSource] = useState(draft?.sourceAccountId ?? "");
  const [total, setTotal] = useState(draft?.totalAmount ?? "");
  const [date, setDate] = useState(draft?.transactionDate ?? "");
  const [description, setDescription] = useState(draft?.description ?? "");
  const [lines, setLines] = useState<Line[]>(() =>
    draft?.allocations.length
      ? draft.allocations.map((line, index) => ({
          ...line,
          id: `existing-${index}`,
        }))
      : [{ id: "initial", kind: initialKind, accountId: "", amount: "" }],
  );
  const [error, setError] = useState("");
  const availableSources = accounts.filter(
    ({ type }) => type === "CASH" || (isPayment && type === "LOAN_TAKEN"),
  );
  const source = availableSources.find(({ id }) => id === sourceSelection);
  const allowedKinds = allocationKinds.filter(
    (kind) => allocationRules[kind].form === form,
  );
  const lineOptions = lines.map(({ kind }) =>
    accounts.filter(
      ({ id, type }) =>
        id !== source?.id && type === allocationRules[kind].accountType,
    ),
  );
  const duplicateExpense =
    source?.type === "LOAN_TAKEN" && hasRepeatedExpenseAccount(lines);
  const remaining =
    (toMinorUnits(total) ?? 0n) -
    lines.reduce((sum, { amount }) => sum + (toMinorUnits(amount) ?? 0n), 0n);
  const canPost =
    source &&
    date &&
    canSubmit &&
    !duplicateExpense &&
    allocationsMatch(total, lines) &&
    lines.every(({ accountId }, index) =>
      lineOptions[index]?.some(({ id }) => id === accountId),
    );

  function editLine(id: string, changes: Partial<Omit<Line, "id">>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...changes } : line)),
    );
  }

  async function post() {
    if (busy || !canPost || !source) return;
    setError("");
    try {
      await onPost({
        form,
        sourceAccountId: source.id,
        totalAmount: total,
        transactionDate: date,
        description: description || undefined,
        allocations: lines.map(({ accountId, amount, kind }) => ({
          accountId,
          amount,
          kind,
        })),
      });
      setTotal("");
      setDate("");
      setDescription("");
      setLines([
        { id: "initial", kind: initialKind, accountId: "", amount: "" },
      ]);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The transaction could not be saved.",
      );
    }
  }

  return (
    <form
      className="border-border/70 border-t pt-5"
      onSubmit={(event) => {
        event.preventDefault();
        void post();
      }}
    >
      <fieldset className="flex min-w-0 flex-col gap-4" disabled={busy}>
        <SelectField
          id={`${fieldId}-account`}
          label={isPayment ? "Paid from" : "Receiving account"}
          value={sourceSelection}
          onChange={(accountId) => {
            setSource(accountId);
            setLines((current) =>
              current.map((line) =>
                line.accountId === accountId
                  ? { ...line, accountId: "" }
                  : line,
              ),
            );
          }}
          options={availableSources}
          placeholder="Choose an account"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField
            id={`${fieldId}-total`}
            label="Transaction total"
            value={total}
            onChange={setTotal}
          />
          <DateField id={`${fieldId}-date`} value={date} onChange={setDate} />
        </div>
        <Field id={`${fieldId}-description`} label="Description (optional)">
          <Input
            id={`${fieldId}-description`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <p className="text-muted-foreground text-sm tabular-nums">
          Remaining to allocate: {formatMoney(formatMinorUnits(remaining))}
        </p>
        {duplicateExpense ? (
          <p role="alert" className="text-destructive text-sm">
            Use each expense category only once.
          </p>
        ) : null}
        {lines.map((line, index) => (
          <div
            key={line.id}
            className="border-border grid gap-3 border p-3 sm:grid-cols-2"
          >
            <Field
              id={`${fieldId}-kind-${index}`}
              label={`Allocation type ${index + 1}`}
            >
              <select
                id={`${fieldId}-kind-${index}`}
                value={line.kind}
                className="border-input bg-background h-9 w-full border px-3 text-sm"
                onChange={(event) =>
                  editLine(line.id, {
                    kind: event.target.value as AllocationKind,
                    accountId: "",
                  })
                }
              >
                {allowedKinds.map((kind) => (
                  <option key={kind} value={kind}>
                    {allocationRules[kind].label}
                  </option>
                ))}
              </select>
            </Field>
            <SelectField
              id={`${fieldId}-counterpart-${index}`}
              label={`Allocation account ${index + 1}`}
              value={line.accountId}
              onChange={(accountId) => editLine(line.id, { accountId })}
              options={lineOptions[index] ?? []}
              placeholder="Choose an account"
            />
            <AmountField
              id={`${fieldId}-amount-${index}`}
              label={`Allocation amount ${index + 1}`}
              value={line.amount}
              onChange={(amount) => editLine(line.id, { amount })}
            />
            {lines.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-end"
                aria-label={`Remove allocation ${index + 1}`}
                onClick={() =>
                  setLines((current) =>
                    current.filter(({ id }) => id !== line.id),
                  )
                }
              >
                Remove
              </Button>
            ) : null}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() =>
            setLines((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                kind: initialKind,
                accountId: "",
                amount: "",
              },
            ])
          }
        >
          <Plus data-icon="inline-start" aria-hidden="true" /> Add allocation
        </Button>
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={!canPost || busy}
          className="self-start"
        >
          {busy
            ? "Saving entry…"
            : (saveLabel ??
              (isPayment ? "Record payment or charge" : "Record receipt"))}
        </Button>
      </fieldset>
    </form>
  );
}

function draftFromTransaction(transaction: Transaction): TransactionInput {
  return {
    form:
      transaction.form === "PAYMENT_CHARGE"
        ? "PAYMENT_CHARGE"
        : "RECEIVE_MONEY",
    sourceAccountId: transaction.sourceAccountId,
    totalAmount: transaction.totalAmount,
    transactionDate: transaction.transactionDate,
    description: transaction.description ?? undefined,
    allocations: transaction.allocations.map(({ accountId, amount, kind }) => ({
      accountId,
      amount,
      kind: kind as AllocationKind,
    })),
  };
}

function CorrectionEditor({
  selection,
  accounts,
  busy,
  complete,
  cancel,
}: {
  selection: SelectedCorrection;
  accounts: Account[];
  busy: boolean;
  complete: (input: CorrectionInput) => Promise<void>;
  cancel: () => void;
}) {
  const { action, transaction } = selection;
  const original = draftFromTransaction(transaction);
  const originalForm = original.form;
  const [form, setForm] = useState<TransactionInput["form"]>(originalForm);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const ready = confirmed && reason.trim().length > 0 && !busy;
  const replacement = action === "REPLACE";

  async function voidTransaction() {
    if (!ready) return;
    setError("");
    try {
      await complete({
        action: "VOID",
        transactionId: transaction.id,
        reason: reason.trim(),
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The transaction could not be voided.",
      );
    }
  }

  return (
    <section
      aria-label="Transaction correction"
      className="border-border flex flex-col gap-3 border-b p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          {replacement ? "Replace transaction" : "Void transaction"}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={cancel}
          disabled={busy}
        >
          Cancel correction
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        {transaction.description || transaction.transactionDate} ·{" "}
        {formatMoney(transaction.totalAmount)}
      </p>
      {replacement ? (
        <Field id="replacement-form" label="Replacement form">
          <select
            id="replacement-form"
            value={form}
            disabled={busy}
            className="border-input bg-background h-9 w-full border px-3 text-sm"
            onChange={(event) =>
              setForm(event.target.value as TransactionInput["form"])
            }
          >
            <option value="PAYMENT_CHARGE">Payment or charge</option>
            <option value="RECEIVE_MONEY">Receive money</option>
          </select>
        </Field>
      ) : null}
      <Field id="correction-reason" label="Correction reason">
        <Input
          id="correction-reason"
          value={reason}
          onInput={(event) => setReason(event.currentTarget.value)}
          disabled={busy}
        />
      </Field>
      <div className="flex items-center gap-2">
        <input
          id="confirm-correction"
          type="checkbox"
          checked={confirmed}
          disabled={busy}
          onChange={(event) => setConfirmed(event.currentTarget.checked)}
        />
        <Label htmlFor="confirm-correction">
          Confirm {replacement ? "replacement" : "void"}
        </Label>
      </div>
      {replacement ? (
        <MoneyMovementForm
          key={form}
          form={form}
          accounts={accounts}
          busy={busy}
          saveLabel="Save replacement"
          canSubmit={ready}
          initialDraft={
            form === originalForm
              ? original
              : { ...original, form, sourceAccountId: "", allocations: [] }
          }
          onPost={(draft) =>
            complete({
              action: "REPLACE",
              transactionId: transaction.id,
              reason: reason.trim(),
              replacement: draft,
            })
          }
        />
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="self-start"
          disabled={!ready}
          onClick={() => void voidTransaction()}
        >
          Void transaction
        </Button>
      )}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function CorrectionHistory({
  actions,
  accounts,
}: {
  actions: CorrectionActions;
  accounts: Account[];
}) {
  const accountNames = new Map(accounts.map(({ id, name }) => [id, name]));
  if (actions.auditPending)
    return (
      <p role="status" className="text-muted-foreground p-4 text-sm">
        Loading correction history…
      </p>
    );
  if (actions.auditError)
    return (
      <div className="flex flex-col gap-2 p-4">
        <p role="alert" className="text-destructive text-sm">
          {actions.auditError}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={actions.retryAudit}
        >
          Retry correction history
        </Button>
      </div>
    );
  if (!actions.audit.length)
    return (
      <p className="text-muted-foreground p-4 text-sm">
        No corrections recorded.
      </p>
    );
  return (
    <ol
      aria-label="Transaction correction history"
      className="divide-border divide-y"
    >
      {actions.audit.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-2 px-4 py-3 text-sm">
          <p className="font-medium">
            {entry.action === "REPLACE" ? "Replaced" : "Voided"} ·{" "}
            {entry.reason}
          </p>
          <time
            className="text-muted-foreground text-xs"
            dateTime={entry.recordedAt}
          >
            {entry.recordedAt.slice(0, 19).replace("T", " ")} UTC
          </time>
          {(
            [
              ["Original", entry.original],
              ["Replacement", entry.replacement],
            ] as const
          ).map(([label, transaction]) =>
            transaction ? (
              <details key={label}>
                <summary>
                  {label} · {transaction.transactionDate} ·{" "}
                  {formatMoney(transaction.totalAmount)}
                </summary>
                <p className="text-muted-foreground">
                  {transaction.description ||
                    accountNames.get(transaction.sourceAccountId)}
                </p>
                <ul className="text-muted-foreground flex flex-col gap-1 pl-4 text-xs">
                  {transaction.allocations.map((allocation) => (
                    <li key={allocation.id}>
                      {allocation.accountName} ·{" "}
                      {formatMoney(allocation.amount)}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null,
          )}
        </li>
      ))}
    </ol>
  );
}

function HistoryFilterForm({
  accounts,
  apply,
}: {
  accounts: Account[];
  apply: HistorySearch["apply"];
}) {
  const [accountSelection, setAccount] = useState("");
  const [validation, setValidation] = useState("");
  return (
    <form
      aria-label="Transaction history filters"
      className="border-border flex flex-col gap-3 border-b p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const search = String(data.get("search") ?? "").trim() || undefined;
        const fromDate = String(data.get("from") ?? "") || undefined;
        const toDate = String(data.get("to") ?? "") || undefined;
        if (fromDate && toDate && fromDate > toDate) {
          setValidation("The start date must be on or before the end date.");
          return;
        }
        setValidation("");
        const form = data.get("form");
        const input: HistoryFilters = {
          search,
          fromDate,
          toDate,
          form:
            form === "RECEIVE_MONEY" || form === "PAYMENT_CHARGE"
              ? form
              : undefined,
          accountId: activeAccountId(accounts, accountSelection) || undefined,
        };
        apply(Object.values(input).some(Boolean) ? input : undefined);
      }}
      onReset={() => {
        setAccount("");
        setValidation("");
        apply();
      }}
    >
      <Field id="history-search" label="Search">
        <Input
          id="history-search"
          name="search"
          type="search"
          placeholder="Description or account name"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="history-from" label="From">
          <Input id="history-from" name="from" type="date" />
        </Field>
        <Field id="history-to" label="To">
          <Input id="history-to" name="to" type="date" />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="history-form" label="Form">
          <select
            id="history-form"
            name="form"
            className="border-input bg-background h-9 w-full border px-3 text-sm"
          >
            <option value="">All forms</option>
            <option value="PAYMENT_CHARGE">Payment or charge</option>
            <option value="RECEIVE_MONEY">Receive money</option>
          </select>
        </Field>
        <SelectField
          id="history-account"
          label="Account filter"
          value={accountSelection}
          onChange={setAccount}
          options={accounts}
          placeholder="All accounts"
          required={false}
        />
      </div>
      {validation ? (
        <p role="alert" className="text-destructive text-sm">
          {validation}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm">
          Apply filters
        </Button>
        <Button type="reset" size="sm" variant="ghost">
          Clear filters
        </Button>
      </div>
    </form>
  );
}

function ActionButton({
  action,
  active,
  icon,
  onClick,
}: {
  action: Action;
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  const { label, hint } = actionDetails[action];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-20 min-w-0 flex-1 items-start gap-3 border p-3 text-left transition-colors sm:p-4 ${active ? "border-primary/60 bg-primary/10" : "border-border bg-background/40 hover:bg-muted/60"}`}
    >
      <span
        className={`mt-0.5 grid size-8 shrink-0 place-items-center ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground mt-1 block text-xs leading-relaxed">
          {hint}
        </span>
      </span>
    </button>
  );
}

export function FinanceDashboard({
  name,
  accounts,
  transactions,
  historySearch,
  correctionActions,
  favoriteActions,
  summary,
  accountActions,
  openingBalancePending = false,
  transactionPending = false,
  onSetOpeningBalance,
  onCreateTransaction,
}: FinanceDashboardProps) {
  const cashAccounts = accounts.filter((account) => account.type === "CASH");
  const loanAccounts = accounts.filter(
    (account) => account.type === "LOAN_TAKEN",
  );
  const incomeAccounts = accounts.filter(
    (account) => account.type === "INCOME",
  );
  const expenseAccounts = accounts.filter(
    (account) => account.type === "EXPENSE",
  );
  const [selectedCorrection, setSelectedCorrection] =
    useState<SelectedCorrection | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [duplicate, setDuplicate] = useState<Transaction | null>(null);
  const duplicateDraft = duplicate ? draftFromTransaction(duplicate) : null;
  const favoriteIds = new Set(
    favoriteActions?.transactions.map(({ id }) => id),
  );
  const visibleTransactions = favoritesOpen
    ? (favoriteActions?.transactions ?? [])
    : (historySearch?.transactions ?? transactions);
  const listPending = favoritesOpen
    ? favoriteActions?.loading
    : historySearch?.pending;
  const listError = favoritesOpen
    ? favoriteActions?.error
    : historySearch?.error;
  const listRetry = favoritesOpen
    ? favoriteActions?.retry
    : historySearch?.retry;
  const postedAccountIds = new Set(
    transactions.flatMap(({ sourceAccountId, allocations }) => [
      sourceAccountId,
      ...allocations.map(({ accountId }) => accountId),
    ]),
  );
  const accountsNeedingOpeningBalance = accounts.filter(
    (account) =>
      account.openingBalanceEligible && !postedAccountIds.has(account.id),
  );
  const [activeAction, setActiveAction] = useState<Action>(() =>
    accountsNeedingOpeningBalance.length > 0 ? "opening" : "income",
  );
  const [openingSelection, setOpeningAccountId] = useState(
    accountsNeedingOpeningBalance[0]?.id ?? "",
  );
  const openingAccountId = activeAccountId(
    accountsNeedingOpeningBalance,
    openingSelection,
  );
  const [openingAmount, setOpeningAmount] = useState("");
  const [incomeCashSelection, setIncomeCashId] = useState(
    cashAccounts[0]?.id ?? "",
  );
  const [incomeCategorySelection, setIncomeCategoryId] = useState(
    incomeAccounts[0]?.id ?? "",
  );
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");
  const [incomeDescription, setIncomeDescription] = useState("Salary");
  const [purchaseCardSelection, setPurchaseCardId] = useState(
    loanAccounts[0]?.id ?? "",
  );
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseDescription, setPurchaseDescription] = useState("");
  const [purchaseAllocations, setPurchaseAllocations] = useState<
    AllocationDraft[]
  >(() =>
    expenseAccounts.slice(0, 2).map((account) => ({
      id: crypto.randomUUID(),
      accountId: account.id,
      amount: "",
    })),
  );
  const [repaymentCashSelection, setRepaymentCashId] = useState(
    cashAccounts[0]?.id ?? "",
  );
  const [repaymentCardSelection, setRepaymentCardId] = useState(
    loanAccounts[0]?.id ?? "",
  );
  const [repaymentAmount, setRepaymentAmount] = useState("");
  const [repaymentDate, setRepaymentDate] = useState("");

  const incomeCashId = activeAccountId(cashAccounts, incomeCashSelection);
  const incomeCategoryId = activeAccountId(
    incomeAccounts,
    incomeCategorySelection,
  );
  const purchaseCardId = activeAccountId(loanAccounts, purchaseCardSelection);
  const repaymentCashId = activeAccountId(cashAccounts, repaymentCashSelection);
  const repaymentCardId = activeAccountId(loanAccounts, repaymentCardSelection);
  const isBusy =
    openingBalancePending ||
    transactionPending ||
    (correctionActions?.pending ?? false);
  const cashTotal = totalMoney(
    summary.balances
      .filter((account) => account.type === "CASH")
      .map((account) => account.balance),
  );
  const cardDebt = totalMoney(
    summary.balances
      .filter((account) => account.type === "LOAN_TAKEN")
      .map((account) => account.balance),
  );
  const selectedPurchaseCategories = new Set(
    purchaseAllocations.map(({ accountId }) => accountId).filter(Boolean),
  );
  const unusedPurchaseCategory = expenseAccounts.find(
    ({ id }) => !selectedPurchaseCategories.has(id),
  );
  const hasDuplicatePurchaseCategory = hasRepeatedExpenseAccount(
    purchaseAllocations.map(({ accountId }) => ({
      accountId,
      kind: "EXPENSE",
    })),
  );
  const canPostPurchase =
    !hasDuplicatePurchaseCategory &&
    allocationsMatch(purchaseAmount, purchaseAllocations) &&
    purchaseAllocations.length > 0 &&
    purchaseAllocations.every(({ accountId }) =>
      expenseAccounts.some((account) => account.id === accountId),
    );

  async function submit(promise: Promise<void>, reset: () => void) {
    try {
      await promise;
      reset();
    } catch {
      // The page mutation reports a user-safe error through the global toast.
    }
  }

  return (
    <main className="bg-background min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-4 pt-7 pb-12 sm:px-6 lg:px-8 lg:pt-10">
        <div className="flex flex-col gap-6">
          <section className="border-border flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-end">
            <div>
              <div className="text-primary mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase">
                <span className="bg-primary size-1.5" />
                Personal finance, in focus
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Good to see you, {name.split(" ")[0]}.
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
                A clear view of what came in, what went out, and where you
                stand.
              </p>
            </div>
            <div className="border-border text-muted-foreground flex items-center gap-2 self-start border px-3 py-2 text-xs sm:self-auto">
              <CalendarDays
                aria-hidden="true"
                className="text-primary size-4"
              />
              <span>All-time overview</span>
            </div>
          </section>

          <section
            aria-label="Financial overview"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Card className="border-l-primary bg-card border-l-2">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Cash on hand{" "}
                  <Wallet aria-hidden="true" className="text-primary size-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(cashTotal)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Across {cashAccounts.length} Cash{" "}
                  {cashAccounts.length === 1 ? "Account" : "Accounts"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-l-2 border-l-amber-500">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Card debt{" "}
                  <CreditCard
                    aria-hidden="true"
                    className="size-4 text-amber-400"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(cardDebt)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Outstanding across {loanAccounts.length} Loan Taken{" "}
                  {loanAccounts.length === 1 ? "Account" : "Accounts"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Income{" "}
                  <ArrowDownLeft
                    aria-hidden="true"
                    className="size-4 text-emerald-400"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(summary.incomeTotal)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Recorded receipts
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardHeader className="pb-1">
                <CardTitle className="text-muted-foreground flex items-center justify-between text-xs font-medium tracking-[0.12em] uppercase">
                  Expenses{" "}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 text-rose-400"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">
                  {formatMoney(summary.expenseTotal)}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    THB
                  </span>
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Card purchases and spending
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
            <Card className="border-border/80">
              <CardHeader className="border-border/70 border-b pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
                      Your ledger
                    </p>
                    <CardTitle className="mt-2 text-xl">
                      Make a money move
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Every entry is saved to your private financial ledger.
                    </p>
                  </div>
                  <CircleDollarSign
                    aria-hidden="true"
                    className="text-muted-foreground mt-1 size-5"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <ActionButton
                    action="opening"
                    active={activeAction === "opening"}
                    icon={<Banknote className="size-4" />}
                    onClick={() => setActiveAction("opening")}
                  />
                  <ActionButton
                    action="income"
                    active={activeAction === "income"}
                    icon={<ArrowDownLeft className="size-4" />}
                    onClick={() => setActiveAction("income")}
                  />
                  <ActionButton
                    action="purchase"
                    active={activeAction === "purchase"}
                    icon={<CreditCard className="size-4" />}
                    onClick={() => setActiveAction("purchase")}
                  />
                  <ActionButton
                    action="repayment"
                    active={activeAction === "repayment"}
                    icon={<ArrowUpRight className="size-4" />}
                    onClick={() => setActiveAction("repayment")}
                  />
                  <ActionButton
                    action="payment"
                    active={activeAction === "payment"}
                    icon={<ArrowUpRight className="size-4" />}
                    onClick={() => setActiveAction("payment")}
                  />
                  <ActionButton
                    action="receipt"
                    active={activeAction === "receipt"}
                    icon={<ArrowDownLeft className="size-4" />}
                    onClick={() => setActiveAction("receipt")}
                  />
                </div>

                {activeAction === "payment" || activeAction === "receipt" ? (
                  <MoneyMovementForm
                    key={activeAction}
                    form={
                      activeAction === "payment"
                        ? "PAYMENT_CHARGE"
                        : "RECEIVE_MONEY"
                    }
                    accounts={accounts}
                    busy={isBusy}
                    onPost={onCreateTransaction}
                  />
                ) : null}

                {activeAction === "opening" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(
                        onSetOpeningBalance({
                          accountId: openingAccountId,
                          amount: openingAmount,
                        }),
                        () => setOpeningAmount(""),
                      );
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center">
                        <Banknote className="size-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-medium">
                          Start with the right baseline
                        </h2>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          Record a starting Cash balance, amount owed to you, or
                          debt. This does not affect income or expenses.
                        </p>
                      </div>
                    </div>
                    {accountsNeedingOpeningBalance.length === 0 ? (
                      <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-300">
                        <Check aria-hidden="true" className="size-4" />
                        No accounts are eligible for an opening balance.
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <SelectField
                          id="opening-account"
                          label="Account"
                          value={openingAccountId}
                          onChange={setOpeningAccountId}
                          options={accountsNeedingOpeningBalance}
                          placeholder="Choose an account"
                          disabled={isBusy}
                        />
                        <AmountField
                          id="opening-amount"
                          label="Opening balance"
                          value={openingAmount}
                          onChange={setOpeningAmount}
                          hint="Use THB with up to two decimal places."
                          disabled={isBusy}
                        />
                        <div className="sm:col-span-2">
                          <Button
                            type="submit"
                            disabled={
                              isBusy ||
                              !openingAccountId ||
                              (toMinorUnits(openingAmount) ?? 0n) <= 0n
                            }
                            className="w-full sm:w-auto"
                          >
                            {openingBalancePending
                              ? "Saving balance…"
                              : "Save opening balance"}
                            <ChevronRight aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </form>
                )}

                {activeAction === "income" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(
                        onCreateTransaction({
                          form: "RECEIVE_MONEY",
                          sourceAccountId: incomeCashId,
                          totalAmount: incomeAmount,
                          transactionDate: incomeDate,
                          description: incomeDescription || undefined,
                          allocations: [
                            {
                              kind: "INCOME",
                              accountId: incomeCategoryId,
                              amount: incomeAmount,
                            },
                          ],
                        }),
                        () => {
                          setIncomeAmount("");
                          setIncomeDate("");
                        },
                      );
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        id="income-cash"
                        label="Received into"
                        value={incomeCashId}
                        onChange={setIncomeCashId}
                        options={cashAccounts}
                        placeholder="Choose a Cash account"
                        disabled={isBusy}
                      />
                      <SelectField
                        id="income-category"
                        label="Income category"
                        value={incomeCategoryId}
                        onChange={setIncomeCategoryId}
                        options={incomeAccounts}
                        placeholder="Choose a category"
                        disabled={isBusy}
                      />
                      <AmountField
                        id="income-amount"
                        label="Amount received"
                        value={incomeAmount}
                        onChange={setIncomeAmount}
                        disabled={isBusy}
                      />
                      <DateField
                        value={incomeDate}
                        onChange={setIncomeDate}
                        disabled={isBusy}
                      />
                      <Field id="income-description" label="Description">
                        <Input
                          id="income-description"
                          value={incomeDescription}
                          onInput={(event) =>
                            setIncomeDescription(event.currentTarget.value)
                          }
                          disabled={isBusy}
                          className="h-9 text-sm"
                        />
                      </Field>
                      <div className="flex items-end">
                        <Button
                          type="submit"
                          disabled={
                            isBusy ||
                            !incomeCashId ||
                            !incomeCategoryId ||
                            (toMinorUnits(incomeAmount) ?? 0n) <= 0n ||
                            !incomeDate
                          }
                          className="w-full"
                        >
                          {transactionPending
                            ? "Saving entry…"
                            : "Record income"}
                          <ChevronRight aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Income increases the selected Cash balance and category
                      total.
                    </p>
                  </form>
                )}

                {activeAction === "purchase" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (!canPostPurchase) return;
                      void submit(
                        onCreateTransaction({
                          form: "PAYMENT_CHARGE",
                          sourceAccountId: purchaseCardId,
                          totalAmount: purchaseAmount,
                          transactionDate: purchaseDate,
                          description: purchaseDescription || undefined,
                          allocations: purchaseAllocations.map(
                            ({ accountId, amount }) => ({
                              kind: "EXPENSE" as const,
                              accountId,
                              amount,
                            }),
                          ),
                        }),
                        () => {
                          setPurchaseAmount("");
                          setPurchaseDate("");
                          setPurchaseDescription("");
                          setPurchaseAllocations(
                            expenseAccounts.slice(0, 2).map((account) => ({
                              id: crypto.randomUUID(),
                              accountId: account.id,
                              amount: "",
                            })),
                          );
                        },
                      );
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        id="purchase-card"
                        label="Charged to"
                        value={purchaseCardId}
                        onChange={setPurchaseCardId}
                        options={loanAccounts}
                        placeholder="Choose a card"
                        disabled={isBusy}
                      />
                      <AmountField
                        id="purchase-total"
                        label="Purchase total"
                        value={purchaseAmount}
                        onChange={setPurchaseAmount}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="border-border/70 bg-muted/20 space-y-3 border p-3 sm:p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-sm font-medium">
                            Split by category
                          </h2>
                          <p className="text-muted-foreground mt-1 text-xs">
                            Allocation total must match the purchase total.
                          </p>
                        </div>
                        <span
                          className={`text-xs tabular-nums ${canPostPurchase ? "text-emerald-400" : "text-muted-foreground"}`}
                        >
                          Allocated{" "}
                          {formatMoney(
                            totalMoney(
                              purchaseAllocations.map(
                                (allocation) => allocation.amount,
                              ),
                            ),
                          )}{" "}
                          / {formatMoney(purchaseAmount || "0.00")}
                        </span>
                      </div>
                      {hasDuplicatePurchaseCategory ? (
                        <p role="alert" className="text-destructive text-sm">
                          Use each expense category only once.
                        </p>
                      ) : null}
                      {purchaseAllocations.map((allocation, index) => (
                        <div
                          key={allocation.id}
                          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,0.6fr)_auto] sm:items-end"
                        >
                          <SelectField
                            id={`expense-category-${index}`}
                            label={`Expense category ${index + 1}`}
                            value={allocation.accountId}
                            onChange={(accountId) =>
                              setPurchaseAllocations((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, accountId }
                                    : entry,
                                ),
                              )
                            }
                            options={expenseAccounts}
                            placeholder="Choose a category"
                            disabled={isBusy}
                          />
                          <AmountField
                            id={`expense-amount-${index}`}
                            label="Allocated amount"
                            value={allocation.amount}
                            onChange={(amount) =>
                              setPurchaseAllocations((current) =>
                                current.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? { ...entry, amount }
                                    : entry,
                                ),
                              )
                            }
                            disabled={isBusy}
                          />
                          {purchaseAllocations.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={`Remove category ${index + 1}`}
                              disabled={isBusy}
                              onClick={() =>
                                setPurchaseAllocations((current) =>
                                  current.filter(
                                    (_, entryIndex) => entryIndex !== index,
                                  ),
                                )
                              }
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isBusy || !unusedPurchaseCategory}
                        onClick={() => {
                          if (!unusedPurchaseCategory) return;
                          setPurchaseAllocations((current) => [
                            ...current,
                            {
                              id: crypto.randomUUID(),
                              accountId: unusedPurchaseCategory.id,
                              amount: "",
                            },
                          ]);
                        }}
                      >
                        <Plus aria-hidden="true" />
                        Add category
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DateField
                        value={purchaseDate}
                        onChange={setPurchaseDate}
                        disabled={isBusy}
                      />
                      <Field id="purchase-description" label="Description">
                        <Input
                          id="purchase-description"
                          value={purchaseDescription}
                          onInput={(event) =>
                            setPurchaseDescription(event.currentTarget.value)
                          }
                          placeholder="e.g. Weekly groceries"
                          disabled={isBusy}
                          className="h-9 text-sm"
                        />
                      </Field>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground text-xs">
                        The purchase increases card debt and records Expense
                        categories.
                      </p>
                      <Button
                        type="submit"
                        disabled={
                          isBusy ||
                          !purchaseCardId ||
                          !purchaseDate ||
                          !canPostPurchase
                        }
                        className="w-full sm:w-auto"
                      >
                        {transactionPending
                          ? "Saving entry…"
                          : "Record card purchase"}
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </div>
                  </form>
                )}

                {activeAction === "repayment" && (
                  <form
                    className="border-border/70 grid gap-4 border-t pt-5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submit(
                        onCreateTransaction({
                          form: "PAYMENT_CHARGE",
                          sourceAccountId: repaymentCashId,
                          totalAmount: repaymentAmount,
                          transactionDate: repaymentDate,
                          description: "Credit-card repayment",
                          allocations: [
                            {
                              kind: "LOAN_TAKEN_REPAYMENT",
                              accountId: repaymentCardId,
                              amount: repaymentAmount,
                            },
                          ],
                        }),
                        () => {
                          setRepaymentAmount("");
                          setRepaymentDate("");
                        },
                      );
                    }}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        id="repayment-cash"
                        label="Pay from"
                        value={repaymentCashId}
                        onChange={setRepaymentCashId}
                        options={cashAccounts}
                        placeholder="Choose a Cash account"
                        disabled={isBusy}
                      />
                      <SelectField
                        id="repayment-card"
                        label="Repay card"
                        value={repaymentCardId}
                        onChange={setRepaymentCardId}
                        options={loanAccounts}
                        placeholder="Choose a card"
                        disabled={isBusy}
                      />
                      <AmountField
                        id="repayment-amount"
                        label="Payment amount"
                        value={repaymentAmount}
                        onChange={setRepaymentAmount}
                        disabled={isBusy}
                      />
                      <DateField
                        value={repaymentDate}
                        onChange={setRepaymentDate}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground text-xs">
                        Repayment reduces Cash and card debt, not Income or
                        Expenses.
                      </p>
                      <Button
                        type="submit"
                        disabled={
                          isBusy ||
                          !repaymentCashId ||
                          !repaymentCardId ||
                          !repaymentDate ||
                          (toMinorUnits(repaymentAmount) ?? 0n) <= 0n
                        }
                        className="w-full sm:w-auto"
                      >
                        {transactionPending
                          ? "Saving entry…"
                          : "Record repayment"}
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/80">
              <CardHeader className="border-border/70 border-b pb-4">
                <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Recent activity
                </p>
                <div className="flex items-end justify-between gap-3">
                  <CardTitle className="mt-1 text-xl">
                    {favoritesOpen
                      ? "Favorite transactions"
                      : "Your transactions"}
                  </CardTitle>
                  <span className="text-muted-foreground text-xs">
                    {correctionActions?.auditOpen || listPending || listError
                      ? null
                      : `${visibleTransactions.length} ${!favoritesOpen && historySearch?.filtered ? "matches" : "total"}`}
                  </span>
                </div>
                {favoriteActions && !correctionActions?.auditOpen ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    disabled={transactionPending}
                    onClick={() => {
                      setSelectedCorrection(null);
                      setDuplicate(null);
                      setFavoritesOpen((current) => !current);
                    }}
                  >
                    {favoritesOpen ? "Show active transactions" : "Favorites"}
                  </Button>
                ) : null}
                {correctionActions ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    disabled={transactionPending}
                    aria-expanded={correctionActions.auditOpen}
                    onClick={() => {
                      setSelectedCorrection(null);
                      setDuplicate(null);
                      setFavoritesOpen(false);
                      correctionActions.toggleAudit();
                    }}
                  >
                    {correctionActions.auditOpen
                      ? "Show active transactions"
                      : "Correction history"}
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="p-0">
                {duplicate &&
                duplicateDraft &&
                !correctionActions?.auditOpen ? (
                  <section
                    aria-label="Duplicate transaction"
                    className="border-border flex flex-col gap-3 border-b p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="text-sm font-medium">
                        Duplicate transaction
                      </h2>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={transactionPending}
                        onClick={() => setDuplicate(null)}
                      >
                        Cancel duplicate
                      </Button>
                    </div>
                    <MoneyMovementForm
                      key={duplicate.id}
                      form={duplicateDraft.form}
                      accounts={accounts}
                      busy={isBusy}
                      initialDraft={duplicateDraft}
                      saveLabel="Save duplicate"
                      onPost={async (input) => {
                        await onCreateTransaction(input);
                        setDuplicate(null);
                      }}
                    />
                  </section>
                ) : null}
                {selectedCorrection &&
                correctionActions &&
                !correctionActions.auditOpen ? (
                  <CorrectionEditor
                    key={`${selectedCorrection.transaction.id}-${selectedCorrection.action}`}
                    selection={selectedCorrection}
                    accounts={accounts}
                    busy={correctionActions.pending}
                    cancel={() => setSelectedCorrection(null)}
                    complete={async (input) => {
                      await correctionActions.correct(input);
                      setSelectedCorrection(null);
                    }}
                  />
                ) : null}
                {historySearch ? (
                  <div hidden={favoritesOpen || correctionActions?.auditOpen}>
                    <HistoryFilterForm
                      accounts={accounts}
                      apply={historySearch.apply}
                    />
                  </div>
                ) : null}
                {correctionActions?.auditOpen ? (
                  <CorrectionHistory
                    actions={correctionActions}
                    accounts={accounts}
                  />
                ) : listPending ? (
                  <p
                    role="status"
                    className="text-muted-foreground p-4 text-sm"
                  >
                    {favoritesOpen
                      ? "Loading favorite transactions…"
                      : "Loading matching transactions…"}
                  </p>
                ) : listError ? (
                  <div className="flex flex-col gap-2 p-4">
                    <p role="alert" className="text-destructive text-sm">
                      {listError}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start"
                      onClick={listRetry}
                    >
                      {favoritesOpen ? "Retry favorites" : "Retry filters"}
                    </Button>
                  </div>
                ) : visibleTransactions.length === 0 && favoritesOpen ? (
                  <p
                    role="status"
                    className="text-muted-foreground p-4 text-sm"
                  >
                    No favorite transactions.
                  </p>
                ) : visibleTransactions.length === 0 &&
                  historySearch?.filtered ? (
                  <p
                    role="status"
                    className="text-muted-foreground p-4 text-sm"
                  >
                    No transactions match these filters.
                  </p>
                ) : visibleTransactions.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <span className="border-border text-muted-foreground mx-auto grid size-10 place-items-center border">
                      <ReceiptText aria-hidden="true" className="size-5" />
                    </span>
                    <h2 className="mt-3 text-sm font-medium">
                      Your story starts here
                    </h2>
                    <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-xs leading-relaxed">
                      Record salary, a purchase, or a repayment and it will
                      appear here.
                    </p>
                  </div>
                ) : (
                  <ol className="divide-border/70 divide-y">
                    {visibleTransactions.map((transaction) => {
                      const isIncome = transaction.form === "RECEIVE_MONEY";
                      const label =
                        transaction.description ||
                        (isIncome ? "Money received" : "Payment or charge");
                      const favorite = favoriteIds.has(transaction.id);
                      const favoriteLabel = favorite
                        ? "Remove favorite"
                        : "Favorite";
                      const allocationNames = transaction.allocations
                        .map((allocation) => allocation.accountName)
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li
                          key={transaction.id}
                          className="flex items-start gap-3 px-4 py-4"
                        >
                          <span
                            className={`mt-0.5 grid size-8 shrink-0 place-items-center ${isIncome ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"}`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft
                                aria-hidden="true"
                                className="size-4"
                              />
                            ) : (
                              <ReceiptText
                                aria-hidden="true"
                                className="size-4"
                              />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {label}
                            </p>
                            <p className="text-muted-foreground mt-1 truncate text-xs">
                              {transaction.transactionDate}
                              {allocationNames ? ` · ${allocationNames}` : ""}
                            </p>
                            {favoriteActions ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  aria-label={`${favoriteLabel} ${label}`}
                                  disabled={
                                    favoriteActions.pending ||
                                    favoriteActions.loading ||
                                    Boolean(favoriteActions.error)
                                  }
                                  onClick={() =>
                                    void favoriteActions
                                      .setFavorite({
                                        transactionId: transaction.id,
                                        favorite: !favorite,
                                      })
                                      .catch(() => {})
                                  }
                                >
                                  {favoriteLabel}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  aria-label={`Duplicate ${label}`}
                                  disabled={isBusy}
                                  onClick={() => {
                                    setSelectedCorrection(null);
                                    setDuplicate(transaction);
                                  }}
                                >
                                  Duplicate
                                </Button>
                              </div>
                            ) : null}
                            {correctionActions && !favoritesOpen ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setDuplicate(null);
                                    setSelectedCorrection({
                                      action: "REPLACE",
                                      transaction,
                                    });
                                  }}
                                >
                                  Replace
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={isBusy}
                                  onClick={() => {
                                    setDuplicate(null);
                                    setSelectedCorrection({
                                      action: "VOID",
                                      transaction,
                                    });
                                  }}
                                >
                                  Void
                                </Button>
                              </div>
                            ) : null}
                          </div>
                          <span
                            className={`shrink-0 text-sm font-medium tabular-nums ${isIncome ? "text-emerald-400" : "text-foreground"}`}
                          >
                            {isIncome ? "+" : "−"}
                            {formatMoney(transaction.totalAmount)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
            <AccountManagement accounts={accounts} actions={accountActions} />
            <Card className="border-border/80">
              <CardHeader className="border-border/70 border-b pb-4">
                <p className="text-primary text-[11px] font-semibold tracking-[0.18em] uppercase">
                  Category totals
                </p>
                <CardTitle className="mt-1 text-xl">
                  Spending & income mix
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {summary.categories.map((category) => {
                  const maxUnits = summary.categories.reduce(
                    (maximum, entry) => {
                      const units = toMinorUnits(entry.total) ?? 0n;
                      if (units > maximum) return units;
                      return maximum;
                    },
                    1n,
                  );
                  const currentUnits = toMinorUnits(category.total) ?? 0n;
                  const percent = (currentUnits * 100n) / maxUnits;
                  const boundedPercent = percent > 100n ? 100n : percent;
                  const isIncome = category.type === "INCOME";
                  return (
                    <div key={category.accountId}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="text-muted-foreground truncate">
                          {category.accountName}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatMoney(category.total)}
                        </span>
                      </div>
                      <div className="bg-muted h-1.5">
                        <div
                          className={`h-full ${isIncome ? "bg-emerald-400" : "bg-primary"}`}
                          style={{ width: `${boundedPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {summary.categories.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Categories will appear after your accounts are set up.
                  </p>
                )}
                <p className="border-border/70 text-muted-foreground border-t pt-3 text-xs">
                  Opening balances and card repayments stay outside your income
                  and spending totals.
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

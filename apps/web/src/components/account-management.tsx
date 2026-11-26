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
import { useId, useState } from "react";

type Inputs = inferRouterInputs<AppRouter>["finance"]["accounts"];
type Account =
  inferRouterOutputs<AppRouter>["finance"]["accounts"]["list"][number];

export type AccountActions = {
  create: (input: Inputs["create"]) => Promise<unknown>;
  rename: (input: Inputs["rename"]) => Promise<unknown>;
  delete: (input: Inputs["delete"]) => Promise<unknown>;
};

export const accountTypeLabels = {
  CASH: "Cash",
  LOAN_GIVEN: "Loan Given",
  LOAN_TAKEN: "Loan Taken",
  INCOME: "Income",
  EXPENSE: "Expense",
} satisfies Record<Account["type"], string>;

const accountTypes = Object.keys(accountTypeLabels) as Account["type"][];

export function supportsOpeningBalance(type: Account["type"]) {
  return type !== "INCOME" && type !== "EXPENSE";
}

type AccountEdit = { id: string; mode: "rename" | "delete" };

export function AccountManagement({
  accounts,
  actions,
}: {
  accounts: Account[];
  actions: AccountActions;
}) {
  const formId = useId();
  const [type, setType] = useState<Account["type"]>("CASH");
  const [edit, setEdit] = useState<AccountEdit | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{
    area: "create" | "edit";
    message: string;
  } | null>(null);
  const nameCounts = new Map<string, number>();
  for (const account of accounts) {
    nameCounts.set(account.name, (nameCounts.get(account.name) ?? 0) + 1);
  }

  function changeEdit(next: AccountEdit | null) {
    setEdit(next);
    setError(null);
  }

  async function submit(
    area: "create" | "edit",
    operation: () => Promise<unknown>,
    onSuccess: () => void,
  ) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await operation();
      onSuccess();
    } catch (error) {
      setError({
        area,
        message:
          error instanceof Error ? error.message : "Account update failed",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form
          aria-label="Add account"
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const data = new FormData(form);
            const name = String(data.get("name") ?? "");
            const openingBalance = String(
              data.get("openingBalance") ?? "",
            ).trim();
            void submit(
              "create",
              () =>
                actions.create({
                  name,
                  type,
                  openingBalance: openingBalance || undefined,
                }),
              () => {
                form.reset();
                setType("CASH");
              },
            );
          }}
        >
          <div className="grid items-end gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-name`}>Account name</Label>
              <Input
                id={`${formId}-name`}
                name="name"
                required
                disabled={pending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-type`}>Account type</Label>
              <select
                id={`${formId}-type`}
                value={type}
                onChange={(event) =>
                  setType(event.currentTarget.value as Account["type"])
                }
                disabled={pending}
                className="border-input bg-background focus-visible:border-ring h-8 w-full border px-2 text-sm focus-visible:outline-none"
              >
                {accountTypes.map((option) => (
                  <option key={option} value={option}>
                    {accountTypeLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            {supportsOpeningBalance(type) ? (
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-opening`}>
                  Opening amount (THB, optional)
                </Label>
                <Input
                  id={`${formId}-opening`}
                  name="openingBalance"
                  inputMode="decimal"
                  disabled={pending}
                />
              </div>
            ) : null}
          </div>
          {error?.area === "create" ? (
            <p role="alert" className="text-destructive text-sm">
              {error.message}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="self-start">
            Add account
          </Button>
        </form>

        <ul className="divide-border border-border divide-y border-t">
          {accounts.map((account) => {
            const activeEdit = edit?.id === account.id ? edit.mode : null;
            const editError =
              activeEdit && error?.area === "edit" ? error.message : null;
            const duplicate = (nameCounts.get(account.name) ?? 0) > 1;
            return (
              <li key={account.id} className="flex flex-col gap-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">
                      {account.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {accountTypeLabels[account.type]}
                      {duplicate ? ` · ${account.id}` : ""}
                    </p>
                  </div>
                  <span className="text-sm tabular-nums">
                    ฿{account.balance ?? account.categoryTotal ?? "0.00"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Rename ${account.name}`}
                      disabled={pending}
                      onClick={() =>
                        changeEdit({ id: account.id, mode: "rename" })
                      }
                    >
                      Rename
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Delete ${account.name}`}
                      disabled={pending}
                      onClick={() =>
                        changeEdit({ id: account.id, mode: "delete" })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                {activeEdit === "rename" ? (
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const name = String(
                        new FormData(event.currentTarget).get("name") ?? "",
                      );
                      void submit(
                        "edit",
                        () => actions.rename({ accountId: account.id, name }),
                        () => changeEdit(null),
                      );
                    }}
                  >
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor={`${formId}-rename`}>
                        New account name
                      </Label>
                      <Input
                        id={`${formId}-rename`}
                        name="name"
                        defaultValue={account.name}
                        required
                        disabled={pending}
                      />
                    </div>
                    <Button type="submit" disabled={pending}>
                      Save name
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => changeEdit(null)}
                    >
                      Cancel
                    </Button>
                  </form>
                ) : null}
                {activeEdit === "delete" ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-sm">
                      Delete {account.name}? Only accounts without an opening
                      balance or activity can be deleted.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={pending}
                        onClick={() =>
                          void submit(
                            "edit",
                            () => actions.delete({ accountId: account.id }),
                            () => changeEdit(null),
                          )
                        }
                      >
                        Confirm delete
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => changeEdit(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
                {editError ? (
                  <p role="alert" className="text-destructive text-sm">
                    {editError}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        {accounts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add an account to start recording activity.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

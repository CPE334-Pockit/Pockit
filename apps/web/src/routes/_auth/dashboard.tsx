import { Button } from "@Pockit/ui/components/button";
import { Card, CardContent } from "@Pockit/ui/components/card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AdminUserManagement } from "@/components/admin-user-management";
import {
  FinanceDashboard,
  type HistoryFilters,
} from "@/components/finance-dashboard";
import { useTRPC } from "@/utils/trpc";
import { userScopedQueryKey } from "@/utils/user-scoped-query-key";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const actor = session.data?.user;

  if (actor?.role === "Administrator") {
    return <AdministratorAccess />;
  }
  if (actor?.role === "User") {
    return (
      <UserFinanceOverview key={actor.id} name={actor.name} userId={actor.id} />
    );
  }

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium">Access unavailable</p>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            This account does not have an enabled application role.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function AdministratorAccess() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const users = useQuery(trpc.admin.users.list.queryOptions());
  const setEnabled = useMutation(
    trpc.admin.users.setEnabled.mutationOptions({
      onSuccess: async (_result, input) => {
        toast.success(
          input.isEnabled ? "User access enabled" : "User access disabled",
        );
        await queryClient.invalidateQueries();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (users.isPending) {
    return <LoadingMessage>Loading platform Users…</LoadingMessage>;
  }
  if (users.isError) {
    return (
      <ErrorMessage
        title="User access couldn't load"
        description="Check your connection and retry the platform access list."
        onRetry={() => void users.refetch()}
      />
    );
  }

  return (
    <AdminUserManagement
      users={users.data}
      pendingUserId={
        setEnabled.isPending ? setEnabled.variables?.userId : undefined
      }
      onSetEnabled={(userId, isEnabled) =>
        setEnabled.mutate({ userId, isEnabled })
      }
    />
  );
}

export function UserFinanceOverview({
  name,
  userId,
}: {
  name: string;
  userId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [appliedHistory, setAppliedHistory] = useState<HistoryFilters>();
  const [auditOpen, setAuditOpen] = useState(false);
  const accountsQuery = trpc.finance.accounts.list.queryOptions();
  const historyQuery = trpc.finance.transactions.history.queryOptions();
  const summaryQuery = trpc.finance.summary.get.queryOptions();
  const accounts = useQuery({
    ...accountsQuery,
    queryKey: userScopedQueryKey(accountsQuery.queryKey, userId),
  });
  const history = useQuery({
    ...historyQuery,
    queryKey: userScopedQueryKey(historyQuery.queryKey, userId),
  });
  const filteredHistoryOptions =
    trpc.finance.transactions.history.queryOptions(appliedHistory);
  const filteredHistory = useQuery({
    ...filteredHistoryOptions,
    queryKey: userScopedQueryKey(filteredHistoryOptions.queryKey, userId),
    enabled: appliedHistory !== undefined,
  });
  const summary = useQuery({
    ...summaryQuery,
    queryKey: userScopedQueryKey(summaryQuery.queryKey, userId),
  });
  const auditOptions =
    trpc.finance.transactions.correctionHistory.queryOptions();
  const audit = useQuery({
    ...auditOptions,
    queryKey: userScopedQueryKey(auditOptions.queryKey, userId),
    enabled: auditOpen,
  });

  const refreshFinance = () => queryClient.invalidateQueries();
  const createAccount = useMutation(
    trpc.finance.accounts.create.mutationOptions({ onSuccess: refreshFinance }),
  );
  const renameAccount = useMutation(
    trpc.finance.accounts.rename.mutationOptions({ onSuccess: refreshFinance }),
  );
  const deleteAccount = useMutation(
    trpc.finance.accounts.delete.mutationOptions({ onSuccess: refreshFinance }),
  );
  const openingBalance = useMutation(
    trpc.finance.accounts.setOpeningBalance.mutationOptions({
      onSuccess: async () => {
        toast.success("Opening balance saved");
        await refreshFinance();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const transaction = useMutation(
    trpc.finance.transactions.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Transaction recorded");
        await refreshFinance();
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const correction = useMutation(
    trpc.finance.transactions.correct.mutationOptions({
      onSuccess: async () => {
        toast.success("Correction recorded");
        await refreshFinance();
      },
    }),
  );

  if (accounts.isPending || history.isPending || summary.isPending) {
    return <LoadingMessage>Loading your financial overview…</LoadingMessage>;
  }

  if (accounts.isError || history.isError || summary.isError) {
    return (
      <ErrorMessage
        title="Your overview couldn't load"
        description="Check your connection and try loading your private ledger again."
        onRetry={() => void refreshFinance()}
      />
    );
  }

  return (
    <FinanceDashboard
      name={name}
      accounts={accounts.data}
      transactions={history.data}
      historySearch={{
        apply: setAppliedHistory,
        transactions: appliedHistory
          ? (filteredHistory.data ?? [])
          : history.data,
        filtered: appliedHistory !== undefined,
        pending: appliedHistory !== undefined && filteredHistory.isPending,
        error: appliedHistory ? filteredHistory.error?.message : undefined,
        retry: () => void filteredHistory.refetch(),
      }}
      correctionActions={{
        correct: correction.mutateAsync,
        pending: correction.isPending,
        auditOpen,
        toggleAudit: () => setAuditOpen((current) => !current),
        audit: audit.data ?? [],
        auditPending: audit.isPending,
        auditError: audit.error?.message,
        retryAudit: () => void audit.refetch(),
      }}
      summary={summary.data}
      accountActions={{
        create: createAccount.mutateAsync,
        rename: renameAccount.mutateAsync,
        delete: deleteAccount.mutateAsync,
      }}
      openingBalancePending={openingBalance.isPending}
      transactionPending={transaction.isPending}
      onSetOpeningBalance={async (input) => {
        await openingBalance.mutateAsync(input);
      }}
      onCreateTransaction={async (input) => {
        await transaction.mutateAsync(input);
      }}
    />
  );
}

function LoadingMessage({ children }: { children: string }) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center">
      <div
        className="text-muted-foreground flex items-center gap-3 text-sm"
        role="status"
      >
        <LoaderCircle
          aria-hidden="true"
          className="text-primary size-4 animate-spin"
        />
        {children}
      </div>
    </main>
  );
}

type ErrorMessageProps = {
  title: string;
  description: string;
  onRetry: () => void;
};

function ErrorMessage({ title, description, onRetry }: ErrorMessageProps) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="grid justify-items-center gap-3 py-8 text-center">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {description}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

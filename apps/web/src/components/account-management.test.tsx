import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { type AccountActions, AccountManagement } from "./account-management";

const card = {
  id: "card",
  name: "Travel card",
  type: "LOAN_TAKEN" as const,
  currencyCode: "THB",
  openingBalance: "20.00",
  balance: "20.00",
  categoryTotal: null,
};

const category = {
  id: "category",
  name: "Unused category",
  type: "EXPENSE" as const,
  currencyCode: "THB",
  openingBalance: null,
  balance: null,
  categoryTotal: "0.00",
};

describe("F09-STS-07 account management", () => {
  it("submits exact amounts, renames by ID, and confirms deletion with inline rejection", async () => {
    const actions = {
      create: mock(
        async (_input: Parameters<AccountActions["create"]>[0]) => {},
      ),
      rename: mock(
        async (_input: Parameters<AccountActions["rename"]>[0]) => {},
      ),
      delete: mock(
        async ({ accountId }: Parameters<AccountActions["delete"]>[0]) => {
          if (accountId === card.id)
            throw new Error("This account has an opening balance");
        },
      ),
    };
    const view = render(
      <AccountManagement accounts={[card, category]} actions={actions} />,
    );
    fireEvent.change(view.getByLabelText("Account type"), {
      target: { value: "INCOME" },
    });
    expect(view.queryByLabelText(/opening amount/i)).toBeNull();
    fireEvent.change(view.getByLabelText("Account type"), {
      target: { value: "CASH" },
    });
    fireEvent.input(view.getByLabelText("Account name"), {
      target: { value: "Wallet" },
    });
    fireEvent.input(view.getByLabelText(/opening amount/i), {
      target: { value: "0.01" },
    });
    fireEvent.click(view.getByRole("button", { name: "Add account" }));
    await waitFor(() => {
      expect(actions.create).toHaveBeenCalledWith({
        name: "Wallet",
        type: "CASH",
        openingBalance: "0.01",
      });
      expect(
        (view.getByLabelText("Account name") as HTMLInputElement).value,
      ).toBe("");
    });

    const wallet = {
      ...card,
      id: "wallet",
      name: "Wallet",
      type: "CASH" as const,
      openingBalance: "0.01",
      balance: "0.01",
    };
    view.rerender(
      <AccountManagement
        accounts={[card, category, wallet]}
        actions={actions}
      />,
    );
    expect(view.getByText("฿0.01")).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Rename Wallet" }));
    fireEvent.input(view.getByLabelText("New account name"), {
      target: { value: "Main wallet" },
    });
    fireEvent.click(view.getByRole("button", { name: "Save name" }));
    await waitFor(() => {
      expect(actions.rename).toHaveBeenCalledWith({
        accountId: "wallet",
        name: "Main wallet",
      });
      expect(view.queryByLabelText("New account name")).toBeNull();
    });
    view.rerender(
      <AccountManagement
        accounts={[card, category, { ...wallet, name: "Main wallet" }]}
        actions={actions}
      />,
    );
    expect(view.getByText("Main wallet")).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "Delete Travel card" }));
    expect(actions.delete).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole("button", { name: "Confirm delete" }));
    expect((await view.findByRole("alert")).textContent).toBe(
      "This account has an opening balance",
    );
    expect(view.getByText("Travel card")).toBeTruthy();

    fireEvent.click(
      view.getByRole("button", { name: "Delete Unused category" }),
    );
    fireEvent.click(view.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => {
      expect(actions.delete).toHaveBeenCalledWith({ accountId: category.id });
      expect(view.queryByRole("button", { name: "Confirm delete" })).toBeNull();
    });
    view.rerender(
      <AccountManagement accounts={[card, wallet]} actions={actions} />,
    );
    expect(view.queryByText("Unused category")).toBeNull();
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Gift } from "../types/gift";
import ReservationDialog from "./ReservationDialog";

const gift: Gift = {
  id: 1,
  name: "Sample gift",
  description: "A gift for testing.",
  price: "€10",
  image: "🎁",
  storeUrl: null,
  displayOrder: 10,
  isReserved: false,
};

type DialogProps = Parameters<typeof ReservationDialog>[0];

function renderDialog(overrides: Partial<DialogProps> = {}) {
  const props = {
    gift,
    isSubmitting: false,
    submitError: null,
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
  return { ...render(<ReservationDialog {...props} />), ...props };
}

afterEach(cleanup);

describe("ReservationDialog", () => {
  it("focuses the name field and restores focus on close", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    try {
      trigger.focus();
      const { unmount } = renderDialog();
      expect(document.activeElement).toBe(
        screen.getByRole("textbox", { name: "Your name" }),
      );
      expect(
        screen.getByRole("dialog", { name: "Choose Sample gift?" }),
      ).toBeTruthy();
      unmount();
      expect(document.activeElement).toBe(trigger);
    } finally {
      trigger.remove();
    }
  });

  it.each(["   ", " A "])(
    "rejects names shorter than two characters after trimming: %j",
    (name) => {
      const { onConfirm } = renderDialog();
      const input = screen.getByRole("textbox", { name: "Your name" });
      fireEvent.change(input, { target: { value: name } });
      fireEvent.click(screen.getByRole("button", { name: "Reserve gift" }));
      expect(onConfirm).not.toHaveBeenCalled();
      expect(screen.getByRole("alert").textContent).toBe(
        "Please enter at least 2 characters.",
      );
      expect(input.getAttribute("aria-invalid")).toBe("true");
      expect(document.activeElement).toBe(input);

      fireEvent.change(input, { target: { value: "Ada" } });
      expect(screen.queryByRole("alert")).toBeNull();
    },
  );

  it("passes the trimmed name to the reservation handler", () => {
    const { onConfirm } = renderDialog();
    fireEvent.change(screen.getByRole("textbox", { name: "Your name" }), {
      target: { value: "  Ada  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reserve gift" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("Ada");
  });

  it("shows a reservation error and associates it with the name field", () => {
    renderDialog({ submitError: "Someone has already reserved this gift." });
    const alert = screen.getByRole("alert");
    const input = screen.getByRole("textbox", { name: "Your name" });
    expect(alert.textContent).toBe("Someone has already reserved this gift.");
    expect(input.getAttribute("aria-describedby")).toBe(alert.id);
  });

  it("cancels when Escape is pressed", () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables the form and ignores Escape while submitting", () => {
    const { onCancel, onConfirm } = renderDialog({ isSubmitting: true });
    expect(
      screen.getByRole("textbox", { name: "Your name" }).matches(":disabled"),
    ).toBe(true);
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const submit = screen.getByRole("button", { name: "Reserving..." });
    expect(cancel.matches(":disabled")).toBe(true);
    expect(submit.matches(":disabled")).toBe(true);
    fireEvent.click(cancel);
    fireEvent.click(submit);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

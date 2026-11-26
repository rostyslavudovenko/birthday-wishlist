import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Gift } from "../types/gift";
import GiftCard from "./GiftCard";

type GiftCardProps = Parameters<typeof GiftCard>[0];

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

const reservedGift: Gift = { ...gift, isReserved: true };

function renderCard(overrides: Partial<GiftCardProps> = {}) {
  const props: GiftCardProps = {
    gift,
    canRelease: false,
    isUpdating: false,
    onChoose: vi.fn(),
    onRelease: vi.fn(),
    ...overrides,
  };
  render(<GiftCard {...props} />);
  return props;
}

afterEach(cleanup);

describe("GiftCard", () => {
  it("passes the available gift to the choose handler", () => {
    const { onChoose, onRelease } = renderCard();
    expect(screen.getByText("Available")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Choose this gift" }));

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(gift);
    expect(onRelease).not.toHaveBeenCalled();
  });

  it("does not allow choosing or releasing another guest's reservation", () => {
    const { onChoose, onRelease } = renderCard({ gift: reservedGift });
    expect(screen.getByText("Reserved")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Release my reservation" }),
    ).toBeNull();

    const button = screen.getByRole("button", { name: "Already chosen" });
    expect(button.matches(":disabled")).toBe(true);
    fireEvent.click(button);

    expect(onChoose).not.toHaveBeenCalled();
    expect(onRelease).not.toHaveBeenCalled();
  });

  it("passes the gift ID when releasing your own reservation", () => {
    const { onChoose, onRelease } = renderCard({
      gift: reservedGift,
      canRelease: true,
    });
    expect(
      screen.queryByRole("button", { name: "Choose this gift" }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Release my reservation" }),
    );

    expect(onRelease).toHaveBeenCalledTimes(1);
    expect(onRelease).toHaveBeenCalledWith(gift.id);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it.each([
    { state: "saving", gift, canRelease: false, label: "Saving..." },
    {
      state: "releasing",
      gift: reservedGift,
      canRelease: true,
      label: "Releasing...",
    },
  ])("disables the action while $state", ({ gift, canRelease, label }) => {
    const { onChoose, onRelease } = renderCard({
      gift,
      canRelease,
      isUpdating: true,
    });
    const button = screen.getByRole("button", { name: label });

    expect(button.matches(":disabled")).toBe(true);
    fireEvent.click(button);

    expect(onChoose).not.toHaveBeenCalled();
    expect(onRelease).not.toHaveBeenCalled();
  });
});

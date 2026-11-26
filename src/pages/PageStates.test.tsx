import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import {
  getCachedFeaturedWishlists,
  getCachedWishlistPage,
  loadFeaturedWishlists,
  refreshWishlistPage,
  type WishlistPageData,
} from "../services/wishlistCache";
import type { FeaturedWishlist } from "../types/wishlist";

vi.mock("../services/wishlistCache", () => ({
  getCachedFeaturedWishlists: vi.fn(),
  getCachedWishlistPage: vi.fn(),
  loadFeaturedWishlists: vi.fn(),
  prefetchWishlistPage: vi.fn().mockResolvedValue(undefined),
  refreshWishlistPage: vi.fn(),
  updateCachedWishlistGifts: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: { removeChannel: vi.fn().mockResolvedValue("ok") },
}));

vi.mock("../services/realtime", () => ({
  createWishlistChannel: vi.fn(() => ({ subscribe: vi.fn() })),
  broadcastWishlistChange: vi.fn(),
}));

vi.mock("../services/gifts", () => ({
  reserveGift: vi.fn(),
  releaseGift: vi.fn(),
}));

vi.mock("../utils/storage", () => ({
  getVisitorToken: vi.fn(() => "test-visitor"),
  loadReservationIds: vi.fn(() => []),
  saveReservationIds: vi.fn(),
}));

const featuredWishlist: FeaturedWishlist = {
  slug: "sample",
  title: "Sample Birthday Wishlist",
  ownerName: "Sample Guest",
  description: "A few birthday gift ideas.",
  icon: "🎁",
  giftCount: 2,
  availableCount: 1,
};

const populatedWishlist: WishlistPageData = {
  wishlist: { ...featuredWishlist, theme: "classic", visibility: "public" },
  gifts: [
    {
      id: 1,
      name: "Notebook",
      description: "A small notebook.",
      price: "€10",
      image: "📓",
      storeUrl: null,
      displayOrder: 10,
      isReserved: false,
    },
    {
      id: 2,
      name: "Coffee Grinder",
      description: "A manual grinder.",
      price: "€45",
      image: "☕",
      storeUrl: null,
      displayOrder: 20,
      isReserved: true,
    },
  ],
};

const emptyWishlist: WishlistPageData = {
  wishlist: { ...populatedWishlist.wishlist, giftCount: 0, availableCount: 0 },
  gifts: [],
};

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(getCachedFeaturedWishlists).mockReset().mockReturnValue(null);
  vi.mocked(getCachedWishlistPage).mockReset().mockReturnValue(null);
  vi.mocked(loadFeaturedWishlists).mockReset().mockResolvedValue([]);
  vi.mocked(refreshWishlistPage).mockReset().mockResolvedValue(null);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("wishlist directory route", () => {
  it("shows loading, then the empty directory", async () => {
    renderRoute("/");

    expect(screen.getByRole("status").textContent).toContain(
      "Loading wishlists...",
    );
    expect(
      await screen.findByText("No public wishlists are available yet."),
    ).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders a link to a public wishlist", async () => {
    vi.mocked(loadFeaturedWishlists).mockResolvedValueOnce([featuredWishlist]);
    renderRoute("/");

    const directory = await screen.findByRole("region", {
      name: "Public wishlists",
    });
    const link = await within(directory).findByRole("link", {
      name: "Open wishlist",
    });
    expect(link.getAttribute("href")).toBe("/w/sample");
    expect(
      within(directory).getByRole("heading", { name: featuredWishlist.title }),
    ).toBeTruthy();
  });

  it("shows a loading error and recovers on retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadFeaturedWishlists)
      .mockRejectedValueOnce(new Error("Test request failed"))
      .mockResolvedValueOnce([featuredWishlist]);
    renderRoute("/");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "The wishlists could not be loaded. Please try again.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("link", { name: "Open wishlist" }),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("wishlist detail route", () => {
  it("shows loading, then the empty wishlist", async () => {
    vi.mocked(refreshWishlistPage).mockResolvedValueOnce(emptyWishlist);
    renderRoute("/w/sample");

    expect(screen.getByRole("status").textContent).toContain(
      "Loading wishlist...",
    );
    expect(
      await screen.findByText("No gifts have been added to this wishlist yet."),
    ).toBeTruthy();
    expect(refreshWishlistPage).toHaveBeenCalledWith("sample");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows not found when the slug does not resolve", async () => {
    renderRoute("/w/missing");

    expect(
      await screen.findByRole("heading", {
        name: "This wishlist could not be found.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Return home" }).getAttribute("href"),
    ).toBe("/");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("distinguishes a request failure from a missing wishlist and retries", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(refreshWishlistPage)
      .mockRejectedValueOnce(new Error("Test request failed"))
      .mockResolvedValueOnce(emptyWishlist);
    renderRoute("/w/sample");

    expect((await screen.findByRole("alert")).textContent).toContain(
      "The wishlist could not be loaded. Please try again.",
    );
    expect(
      screen.getByRole("heading", {
        name: "The wishlist is temporarily unavailable.",
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByText("No gifts have been added to this wishlist yet."),
    ).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders available and reserved gifts with an availability summary", async () => {
    vi.mocked(refreshWishlistPage).mockResolvedValueOnce(populatedWishlist);
    renderRoute("/w/sample");

    const grid = await screen.findByRole("region", {
      name: `${featuredWishlist.title} gifts`,
    });
    expect(within(grid).getAllByRole("article")).toHaveLength(2);
    expect(
      within(grid).getByRole("heading", { name: "Notebook" }),
    ).toBeTruthy();
    expect(
      within(grid).getByRole("heading", { name: "Coffee Grinder" }),
    ).toBeTruthy();
    expect(screen.getByText("1 is still available")).toBeTruthy();
  });
});

it("renders the 404 page for an unknown route", () => {
  renderRoute("/unknown-route");

  expect(screen.getByRole("heading", { name: "Page not found" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Return home" }).getAttribute("href"),
  ).toBe("/");
  expect(loadFeaturedWishlists).not.toHaveBeenCalled();
  expect(refreshWishlistPage).not.toHaveBeenCalled();
});

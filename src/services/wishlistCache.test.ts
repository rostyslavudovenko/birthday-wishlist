import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Gift } from "../types/gift";
import type { FeaturedWishlist, Wishlist } from "../types/wishlist";

const serviceMocks = vi.hoisted(() => ({
  fetchFeaturedWishlists: vi.fn(),
  fetchWishlist: vi.fn(),
  fetchWishlistGifts: vi.fn(),
}));

vi.mock("./wishlists", () => ({
  fetchFeaturedWishlists: serviceMocks.fetchFeaturedWishlists,
  fetchWishlist: serviceMocks.fetchWishlist,
}));

vi.mock("./gifts", () => ({
  fetchWishlistGifts: serviceMocks.fetchWishlistGifts,
}));

type WishlistCacheModule = typeof import("./wishlistCache");

const featuredWishlist: FeaturedWishlist = {
  slug: "rostyslav",
  title: "Rostyslav's Birthday Wishlist",
  ownerName: "Rostyslav",
  description: "A few thoughtful birthday gift ideas.",
  icon: "🎂",
  giftCount: 2,
  availableCount: 1,
};

const secondFeaturedWishlist: FeaturedWishlist = {
  slug: "maryna",
  title: "Maryna's Birthday Wishlist",
  ownerName: "Maryna",
  description: "A small collection of birthday wishes.",
  icon: "🎁",
  giftCount: 1,
  availableCount: 1,
};

const wishlist: Wishlist = {
  ...featuredWishlist,
  theme: "classic",
  visibility: "public",
};

const secondWishlist: Wishlist = {
  ...secondFeaturedWishlist,
  theme: "bubblegum",
  visibility: "unlisted",
};

const gifts: Gift[] = [
  {
    id: 1,
    name: "Mechanical Keyboard",
    description: "A compact wireless keyboard.",
    price: "Around €100",
    image: "⌨",
    storeUrl: null,
    displayOrder: 10,
    isReserved: false,
  },
  {
    id: 2,
    name: "Coffee Grinder",
    description: "A manual coffee grinder.",
    price: "Around €45",
    image: "☕",
    storeUrl: null,
    displayOrder: 20,
    isReserved: true,
  },
];

const secondWishlistGifts: Gift[] = [
  {
    id: 8,
    name: "Scented Candle",
    description: "A softly scented candle.",
    price: "Around €30",
    image: "🕯",
    storeUrl: null,
    displayOrder: 10,
    isReserved: false,
  },
];

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

async function loadFreshCacheModule(): Promise<WishlistCacheModule> {
  vi.resetModules();

  return import("./wishlistCache");
}

describe("wishlist cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("featured wishlist cache", () => {
    it("starts without cached featured wishlists", async () => {
      const cache = await loadFreshCacheModule();

      expect(cache.getCachedFeaturedWishlists()).toBeNull();
    });

    it("stores and returns featured wishlists", async () => {
      const cache = await loadFreshCacheModule();
      const wishlists = [featuredWishlist, secondFeaturedWishlist];

      cache.setCachedFeaturedWishlists(wishlists);

      expect(cache.getCachedFeaturedWishlists()).toBe(wishlists);
    });

    it("loads and caches featured wishlists", async () => {
      const loadedWishlists = [featuredWishlist, secondFeaturedWishlist];

      serviceMocks.fetchFeaturedWishlists.mockResolvedValue(loadedWishlists);

      const cache = await loadFreshCacheModule();

      await expect(cache.loadFeaturedWishlists()).resolves.toBe(
        loadedWishlists,
      );

      expect(serviceMocks.fetchFeaturedWishlists).toHaveBeenCalledTimes(1);

      expect(cache.getCachedFeaturedWishlists()).toBe(loadedWishlists);
    });

    it("deduplicates simultaneous featured wishlist requests", async () => {
      const request = createDeferred<FeaturedWishlist[]>();

      serviceMocks.fetchFeaturedWishlists.mockReturnValue(request.promise);

      const cache = await loadFreshCacheModule();

      const firstLoad = cache.loadFeaturedWishlists();
      const secondLoad = cache.loadFeaturedWishlists();

      expect(serviceMocks.fetchFeaturedWishlists).toHaveBeenCalledTimes(1);

      request.resolve([featuredWishlist, secondFeaturedWishlist]);

      const [firstResult, secondResult] = await Promise.all([
        firstLoad,
        secondLoad,
      ]);

      expect(firstResult).toBe(secondResult);
      expect(firstResult).toEqual([featuredWishlist, secondFeaturedWishlist]);
    });

    it("clears the active featured request after success", async () => {
      serviceMocks.fetchFeaturedWishlists
        .mockResolvedValueOnce([featuredWishlist])
        .mockResolvedValueOnce([secondFeaturedWishlist]);

      const cache = await loadFreshCacheModule();

      await cache.loadFeaturedWishlists();
      await cache.loadFeaturedWishlists();

      expect(serviceMocks.fetchFeaturedWishlists).toHaveBeenCalledTimes(2);

      expect(cache.getCachedFeaturedWishlists()).toEqual([
        secondFeaturedWishlist,
      ]);
    });

    it("clears the active featured request after failure", async () => {
      serviceMocks.fetchFeaturedWishlists
        .mockRejectedValueOnce(new Error("Directory request failed."))
        .mockResolvedValueOnce([featuredWishlist]);

      const cache = await loadFreshCacheModule();

      await expect(cache.loadFeaturedWishlists()).rejects.toThrow(
        "Directory request failed.",
      );

      await expect(cache.loadFeaturedWishlists()).resolves.toEqual([
        featuredWishlist,
      ]);

      expect(serviceMocks.fetchFeaturedWishlists).toHaveBeenCalledTimes(2);
    });

    it("preserves the previous featured cache when reloading fails", async () => {
      serviceMocks.fetchFeaturedWishlists.mockRejectedValue(
        new Error("Directory request failed."),
      );

      const cache = await loadFreshCacheModule();

      cache.setCachedFeaturedWishlists([featuredWishlist]);

      await expect(cache.loadFeaturedWishlists()).rejects.toThrow(
        "Directory request failed.",
      );

      expect(cache.getCachedFeaturedWishlists()).toEqual([featuredWishlist]);
    });
  });

  describe("wishlist page cache", () => {
    it("starts without cached wishlist page data", async () => {
      const cache = await loadFreshCacheModule();

      expect(cache.getCachedWishlistPage("rostyslav")).toBeNull();
    });

    it("stores and returns wishlist page data by slug", async () => {
      const cache = await loadFreshCacheModule();
      const pageData = {
        wishlist,
        gifts,
      };

      cache.setCachedWishlistPage("rostyslav", pageData);

      expect(cache.getCachedWishlistPage("rostyslav")).toBe(pageData);
    });

    it("keeps cached wishlist pages isolated by slug", async () => {
      const cache = await loadFreshCacheModule();

      cache.setCachedWishlistPage("rostyslav", {
        wishlist,
        gifts,
      });

      cache.setCachedWishlistPage("maryna", {
        wishlist: secondWishlist,
        gifts: secondWishlistGifts,
      });

      expect(cache.getCachedWishlistPage("rostyslav")).toEqual({
        wishlist,
        gifts,
      });

      expect(cache.getCachedWishlistPage("maryna")).toEqual({
        wishlist: secondWishlist,
        gifts: secondWishlistGifts,
      });
    });

    it("loads wishlist metadata and gifts in parallel", async () => {
      const wishlistRequest = createDeferred<Wishlist | null>();

      const giftsRequest = createDeferred<Gift[]>();

      serviceMocks.fetchWishlist.mockReturnValue(wishlistRequest.promise);

      serviceMocks.fetchWishlistGifts.mockReturnValue(giftsRequest.promise);

      const cache = await loadFreshCacheModule();

      const loadPromise = cache.loadWishlistPage("rostyslav");

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledWith("rostyslav");

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledWith("rostyslav");

      wishlistRequest.resolve(wishlist);
      giftsRequest.resolve(gifts);

      await expect(loadPromise).resolves.toEqual({
        wishlist,
        gifts,
      });
    });

    it("loads and caches a wishlist page", async () => {
      serviceMocks.fetchWishlist.mockResolvedValue(wishlist);

      serviceMocks.fetchWishlistGifts.mockResolvedValue(gifts);

      const cache = await loadFreshCacheModule();

      const result = await cache.loadWishlistPage("rostyslav");

      expect(result).toEqual({
        wishlist,
        gifts,
      });

      expect(cache.getCachedWishlistPage("rostyslav")).toBe(result);
    });

    it("deduplicates simultaneous requests for the same slug", async () => {
      const wishlistRequest = createDeferred<Wishlist | null>();

      const giftsRequest = createDeferred<Gift[]>();

      serviceMocks.fetchWishlist.mockReturnValue(wishlistRequest.promise);

      serviceMocks.fetchWishlistGifts.mockReturnValue(giftsRequest.promise);

      const cache = await loadFreshCacheModule();

      const firstLoad = cache.loadWishlistPage("rostyslav");

      const secondLoad = cache.loadWishlistPage("rostyslav");

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(1);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(1);

      wishlistRequest.resolve(wishlist);
      giftsRequest.resolve(gifts);

      const [firstResult, secondResult] = await Promise.all([
        firstLoad,
        secondLoad,
      ]);

      expect(firstResult).toBe(secondResult);
      expect(firstResult).toEqual({
        wishlist,
        gifts,
      });
    });

    it("loads different wishlist slugs independently", async () => {
      serviceMocks.fetchWishlist.mockImplementation(async (slug: string) =>
        slug === "rostyslav" ? wishlist : secondWishlist,
      );

      serviceMocks.fetchWishlistGifts.mockImplementation(
        async (slug: string) =>
          slug === "rostyslav" ? gifts : secondWishlistGifts,
      );

      const cache = await loadFreshCacheModule();

      const [firstResult, secondResult] = await Promise.all([
        cache.loadWishlistPage("rostyslav"),
        cache.loadWishlistPage("maryna"),
      ]);

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(2);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(2);

      expect(firstResult).toEqual({
        wishlist,
        gifts,
      });

      expect(secondResult).toEqual({
        wishlist: secondWishlist,
        gifts: secondWishlistGifts,
      });
    });

    it("returns null and removes cached data when the wishlist does not exist", async () => {
      serviceMocks.fetchWishlist.mockResolvedValue(null);

      serviceMocks.fetchWishlistGifts.mockResolvedValue([]);

      const cache = await loadFreshCacheModule();

      cache.setCachedWishlistPage("rostyslav", {
        wishlist,
        gifts,
      });

      await expect(cache.loadWishlistPage("rostyslav")).resolves.toBeNull();

      expect(cache.getCachedWishlistPage("rostyslav")).toBeNull();
    });

    it("clears the active wishlist request after success", async () => {
      serviceMocks.fetchWishlist.mockResolvedValue(wishlist);

      serviceMocks.fetchWishlistGifts.mockResolvedValue(gifts);

      const cache = await loadFreshCacheModule();

      await cache.loadWishlistPage("rostyslav");
      await cache.loadWishlistPage("rostyslav");

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(2);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(2);
    });

    it("clears the active wishlist request after failure", async () => {
      serviceMocks.fetchWishlist
        .mockRejectedValueOnce(new Error("Wishlist request failed."))
        .mockResolvedValueOnce(wishlist);

      serviceMocks.fetchWishlistGifts.mockResolvedValue(gifts);

      const cache = await loadFreshCacheModule();

      await expect(cache.loadWishlistPage("rostyslav")).rejects.toThrow(
        "Wishlist request failed.",
      );

      await expect(cache.loadWishlistPage("rostyslav")).resolves.toEqual({
        wishlist,
        gifts,
      });

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(2);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(2);
    });

    it("preserves cached page data when loading fails", async () => {
      serviceMocks.fetchWishlist.mockRejectedValue(
        new Error("Wishlist request failed."),
      );

      serviceMocks.fetchWishlistGifts.mockResolvedValue(gifts);

      const cache = await loadFreshCacheModule();
      const cachedData = {
        wishlist,
        gifts,
      };

      cache.setCachedWishlistPage("rostyslav", cachedData);

      await expect(cache.loadWishlistPage("rostyslav")).rejects.toThrow(
        "Wishlist request failed.",
      );

      expect(cache.getCachedWishlistPage("rostyslav")).toBe(cachedData);
    });
  });

  describe("wishlist prefetch", () => {
    it("loads an uncached wishlist page", async () => {
      serviceMocks.fetchWishlist.mockResolvedValue(wishlist);

      serviceMocks.fetchWishlistGifts.mockResolvedValue(gifts);

      const cache = await loadFreshCacheModule();

      await expect(
        cache.prefetchWishlistPage("rostyslav"),
      ).resolves.toBeUndefined();

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(1);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(1);

      expect(cache.getCachedWishlistPage("rostyslav")).toEqual({
        wishlist,
        gifts,
      });
    });

    it("skips a wishlist already stored in cache", async () => {
      const cache = await loadFreshCacheModule();

      cache.setCachedWishlistPage("rostyslav", {
        wishlist,
        gifts,
      });

      await cache.prefetchWishlistPage("rostyslav");

      expect(serviceMocks.fetchWishlist).not.toHaveBeenCalled();

      expect(serviceMocks.fetchWishlistGifts).not.toHaveBeenCalled();
    });

    it("reuses an active wishlist load request", async () => {
      const wishlistRequest = createDeferred<Wishlist | null>();

      const giftsRequest = createDeferred<Gift[]>();

      serviceMocks.fetchWishlist.mockReturnValue(wishlistRequest.promise);

      serviceMocks.fetchWishlistGifts.mockReturnValue(giftsRequest.promise);

      const cache = await loadFreshCacheModule();

      const activeLoad = cache.loadWishlistPage("rostyslav");

      const prefetch = cache.prefetchWishlistPage("rostyslav");

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(1);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(1);

      wishlistRequest.resolve(wishlist);
      giftsRequest.resolve(gifts);

      await Promise.all([activeLoad, prefetch]);
    });

    it("propagates prefetch errors to the caller", async () => {
      serviceMocks.fetchWishlist.mockRejectedValue(
        new Error("Prefetch failed."),
      );

      serviceMocks.fetchWishlistGifts.mockResolvedValue(gifts);

      const cache = await loadFreshCacheModule();

      await expect(cache.prefetchWishlistPage("rostyslav")).rejects.toThrow(
        "Prefetch failed.",
      );

      expect(cache.getCachedWishlistPage("rostyslav")).toBeNull();
    });
  });

  describe("wishlist refresh", () => {
    it("fetches canonical data even when the wishlist is cached", async () => {
      const refreshedWishlist: Wishlist = {
        ...wishlist,
        availableCount: 2,
      };

      const refreshedGifts: Gift[] = gifts.map((gift) => ({
        ...gift,
        isReserved: false,
      }));

      serviceMocks.fetchWishlist.mockResolvedValue(refreshedWishlist);

      serviceMocks.fetchWishlistGifts.mockResolvedValue(refreshedGifts);

      const cache = await loadFreshCacheModule();

      cache.setCachedWishlistPage("rostyslav", {
        wishlist,
        gifts,
      });

      await expect(cache.refreshWishlistPage("rostyslav")).resolves.toEqual({
        wishlist: refreshedWishlist,
        gifts: refreshedGifts,
      });

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(1);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(1);

      expect(cache.getCachedWishlistPage("rostyslav")).toEqual({
        wishlist: refreshedWishlist,
        gifts: refreshedGifts,
      });
    });

    it("removes cached data when refresh cannot find the wishlist", async () => {
      serviceMocks.fetchWishlist.mockResolvedValue(null);

      serviceMocks.fetchWishlistGifts.mockResolvedValue([]);

      const cache = await loadFreshCacheModule();

      cache.setCachedWishlistPage("rostyslav", {
        wishlist,
        gifts,
      });

      await expect(cache.refreshWishlistPage("rostyslav")).resolves.toBeNull();

      expect(cache.getCachedWishlistPage("rostyslav")).toBeNull();
    });

    it("preserves cached data when refresh fails", async () => {
      serviceMocks.fetchWishlist.mockRejectedValue(
        new Error("Refresh failed."),
      );

      serviceMocks.fetchWishlistGifts.mockResolvedValue(gifts);

      const cache = await loadFreshCacheModule();
      const cachedData = {
        wishlist,
        gifts,
      };

      cache.setCachedWishlistPage("rostyslav", cachedData);

      await expect(cache.refreshWishlistPage("rostyslav")).rejects.toThrow(
        "Refresh failed.",
      );

      expect(cache.getCachedWishlistPage("rostyslav")).toBe(cachedData);
    });

    it("does not reuse the load request deduplication state", async () => {
      const firstWishlistRequest = createDeferred<Wishlist | null>();

      const firstGiftsRequest = createDeferred<Gift[]>();

      serviceMocks.fetchWishlist
        .mockReturnValueOnce(firstWishlistRequest.promise)
        .mockResolvedValueOnce(wishlist);

      serviceMocks.fetchWishlistGifts
        .mockReturnValueOnce(firstGiftsRequest.promise)
        .mockResolvedValueOnce(gifts);

      const cache = await loadFreshCacheModule();

      const activeLoad = cache.loadWishlistPage("rostyslav");

      const refresh = cache.refreshWishlistPage("rostyslav");

      expect(serviceMocks.fetchWishlist).toHaveBeenCalledTimes(2);

      expect(serviceMocks.fetchWishlistGifts).toHaveBeenCalledTimes(2);

      firstWishlistRequest.resolve(wishlist);
      firstGiftsRequest.resolve(gifts);

      await Promise.all([activeLoad, refresh]);
    });
  });

  describe("cached gift updates", () => {
    it("replaces gifts while preserving wishlist metadata", async () => {
      const cache = await loadFreshCacheModule();
      const updatedGifts = gifts.map((gift) =>
        gift.id === 1
          ? {
              ...gift,
              isReserved: true,
            }
          : gift,
      );

      cache.setCachedWishlistPage("rostyslav", {
        wishlist,
        gifts,
      });

      cache.updateCachedWishlistGifts("rostyslav", updatedGifts);

      expect(cache.getCachedWishlistPage("rostyslav")).toEqual({
        wishlist,
        gifts: updatedGifts,
      });
    });

    it("does not create cache data for an unknown wishlist", async () => {
      const cache = await loadFreshCacheModule();

      cache.updateCachedWishlistGifts("unknown-wishlist", gifts);

      expect(cache.getCachedWishlistPage("unknown-wishlist")).toBeNull();
    });

    it("does not update a different wishlist slug", async () => {
      const cache = await loadFreshCacheModule();

      cache.setCachedWishlistPage("rostyslav", {
        wishlist,
        gifts,
      });

      cache.setCachedWishlistPage("maryna", {
        wishlist: secondWishlist,
        gifts: secondWishlistGifts,
      });

      const updatedGifts = gifts.map((gift) => ({
        ...gift,
        isReserved: true,
      }));

      cache.updateCachedWishlistGifts("rostyslav", updatedGifts);

      expect(cache.getCachedWishlistPage("maryna")).toEqual({
        wishlist: secondWishlist,
        gifts: secondWishlistGifts,
      });
    });
  });
});

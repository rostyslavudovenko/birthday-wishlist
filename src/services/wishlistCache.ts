import { fetchWishlistGifts } from "./gifts";
import { fetchFeaturedWishlists, fetchWishlist } from "./wishlists";
import type { Gift } from "../types/gift";
import type { FeaturedWishlist, Wishlist } from "../types/wishlist";

export type WishlistPageData = {
  wishlist: Wishlist;
  gifts: Gift[];
};

let featuredWishlistsCache: FeaturedWishlist[] | null = null;

const wishlistPageCache = new Map<string, WishlistPageData>();

let featuredWishlistsRequest: Promise<FeaturedWishlist[]> | null = null;

const wishlistPageRequests = new Map<
  string,
  Promise<WishlistPageData | null>
>();

export function getCachedFeaturedWishlists(): FeaturedWishlist[] | null {
  return featuredWishlistsCache;
}

export function setCachedFeaturedWishlists(
  wishlists: FeaturedWishlist[],
): void {
  featuredWishlistsCache = wishlists;
}

export function getCachedWishlistPage(slug: string): WishlistPageData | null {
  return wishlistPageCache.get(slug) ?? null;
}

export function setCachedWishlistPage(
  slug: string,
  data: WishlistPageData,
): void {
  wishlistPageCache.set(slug, data);
}

export function updateCachedWishlistGifts(slug: string, gifts: Gift[]): void {
  const cachedData = wishlistPageCache.get(slug);

  if (!cachedData) {
    return;
  }

  wishlistPageCache.set(slug, {
    ...cachedData,
    gifts,
  });
}

export async function loadFeaturedWishlists(): Promise<FeaturedWishlist[]> {
  if (featuredWishlistsRequest) {
    return featuredWishlistsRequest;
  }

  const request = fetchFeaturedWishlists()
    .then((wishlists) => {
      setCachedFeaturedWishlists(wishlists);
      return wishlists;
    })
    .finally(() => {
      if (featuredWishlistsRequest === request) {
        featuredWishlistsRequest = null;
      }
    });

  featuredWishlistsRequest = request;

  return request;
}

export async function loadWishlistPage(
  slug: string,
): Promise<WishlistPageData | null> {
  const existingRequest = wishlistPageRequests.get(slug);

  if (existingRequest) {
    return existingRequest;
  }

  const request = Promise.all([fetchWishlist(slug), fetchWishlistGifts(slug)])
    .then(([wishlist, gifts]) => {
      if (!wishlist) {
        wishlistPageCache.delete(slug);
        return null;
      }

      const data: WishlistPageData = {
        wishlist,
        gifts,
      };

      setCachedWishlistPage(slug, data);

      return data;
    })
    .finally(() => {
      if (wishlistPageRequests.get(slug) === request) {
        wishlistPageRequests.delete(slug);
      }
    });

  wishlistPageRequests.set(slug, request);

  return request;
}

export async function prefetchWishlistPage(slug: string): Promise<void> {
  if (getCachedWishlistPage(slug)) {
    return;
  }

  await loadWishlistPage(slug);
}

export async function refreshWishlistPage(
  slug: string,
): Promise<WishlistPageData | null> {
  const [wishlist, gifts] = await Promise.all([
    fetchWishlist(slug),
    fetchWishlistGifts(slug),
  ]);

  if (!wishlist) {
    wishlistPageCache.delete(slug);
    return null;
  }

  const data: WishlistPageData = {
    wishlist,
    gifts,
  };

  setCachedWishlistPage(slug, data);

  return data;
}

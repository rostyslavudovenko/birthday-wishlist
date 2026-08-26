export type WishlistVisibility = "public" | "unlisted";

export const wishlistThemes = ["classic", "bubblegum"] as const;

export type WishlistTheme = (typeof wishlistThemes)[number];

export const defaultWishlistTheme: WishlistTheme = "classic";

export function getWishlistTheme(theme: string | null | undefined): WishlistTheme {
  return wishlistThemes.includes(theme as WishlistTheme)
    ? (theme as WishlistTheme)
    : defaultWishlistTheme;
}

export type Wishlist = {
  slug: string;
  title: string;
  ownerName: string;
  description: string;
  icon: string;
  theme: WishlistTheme;
  visibility: WishlistVisibility;
  giftCount: number;
  availableCount: number;
};

export type FeaturedWishlist = Omit<Wishlist, "visibility" | "theme">;

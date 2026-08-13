export type WishlistVisibility = "public" | "unlisted";

export type Wishlist = {
  slug: string;
  title: string;
  ownerName: string;
  description: string;
  icon: string;
  visibility: WishlistVisibility;
  giftCount: number;
  availableCount: number;
};

export type FeaturedWishlist = Omit<Wishlist, "visibility">;

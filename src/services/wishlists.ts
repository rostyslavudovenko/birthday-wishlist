import { supabase } from "../lib/supabase";
import type {
  FeaturedWishlist,
  Wishlist,
  WishlistVisibility,
} from "../types/wishlist";

type WishlistRow = {
  slug: string;
  title: string;
  owner_name: string;
  description: string;
  icon: string;
  visibility: WishlistVisibility;
  gift_count: number;
  available_count: number;
};

type FeaturedWishlistRow = Omit<WishlistRow, "visibility">;

function mapWishlist(row: WishlistRow): Wishlist {
  return {
    slug: row.slug,
    title: row.title,
    ownerName: row.owner_name,
    description: row.description,
    icon: row.icon,
    visibility: row.visibility,
    giftCount: row.gift_count,
    availableCount: row.available_count,
  };
}

function mapFeaturedWishlist(row: FeaturedWishlistRow): FeaturedWishlist {
  return {
    slug: row.slug,
    title: row.title,
    ownerName: row.owner_name,
    description: row.description,
    icon: row.icon,
    giftCount: row.gift_count,
    availableCount: row.available_count,
  };
}

export async function fetchFeaturedWishlists(): Promise<FeaturedWishlist[]> {
  const { data, error } = await supabase
    .from("featured_wishlists")
    .select(
      `
slug,
title,
owner_name,
description,
icon,
gift_count,
available_count,
display_order
`,
    )
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as FeaturedWishlistRow[]).map(mapFeaturedWishlist);
}

export async function fetchWishlist(
  wishlistSlug: string,
): Promise<Wishlist | null> {
  const { data, error } = await supabase.rpc("get_wishlist", {
    p_wishlist_slug: wishlistSlug,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as WishlistRow[];
  const row = rows[0];

  return row ? mapWishlist(row) : null;
}

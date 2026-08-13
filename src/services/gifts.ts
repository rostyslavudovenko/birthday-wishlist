import { supabase } from "../lib/supabase";
import type { Gift } from "../types/gift";

type GiftRow = {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  store_url: string | null;
  display_order: number;
  is_reserved: boolean;
};

function mapGift(row: GiftRow): Gift {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    image: row.image,
    storeUrl: row.store_url,
    displayOrder: row.display_order,
    isReserved: row.is_reserved,
  };
}

export async function fetchWishlistGifts(
  wishlistSlug: string,
): Promise<Gift[]> {
  const { data, error } = await supabase.rpc("get_wishlist_gifts", {
    p_wishlist_slug: wishlistSlug,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as GiftRow[]).map(mapGift);
}

export async function reserveGift(
  wishlistSlug: string,
  giftId: number,
  guestName: string,
  visitorToken: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("reserve_gift", {
    p_wishlist_slug: wishlistSlug,
    p_gift_id: giftId,
    p_guest_name: guestName,
    p_visitor_token: visitorToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

export async function releaseGift(
  wishlistSlug: string,
  giftId: number,
  visitorToken: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("release_gift", {
    p_wishlist_slug: wishlistSlug,
    p_gift_id: giftId,
    p_visitor_token: visitorToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

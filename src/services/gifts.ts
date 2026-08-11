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

export async function fetchGifts(): Promise<Gift[]> {
  const { data, error } = await supabase
    .from("public_gifts")
    .select(
      `
        id,
        name,
        description,
        price,
        image,
        store_url,
        display_order,
        is_reserved
      `,
    )
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as GiftRow[]).map(mapGift);
}

export async function reserveGift(
  giftId: number,
  guestName: string,
  visitorToken: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("reserve_gift", {
    gift_id: giftId,
    guest_name: guestName,
    visitor_token: visitorToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

export async function releaseGift(
  giftId: number,
  visitorToken: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("release_gift", {
    gift_id: giftId,
    visitor_token: visitorToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data === true;
}

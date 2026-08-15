import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

const changeEventName = "wishlist-changed";

export function createWishlistChannel(
  wishlistSlug: string,
  onWishlistChanged: () => void,
): RealtimeChannel {
  return supabase
    .channel(`wishlist:${wishlistSlug}`, {
      config: {
        broadcast: {
          self: false,
          ack: true,
        },
      },
    })
    .on(
      "broadcast",
      {
        event: changeEventName,
      },
      () => {
        onWishlistChanged();
      },
    );
}

export async function broadcastWishlistChange(channel: RealtimeChannel) {
  const result = await channel.send({
    type: "broadcast",
    event: changeEventName,
    payload: {},
  });

  if (result !== "ok") {
    throw new Error(`Wishlist update broadcast failed: ${result}`);
  }
}

import { initialGifts } from "../data/gifts";
import type { Gift } from "../types/gift";

const giftsStorageKey = "birthday-wishlist:gifts";
const visitorTokenStorageKey = "birthday-wishlist:visitor-token";

function isGift(value: unknown): value is Gift {
  if (!value || typeof value !== "object") {
    return false;
  }

  const gift = value as Record<string, unknown>;

  return (
    typeof gift.id === "number" &&
    typeof gift.name === "string" &&
    typeof gift.description === "string" &&
    typeof gift.price === "string" &&
    typeof gift.image === "string" &&
    (typeof gift.reservedBy === "string" || gift.reservedBy === null) &&
    (typeof gift.reservationToken === "string" ||
      gift.reservationToken === null)
  );
}

export function loadGifts(): Gift[] {
  try {
    const storedValue = localStorage.getItem(giftsStorageKey);

    if (!storedValue) {
      return initialGifts;
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue) || !parsedValue.every(isGift)) {
      localStorage.removeItem(giftsStorageKey);
      return initialGifts;
    }

    return parsedValue;
  } catch {
    localStorage.removeItem(giftsStorageKey);
    return initialGifts;
  }
}

export function saveGifts(gifts: Gift[]) {
  localStorage.setItem(giftsStorageKey, JSON.stringify(gifts));
}

export function getVisitorToken() {
  const storedToken = localStorage.getItem(visitorTokenStorageKey);

  if (storedToken) {
    return storedToken;
  }

  const token = crypto.randomUUID();
  localStorage.setItem(visitorTokenStorageKey, token);

  return token;
}

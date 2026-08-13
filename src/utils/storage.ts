const visitorTokenStorageKey = "birthday-wishlist:visitor-token";

const reservationIdsStorageKey = "birthday-wishlist:reservation-ids";

type StoredReservations = Record<string, number[]>;

export function getVisitorToken() {
  const storedToken = localStorage.getItem(visitorTokenStorageKey);

  if (storedToken) {
    return storedToken;
  }

  const token = crypto.randomUUID();

  localStorage.setItem(visitorTokenStorageKey, token);

  return token;
}

function loadStoredReservations(): StoredReservations {
  try {
    const storedValue = localStorage.getItem(reservationIdsStorageKey);

    if (!storedValue) {
      return {};
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      !parsedValue ||
      typeof parsedValue !== "object" ||
      Array.isArray(parsedValue)
    ) {
      localStorage.removeItem(reservationIdsStorageKey);
      return {};
    }

    const entries = Object.entries(parsedValue);

    const isValid = entries.every(
      ([slug, giftIds]) =>
        slug.length > 0 &&
        Array.isArray(giftIds) &&
        giftIds.every(
          (giftId) => typeof giftId === "number" && Number.isInteger(giftId),
        ),
    );

    if (!isValid) {
      localStorage.removeItem(reservationIdsStorageKey);
      return {};
    }

    return parsedValue as StoredReservations;
  } catch {
    localStorage.removeItem(reservationIdsStorageKey);
    return {};
  }
}

export function loadReservationIds(wishlistSlug: string): number[] {
  const reservations = loadStoredReservations();

  return reservations[wishlistSlug] ?? [];
}

export function saveReservationIds(wishlistSlug: string, giftIds: number[]) {
  const reservations = loadStoredReservations();

  reservations[wishlistSlug] = giftIds;

  localStorage.setItem(reservationIdsStorageKey, JSON.stringify(reservations));
}

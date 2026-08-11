const visitorTokenStorageKey = "birthday-wishlist:visitor-token";

const reservationIdsStorageKey = "birthday-wishlist:reservation-ids";

export function getVisitorToken() {
  const storedToken = localStorage.getItem(visitorTokenStorageKey);

  if (storedToken) {
    return storedToken;
  }

  const token = crypto.randomUUID();

  localStorage.setItem(visitorTokenStorageKey, token);

  return token;
}

export function loadReservationIds(): number[] {
  try {
    const storedValue = localStorage.getItem(reservationIdsStorageKey);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (
      !Array.isArray(parsedValue) ||
      !parsedValue.every(
        (value) => typeof value === "number" && Number.isInteger(value),
      )
    ) {
      localStorage.removeItem(reservationIdsStorageKey);
      return [];
    }

    return parsedValue;
  } catch {
    localStorage.removeItem(reservationIdsStorageKey);
    return [];
  }
}

export function saveReservationIds(giftIds: number[]) {
  localStorage.setItem(reservationIdsStorageKey, JSON.stringify(giftIds));
}

const visitorTokenStorageKey = "birthday-wishlist:visitor-token";
const reservationIdsStorageKey = "birthday-wishlist:reservation-ids";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type StoredReservations = Record<string, number[]>;

function readStorageValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorageValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage cleanup is best-effort when browser storage is unavailable.
  }
}

function normalizeWishlistSlug(wishlistSlug: string): string {
  return wishlistSlug.trim().toLowerCase();
}

function isValidVisitorToken(value: string): boolean {
  return uuidPattern.test(value);
}

function isValidGiftId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function normalizeGiftIds(giftIds: number[]): number[] {
  return [...new Set(giftIds)];
}

function isStoredReservations(value: unknown): value is StoredReservations {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(
    ([wishlistSlug, giftIds]) =>
      normalizeWishlistSlug(wishlistSlug).length > 0 &&
      Array.isArray(giftIds) &&
      giftIds.every(isValidGiftId),
  );
}

function normalizeStoredReservations(
  reservations: StoredReservations,
): StoredReservations {
  const normalizedReservations: StoredReservations = {};

  for (const [wishlistSlug, giftIds] of Object.entries(reservations)) {
    const normalizedSlug = normalizeWishlistSlug(wishlistSlug);

    if (!normalizedSlug) {
      continue;
    }

    const existingGiftIds = normalizedReservations[normalizedSlug] ?? [];

    normalizedReservations[normalizedSlug] = normalizeGiftIds([
      ...existingGiftIds,
      ...giftIds,
    ]);
  }

  return normalizedReservations;
}

function loadStoredReservations(): StoredReservations {
  const storedValue = readStorageValue(reservationIdsStorageKey);

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);

    if (!isStoredReservations(parsedValue)) {
      removeStorageValue(reservationIdsStorageKey);
      return {};
    }

    return normalizeStoredReservations(parsedValue);
  } catch {
    removeStorageValue(reservationIdsStorageKey);
    return {};
  }
}

export function getVisitorToken(): string {
  const storedToken = readStorageValue(visitorTokenStorageKey);

  if (storedToken && isValidVisitorToken(storedToken)) {
    return storedToken;
  }

  if (storedToken) {
    removeStorageValue(visitorTokenStorageKey);
  }

  const token = crypto.randomUUID();

  writeStorageValue(visitorTokenStorageKey, token);

  return token;
}

export function loadReservationIds(wishlistSlug: string): number[] {
  const normalizedSlug = normalizeWishlistSlug(wishlistSlug);

  if (!normalizedSlug) {
    return [];
  }

  const reservations = loadStoredReservations();

  return [...(reservations[normalizedSlug] ?? [])];
}

export function saveReservationIds(
  wishlistSlug: string,
  giftIds: number[],
): void {
  const normalizedSlug = normalizeWishlistSlug(wishlistSlug);

  if (!normalizedSlug) {
    return;
  }

  const normalizedGiftIds = normalizeGiftIds(giftIds.filter(isValidGiftId));

  const reservations = loadStoredReservations();

  if (normalizedGiftIds.length === 0) {
    delete reservations[normalizedSlug];
  } else {
    reservations[normalizedSlug] = normalizedGiftIds;
  }

  if (Object.keys(reservations).length === 0) {
    removeStorageValue(reservationIdsStorageKey);
    return;
  }

  writeStorageValue(reservationIdsStorageKey, JSON.stringify(reservations));
}

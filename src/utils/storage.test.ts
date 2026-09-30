import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getVisitorToken,
  loadReservationIds,
  saveReservationIds,
} from "./storage";

const visitorTokenStorageKey = "birthday-wishlist:visitor-token";
const reservationIdsStorageKey = "birthday-wishlist:reservation-ids";

const generatedVisitorToken = "123e4567-e89b-42d3-a456-426614174000";

const replacementVisitorToken = "550e8400-e29b-41d4-a716-446655440000";

describe("reservation storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("getVisitorToken", () => {
    it("creates and stores a visitor token when none exists", () => {
      const randomUuidSpy = vi
        .spyOn(globalThis.crypto, "randomUUID")
        .mockReturnValue(generatedVisitorToken);

      const token = getVisitorToken();

      expect(token).toBe(generatedVisitorToken);
      expect(randomUuidSpy).toHaveBeenCalledTimes(1);
      expect(window.localStorage.getItem(visitorTokenStorageKey)).toBe(
        generatedVisitorToken,
      );
    });

    it("reuses a valid visitor token stored in the browser", () => {
      window.localStorage.setItem(
        visitorTokenStorageKey,
        generatedVisitorToken,
      );

      const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");

      const token = getVisitorToken();

      expect(token).toBe(generatedVisitorToken);
      expect(randomUuidSpy).not.toHaveBeenCalled();
    });

    it("returns the same generated token on repeated calls", () => {
      const randomUuidSpy = vi
        .spyOn(globalThis.crypto, "randomUUID")
        .mockReturnValue(generatedVisitorToken);

      const firstToken = getVisitorToken();
      const secondToken = getVisitorToken();

      expect(firstToken).toBe(generatedVisitorToken);
      expect(secondToken).toBe(generatedVisitorToken);
      expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    });

    it("replaces an invalid stored visitor token", () => {
      window.localStorage.setItem(visitorTokenStorageKey, "invalid-token");

      const randomUuidSpy = vi
        .spyOn(globalThis.crypto, "randomUUID")
        .mockReturnValue(replacementVisitorToken);

      const token = getVisitorToken();

      expect(token).toBe(replacementVisitorToken);
      expect(randomUuidSpy).toHaveBeenCalledTimes(1);
      expect(window.localStorage.getItem(visitorTokenStorageKey)).toBe(
        replacementVisitorToken,
      );
    });

    it("accepts uppercase characters in a valid UUID", () => {
      const uppercaseToken = "123E4567-E89B-42D3-A456-426614174000";

      window.localStorage.setItem(visitorTokenStorageKey, uppercaseToken);

      const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");

      expect(getVisitorToken()).toBe(uppercaseToken);
      expect(randomUuidSpy).not.toHaveBeenCalled();
    });

    it("returns a generated token when storage reading fails", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Storage access denied.", "SecurityError");
      });

      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Storage access denied.", "SecurityError");
      });

      vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
        generatedVisitorToken,
      );

      expect(() => getVisitorToken()).not.toThrow();
      expect(getVisitorToken()).toBe(generatedVisitorToken);
    });

    it("returns a generated token when storage writing fails", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Storage quota exceeded.", "QuotaExceededError");
      });

      vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
        generatedVisitorToken,
      );

      expect(() => getVisitorToken()).not.toThrow();
      expect(getVisitorToken()).toBe(generatedVisitorToken);
    });
  });

  describe("loadReservationIds", () => {
    it("returns an empty array when no reservation data exists", () => {
      expect(loadReservationIds("rostyslav")).toEqual([]);
    });

    it("returns reservation IDs for the requested wishlist", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 3, 5],
          maryna: [8, 9],
        }),
      );

      expect(loadReservationIds("rostyslav")).toEqual([1, 3, 5]);
      expect(loadReservationIds("maryna")).toEqual([8, 9]);
    });

    it("returns an empty array for a wishlist without reservations", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 3, 5],
        }),
      );

      expect(loadReservationIds("unknown-wishlist")).toEqual([]);
    });

    it("normalizes the requested wishlist slug", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 3, 5],
        }),
      );

      expect(loadReservationIds("  ROSTYSLAV  ")).toEqual([1, 3, 5]);
    });

    it("normalizes stored wishlist slug keys", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          "  ROSTYSLAV  ": [1, 3, 5],
        }),
      );

      expect(loadReservationIds("rostyslav")).toEqual([1, 3, 5]);
    });

    it("merges reservation IDs from equivalent normalized slugs", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 3],
          " ROSTYSLAV ": [3, 5],
        }),
      );

      expect(loadReservationIds("rostyslav")).toEqual([1, 3, 5]);
    });

    it("removes duplicate reservation IDs", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 1, 3, 3, 5],
        }),
      );

      expect(loadReservationIds("rostyslav")).toEqual([1, 3, 5]);
    });

    it("returns a new array for every read", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 3, 5],
        }),
      );

      const firstResult = loadReservationIds("rostyslav");
      const secondResult = loadReservationIds("rostyslav");

      expect(firstResult).toEqual(secondResult);
      expect(firstResult).not.toBe(secondResult);
    });

    it("ignores an empty requested wishlist slug", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 3, 5],
        }),
      );

      expect(loadReservationIds("   ")).toEqual([]);
    });

    it("removes malformed JSON and returns an empty array", () => {
      window.localStorage.setItem(reservationIdsStorageKey, "{not-valid-json");

      expect(loadReservationIds("rostyslav")).toEqual([]);
      expect(window.localStorage.getItem(reservationIdsStorageKey)).toBeNull();
    });

    it("removes a non-object reservation payload", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify(["invalid"]),
      );

      expect(loadReservationIds("rostyslav")).toEqual([]);
      expect(window.localStorage.getItem(reservationIdsStorageKey)).toBeNull();
    });

    it.each([
      ["zero", 0],
      ["a negative number", -1],
      ["a decimal number", 1.5],
      ["an unsafe integer", Number.MAX_SAFE_INTEGER + 1],
      ["a string", "2"],
      ["null", null],
    ])("removes reservation data containing %s", (_, invalidGiftId) => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, invalidGiftId, 3],
        }),
      );

      expect(loadReservationIds("rostyslav")).toEqual([]);
      expect(window.localStorage.getItem(reservationIdsStorageKey)).toBeNull();
    });

    it("removes reservation data with a non-array wishlist value", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: 1,
        }),
      );

      expect(loadReservationIds("rostyslav")).toEqual([]);
      expect(window.localStorage.getItem(reservationIdsStorageKey)).toBeNull();
    });

    it("returns an empty array when storage reading fails", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Storage access denied.", "SecurityError");
      });

      expect(() => loadReservationIds("rostyslav")).not.toThrow();

      expect(loadReservationIds("rostyslav")).toEqual([]);
    });

    it("does not throw when cleanup after invalid data fails", () => {
      window.localStorage.setItem(reservationIdsStorageKey, "{not-valid-json");

      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new DOMException("Storage access denied.", "SecurityError");
      });

      expect(() => loadReservationIds("rostyslav")).not.toThrow();

      expect(loadReservationIds("rostyslav")).toEqual([]);
    });
  });

  describe("saveReservationIds", () => {
    it("stores reservation IDs for a wishlist", () => {
      saveReservationIds("rostyslav", [1, 3, 5]);

      expect(
        JSON.parse(
          window.localStorage.getItem(reservationIdsStorageKey) ?? "{}",
        ),
      ).toEqual({
        rostyslav: [1, 3, 5],
      });
    });

    it("preserves reservations belonging to other wishlists", () => {
      saveReservationIds("rostyslav", [1, 3]);
      saveReservationIds("maryna", [8, 9]);

      expect(loadReservationIds("rostyslav")).toEqual([1, 3]);
      expect(loadReservationIds("maryna")).toEqual([8, 9]);
    });

    it("replaces reservation IDs for the requested wishlist", () => {
      saveReservationIds("rostyslav", [1, 3, 5]);
      saveReservationIds("rostyslav", [3]);

      expect(loadReservationIds("rostyslav")).toEqual([3]);
    });

    it("normalizes the wishlist slug before saving", () => {
      saveReservationIds("  ROSTYSLAV  ", [1, 3, 5]);

      expect(
        JSON.parse(
          window.localStorage.getItem(reservationIdsStorageKey) ?? "{}",
        ),
      ).toEqual({
        rostyslav: [1, 3, 5],
      });
    });

    it("removes duplicate reservation IDs before saving", () => {
      saveReservationIds("rostyslav", [1, 1, 3, 3, 5]);

      expect(loadReservationIds("rostyslav")).toEqual([1, 3, 5]);
    });

    it("filters invalid reservation IDs before saving", () => {
      saveReservationIds("rostyslav", [
        -1,
        0,
        1,
        1.5,
        3,
        Number.MAX_SAFE_INTEGER + 1,
      ]);

      expect(loadReservationIds("rostyslav")).toEqual([1, 3]);
    });

    it("removes an empty wishlist entry while preserving other wishlists", () => {
      saveReservationIds("rostyslav", [1, 3]);
      saveReservationIds("maryna", [8, 9]);
      saveReservationIds("rostyslav", []);

      expect(loadReservationIds("rostyslav")).toEqual([]);
      expect(loadReservationIds("maryna")).toEqual([8, 9]);

      expect(
        JSON.parse(
          window.localStorage.getItem(reservationIdsStorageKey) ?? "{}",
        ),
      ).toEqual({
        maryna: [8, 9],
      });
    });

    it("removes the storage record when the final wishlist becomes empty", () => {
      saveReservationIds("rostyslav", [1, 3]);
      saveReservationIds("rostyslav", []);

      expect(window.localStorage.getItem(reservationIdsStorageKey)).toBeNull();
    });

    it("ignores an empty wishlist slug", () => {
      saveReservationIds("   ", [1, 3, 5]);

      expect(window.localStorage.getItem(reservationIdsStorageKey)).toBeNull();
    });

    it("recovers from malformed stored data before saving", () => {
      window.localStorage.setItem(reservationIdsStorageKey, "{not-valid-json");

      saveReservationIds("rostyslav", [1, 3]);

      expect(loadReservationIds("rostyslav")).toEqual([1, 3]);
    });

    it("does not throw when storage reading fails", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Storage access denied.", "SecurityError");
      });

      expect(() => saveReservationIds("rostyslav", [1, 3])).not.toThrow();
    });

    it("does not throw when storage writing fails", () => {
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Storage quota exceeded.", "QuotaExceededError");
      });

      expect(() => saveReservationIds("rostyslav", [1, 3])).not.toThrow();
    });

    it("does not throw when storage removal fails", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, 3],
        }),
      );

      vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new DOMException("Storage access denied.", "SecurityError");
      });

      expect(() => saveReservationIds("rostyslav", [])).not.toThrow();
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getVisitorToken,
  loadReservationIds,
  saveReservationIds,
} from "./storage";

const visitorTokenStorageKey = "birthday-wishlist:visitor-token";
const reservationIdsStorageKey = "birthday-wishlist:reservation-ids";
const generatedVisitorToken = "123e4567-e89b-42d3-a456-426614174000";

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

    it("reuses the visitor token already stored in the browser", () => {
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

    it("removes reservation data with invalid gift IDs", () => {
      window.localStorage.setItem(
        reservationIdsStorageKey,
        JSON.stringify({
          rostyslav: [1, "2", 3],
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

    it("stores an empty reservation list without changing other wishlists", () => {
      saveReservationIds("rostyslav", [1, 3]);
      saveReservationIds("maryna", [8, 9]);
      saveReservationIds("rostyslav", []);

      expect(loadReservationIds("rostyslav")).toEqual([]);
      expect(loadReservationIds("maryna")).toEqual([8, 9]);
    });

    it("recovers from malformed stored data before saving", () => {
      window.localStorage.setItem(reservationIdsStorageKey, "{not-valid-json");

      saveReservationIds("rostyslav", [1, 3]);

      expect(loadReservationIds("rostyslav")).toEqual([1, 3]);
    });
  });
});

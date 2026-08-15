import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Link, useParams } from "react-router";
import GiftCard from "../components/GiftCard";
import MacWindow from "../components/MacWindow";
import ReservationDialog from "../components/ReservationDialog";
import { supabase } from "../lib/supabase";
import {
  fetchWishlistGifts,
  releaseGift as releaseGiftRequest,
  reserveGift as reserveGiftRequest,
} from "../services/gifts";
import {
  broadcastWishlistChange,
  createWishlistChannel,
} from "../services/realtime";
import { fetchWishlist } from "../services/wishlists";
import type { Gift } from "../types/gift";
import type { Wishlist } from "../types/wishlist";
import {
  getVisitorToken,
  loadReservationIds,
  saveReservationIds,
} from "../utils/storage";

function WishlistPage() {
  const { slug = "" } = useParams();

  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [reservationIds, setReservationIds] = useState<number[]>(() =>
    loadReservationIds(slug),
  );
  const [visitorToken] = useState(() => getVisitorToken());
  const [isLoading, setIsLoading] = useState(true);
  const [updatingGiftId, setUpdatingGiftId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  /*
   * These values are safe to use throughout the component.
   * No code below needs to read a property directly from
   * the nullable wishlist state.
   */
  const activeWishlistSlug = wishlist?.slug ?? slug;
  const wishlistTitle = wishlist?.title ?? "Wishlist";
  const wishlistDescription = wishlist?.description ?? "";
  const wishlistIcon = wishlist?.icon ?? "🎁";
  const wishlistVisibility = wishlist?.visibility ?? null;

  const availableCount = gifts.filter((gift) => !gift.isReserved).length;

  const loadWishlist = useCallback(async () => {
    if (!slug) {
      setWishlist(null);
      setGifts([]);
      setIsLoading(false);
      return;
    }

    setPageError(null);

    try {
      const [wishlistDetails, wishlistGifts] = await Promise.all([
        fetchWishlist(slug),
        fetchWishlistGifts(slug),
      ]);

      setWishlist(wishlistDetails);

      setGifts(wishlistDetails ? wishlistGifts : []);

      if (!wishlistDetails) {
        setReservationIds([]);
        return;
      }

      setReservationIds((currentIds) => {
        const validIds = currentIds.filter((giftId) =>
          wishlistGifts.some((gift) => gift.id === giftId && gift.isReserved),
        );

        saveReservationIds(slug, validIds);

        return validIds;
      });
    } catch (loadError) {
      console.error("Could not load wishlist:", loadError);

      setPageError("The wishlist could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setWishlist(null);
      setGifts([]);
      setSelectedGift(null);
      setDialogError(null);
      setPageError(null);
      setReservationIds(loadReservationIds(slug));
      setIsLoading(true);

      void loadWishlist();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadWishlist, slug]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const channel = createWishlistChannel(slug, () => {
      void loadWishlist();
    });

    realtimeChannelRef.current = channel;

    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.error(`Could not connect to live updates for ${slug}.`);
      }

      if (status === "TIMED_OUT") {
        console.error(`Live update connection timed out for ${slug}.`);
      }
    });

    return () => {
      if (realtimeChannelRef.current === channel) {
        realtimeChannelRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [loadWishlist, slug]);

  useEffect(() => {
    const handleWindowFocus = () => {
      void loadWishlist();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [loadWishlist]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadWishlist();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadWishlist]);

  const closeReservationDialog = useCallback(() => {
    if (updatingGiftId !== null) {
      return;
    }

    setSelectedGift(null);
    setDialogError(null);
  }, [updatingGiftId]);

  const openReservationDialog = (gift: Gift) => {
    if (gift.isReserved || updatingGiftId !== null) {
      return;
    }

    setDialogError(null);
    setSelectedGift(gift);
  };

  const notifyOtherVisitors = useCallback(async () => {
    const channel = realtimeChannelRef.current;

    if (!channel) {
      return;
    }

    try {
      await broadcastWishlistChange(channel);
    } catch (broadcastError) {
      console.error(
        `Could not broadcast an update for ${slug}:`,
        broadcastError,
      );
    }
  }, [slug]);

  const reserveGift = async (name: string) => {
    const giftId = selectedGift?.id;

    if (giftId === undefined || !activeWishlistSlug) {
      return;
    }

    setUpdatingGiftId(giftId);
    setDialogError(null);

    try {
      const wasReserved = await reserveGiftRequest(
        activeWishlistSlug,
        giftId,
        name,
        visitorToken,
      );

      if (!wasReserved) {
        setDialogError(
          "Someone has already reserved this gift. The wishlist has been refreshed.",
        );

        await loadWishlist();
        return;
      }

      setReservationIds((currentIds) => {
        const nextIds = currentIds.includes(giftId)
          ? currentIds
          : [...currentIds, giftId];

        saveReservationIds(activeWishlistSlug, nextIds);

        return nextIds;
      });

      setGifts((currentGifts) =>
        currentGifts.map((gift) =>
          gift.id === giftId
            ? {
                ...gift,
                isReserved: true,
              }
            : gift,
        ),
      );

      setSelectedGift(null);

      await notifyOtherVisitors();
    } catch (reservationError) {
      console.error("Could not reserve gift:", reservationError);

      setDialogError("The gift could not be reserved. Please try again.");
    } finally {
      setUpdatingGiftId(null);
    }
  };

  const releaseGift = async (giftId: number) => {
    if (!activeWishlistSlug) {
      return;
    }

    setUpdatingGiftId(giftId);
    setPageError(null);

    try {
      const wasReleased = await releaseGiftRequest(
        activeWishlistSlug,
        giftId,
        visitorToken,
      );

      if (!wasReleased) {
        setPageError(
          "This reservation could not be released. It may belong to another browser.",
        );

        await loadWishlist();
        return;
      }

      setReservationIds((currentIds) => {
        const nextIds = currentIds.filter((currentId) => currentId !== giftId);

        saveReservationIds(activeWishlistSlug, nextIds);

        return nextIds;
      });

      setGifts((currentGifts) =>
        currentGifts.map((gift) =>
          gift.id === giftId
            ? {
                ...gift,
                isReserved: false,
              }
            : gift,
        ),
      );

      await notifyOtherVisitors();
    } catch (releaseError) {
      console.error("Could not release gift:", releaseError);

      setPageError("The reservation could not be released. Please try again.");
    } finally {
      setUpdatingGiftId(null);
    }
  };

  const retryLoading = () => {
    setIsLoading(true);
    void loadWishlist();
  };

  if (isLoading) {
    return (
      <main className="desktop">
        <MacWindow title="Opening Wishlist">
          <div className="wishlist-content">
            <div className="state-window" role="status">
              <span className="state-icon" aria-hidden="true">
                ⌛
              </span>

              <p>Loading wishlist...</p>
            </div>
          </div>
        </MacWindow>
      </main>
    );
  }

  if (!wishlist) {
    const hasLoadingError = Boolean(pageError);

    return (
      <main className="desktop">
        <MacWindow
          title={hasLoadingError ? "Wishlist Error" : "Wishlist Not Found"}
        >
          <div className="wishlist-content">
            {pageError && (
              <div className="notice notice--error" role="alert">
                <span>{pageError}</span>

                <button
                  className="notice-action"
                  type="button"
                  onClick={retryLoading}
                >
                  Try again
                </button>
              </div>
            )}

            <div className="not-found-content">
              <span className="not-found-icon" aria-hidden="true">
                {hasLoadingError ? "!" : "?"}
              </span>

              <h2>
                {hasLoadingError
                  ? "The wishlist is temporarily unavailable."
                  : "This wishlist could not be found."}
              </h2>

              <p>
                {hasLoadingError
                  ? "Try loading the wishlist again or return to the public directory."
                  : "Check the link or return to the public wishlist directory."}
              </p>

              <Link className="retro-button directory-link" to="/">
                Return home
              </Link>
            </div>
          </div>
        </MacWindow>
      </main>
    );
  }

  return (
    <main className="desktop">
      <MacWindow title={wishlistTitle}>
        <div className="wishlist-content">
          <nav className="page-navigation" aria-label="Page navigation">
            <Link className="back-link" to="/">
              ← Wishlist directory
            </Link>

            {wishlistVisibility === "unlisted" && (
              <span className="privacy-label">Unlisted</span>
            )}
          </nav>

          <section className="intro">
            <div className="intro-icon" aria-hidden="true">
              {wishlistIcon}
            </div>

            <div>
              <h2>{wishlistTitle}</h2>

              <p>{wishlistDescription}</p>
            </div>
          </section>

          {pageError && (
            <div className="notice notice--error" role="alert">
              <span>{pageError}</span>

              <button
                className="notice-action"
                type="button"
                onClick={retryLoading}
              >
                Try again
              </button>
            </div>
          )}

          {gifts.length > 0 && (
            <div className="toolbar" aria-label="Wishlist summary">
              <span>
                {gifts.length} {gifts.length === 1 ? "gift" : "gifts"}
              </span>

              <span>
                {availableCount} {availableCount === 1 ? "is" : "are"} still
                available
              </span>
            </div>
          )}

          {gifts.length === 0 && !pageError && (
            <div className="state-window">
              <span className="state-icon" aria-hidden="true">
                □
              </span>

              <p>No gifts have been added to this wishlist yet.</p>
            </div>
          )}

          {gifts.length > 0 && (
            <section
              className="gift-grid"
              aria-label={`${wishlistTitle} gifts`}
            >
              {gifts.map((gift) => (
                <GiftCard
                  key={gift.id}
                  gift={gift}
                  canRelease={reservationIds.includes(gift.id)}
                  isUpdating={updatingGiftId === gift.id}
                  onChoose={openReservationDialog}
                  onRelease={releaseGift}
                />
              ))}
            </section>
          )}

          <footer className="wishlist-footer">
            <span aria-hidden="true">♥</span>

            <p>Thank you for making this birthday special.</p>
          </footer>
        </div>
      </MacWindow>

      {selectedGift !== null && (
        <ReservationDialog
          gift={selectedGift}
          isSubmitting={updatingGiftId === selectedGift.id}
          submitError={dialogError}
          onCancel={closeReservationDialog}
          onConfirm={reserveGift}
        />
      )}
    </main>
  );
}

export default WishlistPage;

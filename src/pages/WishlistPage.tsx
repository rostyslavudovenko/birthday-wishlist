import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import AppFooter from "../components/AppFooter";
import CandyBurst from "../components/CandyBurst";
import GiftCard from "../components/GiftCard";
import MacWindow from "../components/MacWindow";
import ReservationDialog from "../components/ReservationDialog";
import { supabase } from "../lib/supabase";
import {
  releaseGift as releaseGiftRequest,
  reserveGift as reserveGiftRequest,
} from "../services/gifts";
import {
  broadcastWishlistChange,
  createWishlistChannel,
} from "../services/realtime";
import {
  getCachedWishlistPage,
  refreshWishlistPage,
  updateCachedWishlistGifts,
} from "../services/wishlistCache";
import type { Gift } from "../types/gift";
import type { Wishlist } from "../types/wishlist";
import {
  getVisitorToken,
  loadReservationIds,
  saveReservationIds,
} from "../utils/storage";

function WishlistPage() {
  const { slug = "" } = useParams();
  const cachedData = getCachedWishlistPage(slug);

  const [wishlist, setWishlist] = useState<Wishlist | null>(
    () => cachedData?.wishlist ?? null,
  );
  const [gifts, setGifts] = useState<Gift[]>(() => cachedData?.gifts ?? []);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [reservationIds, setReservationIds] = useState<number[]>(() =>
    loadReservationIds(slug),
  );
  const [visitorToken] = useState(() => getVisitorToken());
  const [isLoading, setIsLoading] = useState(() => cachedData === null);
  const [updatingGiftId, setUpdatingGiftId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");
  const [showCandyBurst, setShowCandyBurst] = useState(false);

  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const candyBurstTimerRef = useRef<number | null>(null);

  const activeWishlistSlug = wishlist?.slug ?? slug;
  const wishlistTitle = wishlist?.title ?? "Wishlist";
  const wishlistDescription = wishlist?.description ?? "";
  const wishlistIcon = wishlist?.icon ?? "🎁";
  const wishlistTheme = wishlist?.theme ?? "classic";
  const wishlistVisibility = wishlist?.visibility ?? null;
  const availableCount = gifts.filter((gift) => !gift.isReserved).length;

  const applyWishlistData = useCallback(
    (data: Awaited<ReturnType<typeof refreshWishlistPage>>) => {
      setPageError(null);
      setWishlist(data?.wishlist ?? null);
      setGifts(data?.gifts ?? []);

      if (!data) {
        setReservationIds([]);
        saveReservationIds(slug, []);
        return;
      }

      setReservationIds((currentIds) => {
        const validIds = currentIds.filter((giftId) =>
          data.gifts.some((gift) => gift.id === giftId && gift.isReserved),
        );
        saveReservationIds(slug, validIds);
        return validIds;
      });
    },
    [slug],
  );

  const loadWishlist = useCallback(async () => {
    try {
      const data = await refreshWishlistPage(slug);
      applyWishlistData(data);
    } catch (loadError) {
      console.error("Could not load wishlist:", loadError);
      setPageError("The wishlist could not be loaded. Please try again.");
    }
  }, [applyWishlistData, slug]);

  useEffect(() => {
    let isActive = true;

    void refreshWishlistPage(slug)
      .then((data) => {
        if (!isActive) {
          return;
        }

        applyWishlistData(data);
      })
      .catch((loadError: unknown) => {
        if (!isActive) {
          return;
        }

        console.error("Could not load wishlist:", loadError);
        setPageError("The wishlist could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [applyWishlistData, slug]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    const channel = createWishlistChannel(slug, () => {
      void loadWishlist();
      setLiveAnnouncement("The wishlist was updated by another guest.");
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

  useEffect(() => {
    if (isLoading) {
      document.title = "Loading Wishlist… — Birthday Wishlist";
    } else if (pageError || !wishlist) {
      document.title = "Wishlist Not Found — Birthday Wishlist";
    } else {
      document.title = `${wishlist.title} — Birthday Wishlist`;
    }
  }, [isLoading, pageError, wishlist]);

  useEffect(() => {
    return () => {
      if (candyBurstTimerRef.current !== null) {
        window.clearTimeout(candyBurstTimerRef.current);
      }
    };
  }, []);

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

  const celebrateReservation = useCallback(() => {
    if (wishlistTheme !== "bubblegum") {
      return;
    }

    if (candyBurstTimerRef.current !== null) {
      window.clearTimeout(candyBurstTimerRef.current);
    }

    setShowCandyBurst(true);
    candyBurstTimerRef.current = window.setTimeout(() => {
      setShowCandyBurst(false);
      candyBurstTimerRef.current = null;
    }, 2000);
  }, [wishlistTheme]);

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

      setGifts((currentGifts) => {
        const nextGifts = currentGifts.map((gift) =>
          gift.id === giftId
            ? {
                ...gift,
                isReserved: true,
              }
            : gift,
        );

        updateCachedWishlistGifts(activeWishlistSlug, nextGifts);
        return nextGifts;
      });

      setSelectedGift(null);
      celebrateReservation();
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

      setGifts((currentGifts) => {
        const nextGifts = currentGifts.map((gift) =>
          gift.id === giftId
            ? {
                ...gift,
                isReserved: false,
              }
            : gift,
        );

        updateCachedWishlistGifts(activeWishlistSlug, nextGifts);
        return nextGifts;
      });

      await notifyOtherVisitors();
    } catch (releaseError) {
      console.error("Could not release gift:", releaseError);
      setPageError("The reservation could not be released. Please try again.");
    } finally {
      setUpdatingGiftId(null);
    }
  };

  const retryLoading = () => {
    setIsLoading(wishlist === null);
    void loadWishlist().finally(() => {
      setIsLoading(false);
    });
  };

  if (isLoading) {
    return (
      <div className="wishlist-theme" data-wishlist-theme={wishlistTheme}>
        <main className="desktop">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveAnnouncement}
          </div>

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
      </div>
    );
  }

  if (!wishlist) {
    const hasLoadingError = Boolean(pageError);

    return (
      <div className="wishlist-theme" data-wishlist-theme={wishlistTheme}>
        <main className="desktop">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveAnnouncement}
          </div>

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
      </div>
    );
  }

  return (
    <div className="wishlist-theme" data-wishlist-theme={wishlistTheme}>
      <main className="desktop">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </div>

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

            <AppFooter />
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

        {showCandyBurst && <CandyBurst />}
      </main>
    </div>
  );
}

export default WishlistPage;

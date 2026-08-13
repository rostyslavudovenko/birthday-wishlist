import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import GiftCard from "../components/GiftCard";
import MacWindow from "../components/MacWindow";
import ReservationDialog from "../components/ReservationDialog";
import {
  fetchWishlistGifts,
  releaseGift as releaseGiftRequest,
  reserveGift as reserveGiftRequest,
} from "../services/gifts";
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
      setReservationIds(loadReservationIds(slug));
      setIsLoading(true);

      void loadWishlist();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadWishlist, slug]);

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

  const reserveGift = async (name: string) => {
    if (!selectedGift || !wishlist) {
      return;
    }

    const giftId = selectedGift.id;

    setUpdatingGiftId(giftId);
    setDialogError(null);

    try {
      const wasReserved = await reserveGiftRequest(
        wishlist.slug,
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

        saveReservationIds(wishlist.slug, nextIds);

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
    } catch (reservationError) {
      console.error("Could not reserve gift:", reservationError);

      setDialogError("The gift could not be reserved. Please try again.");
    } finally {
      setUpdatingGiftId(null);
    }
  };

  const releaseGift = async (giftId: number) => {
    if (!wishlist) {
      return;
    }

    setUpdatingGiftId(giftId);
    setPageError(null);

    try {
      const wasReleased = await releaseGiftRequest(
        wishlist.slug,
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

        saveReservationIds(wishlist.slug, nextIds);

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

  if (!wishlist && !pageError) {
    return (
      <main className="desktop">
        <MacWindow title="Wishlist Not Found">
          <div className="wishlist-content">
            <div className="not-found-content">
              <span className="not-found-icon" aria-hidden="true">
                ?
              </span>

              <h2>This wishlist could not be found.</h2>

              <p>Check the link or return to the public wishlist directory.</p>

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
      <MacWindow title={wishlist?.title ?? "Wishlist"}>
        <div className="wishlist-content">
          <nav className="page-navigation" aria-label="Page navigation">
            <Link className="back-link" to="/">
              ← Wishlist directory
            </Link>

            {wishlist?.visibility === "unlisted" && (
              <span className="privacy-label">Unlisted</span>
            )}
          </nav>

          {wishlist && (
            <section className="intro">
              <div className="intro-icon" aria-hidden="true">
                {wishlist.icon}
              </div>

              <div>
                <h2>{wishlist.title}</h2>
                <p>{wishlist.description}</p>
              </div>
            </section>
          )}

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

          {wishlist && gifts.length > 0 && (
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

          {wishlist && gifts.length === 0 && !pageError && (
            <div className="state-window">
              <span className="state-icon" aria-hidden="true">
                □
              </span>

              <p>No gifts have been added to this wishlist yet.</p>
            </div>
          )}

          {wishlist && gifts.length > 0 && (
            <section
              className="gift-grid"
              aria-label={`${wishlist.title} gifts`}
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

      {selectedGift && (
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

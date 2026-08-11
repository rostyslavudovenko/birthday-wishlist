import { useCallback, useEffect, useState } from "react";
import "./App.css";
import GiftCard from "./components/GiftCard";
import ReservationDialog from "./components/ReservationDialog";
import {
  fetchGifts,
  releaseGift as releaseGiftRequest,
  reserveGift as reserveGiftRequest,
} from "./services/gifts";
import type { Gift } from "./types/gift";
import {
  getVisitorToken,
  loadReservationIds,
  saveReservationIds,
} from "./utils/storage";

function App() {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [reservationIds, setReservationIds] =
    useState<number[]>(loadReservationIds);
  const [visitorToken] = useState(() => getVisitorToken());
  const [isLoading, setIsLoading] = useState(true);
  const [updatingGiftId, setUpdatingGiftId] = useState<number | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const availableCount = gifts.filter((gift) => !gift.isReserved).length;

  const loadSharedGifts = useCallback(async () => {
    setPageError(null);

    try {
      const sharedGifts = await fetchGifts();

      setGifts(sharedGifts);

      setReservationIds((currentIds) => {
        const validIds = currentIds.filter((giftId) =>
          sharedGifts.some((gift) => gift.id === giftId && gift.isReserved),
        );

        saveReservationIds(validIds);
        return validIds;
      });
    } catch (error) {
      console.error("Could not load gifts:", error);
      setPageError("The wishlist could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSharedGifts();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadSharedGifts]);

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
    if (!selectedGift) {
      return;
    }

    const giftId = selectedGift.id;

    setUpdatingGiftId(giftId);
    setDialogError(null);

    try {
      const wasReserved = await reserveGiftRequest(giftId, name, visitorToken);

      if (!wasReserved) {
        setDialogError(
          "Someone has already reserved this gift. The wishlist has been refreshed.",
        );
        await loadSharedGifts();
        return;
      }

      setReservationIds((currentIds) => {
        const nextIds = currentIds.includes(giftId)
          ? currentIds
          : [...currentIds, giftId];

        saveReservationIds(nextIds);
        return nextIds;
      });

      setGifts((currentGifts) =>
        currentGifts.map((gift) =>
          gift.id === giftId ? { ...gift, isReserved: true } : gift,
        ),
      );

      setSelectedGift(null);
    } catch (error) {
      console.error("Could not reserve gift:", error);
      setDialogError("The gift could not be reserved. Please try again.");
    } finally {
      setUpdatingGiftId(null);
    }
  };

  const releaseGift = async (giftId: number) => {
    setUpdatingGiftId(giftId);
    setPageError(null);

    try {
      const wasReleased = await releaseGiftRequest(giftId, visitorToken);

      if (!wasReleased) {
        setPageError(
          "This reservation could not be released. It may belong to another browser.",
        );
        await loadSharedGifts();
        return;
      }

      setReservationIds((currentIds) => {
        const nextIds = currentIds.filter((currentId) => currentId !== giftId);

        saveReservationIds(nextIds);
        return nextIds;
      });

      setGifts((currentGifts) =>
        currentGifts.map((gift) =>
          gift.id === giftId ? { ...gift, isReserved: false } : gift,
        ),
      );
    } catch (error) {
      console.error("Could not release gift:", error);
      setPageError("The reservation could not be released. Please try again.");
    } finally {
      setUpdatingGiftId(null);
    }
  };

  const retryLoading = () => {
    setIsLoading(true);
    void loadSharedGifts();
  };

  return (
    <main className="desktop">
      <section className="wishlist-window">
        <header className="window-title-bar window-title-bar--main">
          <span className="window-control" aria-hidden="true" />

          <div className="title-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <h1>Birthday Wishlist</h1>

          <div className="title-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <span
            className="window-control window-control--right"
            aria-hidden="true"
          />
        </header>

        <div className="wishlist-content">
          <section className="intro">
            <div className="intro-icon" aria-hidden="true">
              🎁
            </div>

            <div>
              <h2>Welcome to my wishlist!</h2>

              <p>
                Choose a gift you would like to give. Once selected, it will be
                marked as reserved for everyone else.
              </p>
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

          {!isLoading && gifts.length > 0 && (
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

          {isLoading ? (
            <div className="state-window" role="status">
              <span className="state-icon" aria-hidden="true">
                ⌛
              </span>

              <p>Loading wishlist...</p>
            </div>
          ) : gifts.length === 0 && !pageError ? (
            <div className="state-window">
              <span className="state-icon" aria-hidden="true">
                □
              </span>

              <p>No gifts have been added yet.</p>
            </div>
          ) : (
            <section className="gift-grid" aria-label="Birthday gifts">
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
            <p>Thank you for making my birthday special.</p>
          </footer>
        </div>
      </section>

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

export default App;

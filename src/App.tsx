import { useCallback, useEffect, useState } from "react";
import "./App.css";
import GiftCard from "./components/GiftCard";
import ReservationDialog from "./components/ReservationDialog";
import type { Gift } from "./types/gift";
import { getVisitorToken, loadGifts, saveGifts } from "./utils/storage";

function App() {
  const [gifts, setGifts] = useState<Gift[]>(loadGifts);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [visitorToken] = useState(getVisitorToken);

  const availableCount = gifts.filter(
    (gift) => gift.reservedBy === null,
  ).length;

  useEffect(() => {
    saveGifts(gifts);
  }, [gifts]);

  const closeReservationDialog = useCallback(() => {
    setSelectedGift(null);
  }, []);

  const openReservationDialog = (gift: Gift) => {
    if (gift.reservedBy !== null) {
      return;
    }

    setSelectedGift(gift);
  };

  const reserveGift = (name: string) => {
    if (!selectedGift) {
      return;
    }

    setGifts((currentGifts) =>
      currentGifts.map((gift) => {
        if (gift.id !== selectedGift.id || gift.reservedBy !== null) {
          return gift;
        }

        return {
          ...gift,
          reservedBy: name,
          reservationToken: visitorToken,
        };
      }),
    );

    setSelectedGift(null);
  };

  const releaseGift = (giftId: number) => {
    setGifts((currentGifts) =>
      currentGifts.map((gift) => {
        const belongsToVisitor =
          gift.id === giftId && gift.reservationToken === visitorToken;

        if (!belongsToVisitor) {
          return gift;
        }

        return {
          ...gift,
          reservedBy: null,
          reservationToken: null,
        };
      }),
    );
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

          <div className="toolbar" aria-label="Wishlist summary">
            <span>
              {gifts.length} {gifts.length === 1 ? "gift" : "gifts"}
            </span>

            <span>
              {availableCount} {availableCount === 1 ? "is" : "are"} still
              available
            </span>
          </div>

          <section className="gift-grid" aria-label="Birthday gifts">
            {gifts.map((gift) => (
              <GiftCard
                key={gift.id}
                gift={gift}
                canRelease={gift.reservationToken === visitorToken}
                onChoose={openReservationDialog}
                onRelease={releaseGift}
              />
            ))}
          </section>

          <footer className="wishlist-footer">
            <span aria-hidden="true">♥</span>
            <p>Thank you for making my birthday special.</p>
          </footer>
        </div>
      </section>

      {selectedGift && (
        <ReservationDialog
          gift={selectedGift}
          onCancel={closeReservationDialog}
          onConfirm={reserveGift}
        />
      )}
    </main>
  );
}

export default App;

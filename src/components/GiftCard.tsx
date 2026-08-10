import type { Gift } from "../types/gift";

type GiftCardProps = {
  gift: Gift;
  canRelease: boolean;
  onChoose: (gift: Gift) => void;
  onRelease: (giftId: number) => void;
};

function GiftCard({ gift, canRelease, onChoose, onRelease }: GiftCardProps) {
  const isReserved = gift.reservedBy !== null;

  return (
    <article className="gift-window">
      <header className="window-title-bar">
        <span className="window-control" aria-hidden="true" />

        <div className="title-lines" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <h2>{gift.name}</h2>

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

      <div className="gift-content">
        <div className="gift-image" aria-hidden="true">
          {gift.image}
        </div>

        <div className="gift-details">
          <div className="gift-heading">
            <h3>{gift.name}</h3>

            <span
              className={`status-badge ${
                isReserved ? "status-badge--reserved" : ""
              }`}
            >
              {isReserved ? "Reserved" : "Available"}
            </span>
          </div>

          <p>{gift.description}</p>
          <p className="gift-price">{gift.price}</p>

          {canRelease ? (
            <button
              className="retro-button retro-button--secondary"
              type="button"
              onClick={() => onRelease(gift.id)}
            >
              Release my reservation
            </button>
          ) : (
            <button
              className="retro-button"
              type="button"
              disabled={isReserved}
              onClick={() => onChoose(gift)}
            >
              {isReserved ? "Already chosen" : "Choose this gift"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default GiftCard;

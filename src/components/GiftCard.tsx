import { useState } from "react";
import type { Gift } from "../types/gift";

type GiftCardProps = {
  gift: Gift;
  canRelease: boolean;
  isUpdating: boolean;
  onChoose: (gift: Gift) => void;
  onRelease: (giftId: number) => void;
};

type GiftVisualProps = {
  gift: Gift;
};

function isImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function GiftVisual({ gift }: GiftVisualProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImageUrl = isImageUrl(gift.image);

  if (hasImageUrl && !imageFailed) {
    return (
      <img
        className="gift-image__photo"
        src={gift.image}
        alt={gift.name}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  const fallbackIcon = hasImageUrl ? "🎁" : gift.image;

  return (
    <span className="gift-image__icon" aria-hidden="true">
      {fallbackIcon}
    </span>
  );
}

function GiftCard({
  gift,
  canRelease,
  isUpdating,
  onChoose,
  onRelease,
}: GiftCardProps) {
  const showReleaseButton = gift.isReserved && canRelease;

  const chooseButtonLabel = isUpdating
    ? "Saving..."
    : gift.isReserved
      ? "Already chosen"
      : "Choose this gift";

  return (
    <article className="gift-window">
      <header className="window-title-bar">
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
      </header>

      <div className="gift-content">
        <div className="gift-image">
          <GiftVisual key={gift.image} gift={gift} />
        </div>

        <div className="gift-details">
          <div className="gift-heading">
            <h3>{gift.name}</h3>

            <span
              className={`status-badge ${
                gift.isReserved ? "status-badge--reserved" : ""
              }`}
            >
              {gift.isReserved ? "Reserved" : "Available"}
            </span>
          </div>

          <p>{gift.description}</p>

          <div className="gift-purchase-row">
            <p className="gift-price">{gift.price}</p>

            {gift.storeUrl && (
              <a
                className="gift-store-link"
                href={gift.storeUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${gift.name} product page, opens in a new tab`}
              >
                <span className="gift-store-link__label">View product</span>
                <span className="gift-store-link__icon" aria-hidden="true">
                  ↗
                </span>
              </a>
            )}
          </div>

          {showReleaseButton ? (
            <button
              className="retro-button retro-button--secondary"
              type="button"
              disabled={isUpdating}
              onClick={() => onRelease(gift.id)}
            >
              {isUpdating ? "Releasing..." : "Release my reservation"}
            </button>
          ) : (
            <button
              className="retro-button"
              type="button"
              disabled={gift.isReserved || isUpdating}
              onClick={() => onChoose(gift)}
            >
              {chooseButtonLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default GiftCard;

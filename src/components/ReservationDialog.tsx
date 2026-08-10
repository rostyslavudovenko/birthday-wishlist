import { useEffect, useRef, useState } from "react";
import type { Gift } from "../types/gift";

type ReservationDialogProps = {
  gift: Gift;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

function ReservationDialog({
  gift,
  onCancel,
  onConfirm,
}: ReservationDialogProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("dialog-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("dialog-open");
    };
  }, [onCancel]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError("Please enter at least 2 characters.");
      inputRef.current?.focus();
      return;
    }

    if (trimmedName.length > 50) {
      setError("Please keep the name under 50 characters.");
      inputRef.current?.focus();
      return;
    }

    onConfirm(trimmedName);
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);

    if (error) {
      setError("");
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        className="reservation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-title"
        aria-describedby="reservation-description"
      >
        <header className="window-title-bar">
          <span className="window-control" aria-hidden="true" />

          <div className="title-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <h2>Reserve Gift</h2>

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

        <form className="dialog-content" onSubmit={handleSubmit}>
          <div className="dialog-message">
            <div className="dialog-icon" aria-hidden="true">
              ?
            </div>

            <div>
              <h2 id="reservation-title">Choose {gift.name}?</h2>
              <p id="reservation-description">
                Enter your name to reserve this gift. Your name will not be
                shown publicly.
              </p>
            </div>
          </div>

          <label className="field-label" htmlFor="guest-name">
            Your name
          </label>

          <input
            ref={inputRef}
            className={`retro-input ${error ? "retro-input--error" : ""}`}
            id="guest-name"
            name="guestName"
            type="text"
            value={name}
            maxLength={50}
            autoComplete="name"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "name-error" : undefined}
            onChange={handleNameChange}
          />

          {error && (
            <p className="field-error" id="name-error" role="alert">
              {error}
            </p>
          )}

          <div className="dialog-actions">
            <button
              className="retro-button retro-button--secondary"
              type="button"
              onClick={onCancel}
            >
              Cancel
            </button>

            <button className="retro-button" type="submit">
              Reserve gift
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ReservationDialog;

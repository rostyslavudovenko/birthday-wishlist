import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import type { Gift } from "../types/gift";

type ReservationDialogProps = {
  gift: Gift;
  isSubmitting: boolean;
  submitError: string | null;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

function ReservationDialog({
  gift,
  isSubmitting,
  submitError,
  onCancel,
  onConfirm,
}: ReservationDialogProps) {
  const [name, setName] = useState("");
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("dialog-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("dialog-open");
    };
  }, [isSubmitting, onCancel]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setValidationError("Please enter at least 2 characters.");
      inputRef.current?.focus();
      return;
    }

    if (trimmedName.length > 50) {
      setValidationError("Please keep the name under 50 characters.");
      inputRef.current?.focus();
      return;
    }

    onConfirm(trimmedName);
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);

    if (validationError) {
      setValidationError("");
    }
  };

  const displayedError = validationError || submitError;

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
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
            className={`retro-input ${
              displayedError ? "retro-input--error" : ""
            }`}
            id="guest-name"
            name="guestName"
            type="text"
            value={name}
            maxLength={50}
            autoComplete="name"
            disabled={isSubmitting}
            aria-invalid={Boolean(displayedError)}
            aria-describedby={displayedError ? "name-error" : undefined}
            onChange={handleNameChange}
          />

          {displayedError && (
            <p className="field-error" id="name-error" role="alert">
              {displayedError}
            </p>
          )}

          <div className="dialog-actions">
            <button
              className="retro-button retro-button--secondary"
              type="button"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              className="retro-button"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Reserving..." : "Reserve gift"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ReservationDialog;

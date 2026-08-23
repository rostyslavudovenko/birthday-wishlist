import { useEffect, useRef } from "react";

type AboutDialogProps = {
  onClose: () => void;
};

function AboutDialog({ onClose }: AboutDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    closeButtonRef.current?.focus();
    document.body.classList.add("dialog-open");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("dialog-open");
      previouslyFocusedElement?.focus();
    };
  }, [onClose]);

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <section
        className="about-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
        aria-describedby="about-dialog-description"
      >
        <header className="window-title-bar">
          <span className="window-control" aria-hidden="true" />

          <div className="title-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <h2 id="about-dialog-title">About</h2>

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

        <div className="about-dialog__content">
          <div className="about-dialog__icon" aria-hidden="true">
            🎁
          </div>

          <h3>Birthday Wishlist</h3>

          <p id="about-dialog-description">
            A retro Mac-inspired wishlist for choosing gifts without duplicates
            or unnecessary coordination.
          </p>

          <p className="about-dialog__credit">
            Developed with <span aria-label="love">♥</span> by Rostyslav
            Udovenko
          </p>

          <nav className="about-dialog__links" aria-label="Project links">
            <a
              href="https://github.com/rostyslavudovenko/birthday-wishlist"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>

            <span aria-hidden="true">·</span>

            <a
              href="https://github.com/rostyslavudovenko/birthday-wishlist/issues"
              target="_blank"
              rel="noreferrer"
            >
              Feedback
            </a>

            <span aria-hidden="true">·</span>

            <a href="mailto:rostyslavudovenko@icloud.com">Contact</a>
          </nav>

          <button
            ref={closeButtonRef}
            className="retro-button about-dialog__close"
            type="button"
            onClick={onClose}
          >
            OK
          </button>
        </div>
      </section>
    </div>
  );
}

export default AboutDialog;

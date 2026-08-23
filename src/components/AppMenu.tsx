import { useCallback, useEffect, useRef, useState } from "react";
import AboutDialog from "./AboutDialog";

function AppMenu() {
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const aboutButtonRef = useRef<HTMLButtonElement>(null);

  const closeHelpMenu = useCallback(() => {
    setIsHelpMenuOpen(false);
  }, []);

  const closeAboutDialog = useCallback(() => {
    setIsAboutDialogOpen(false);

    window.requestAnimationFrame(() => {
      helpButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!isHelpMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target)
      ) {
        closeHelpMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeHelpMenu();
        helpButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeHelpMenu, isHelpMenuOpen]);

  useEffect(() => {
    if (isHelpMenuOpen) {
      aboutButtonRef.current?.focus();
    }
  }, [isHelpMenuOpen]);

  const toggleHelpMenu = () => {
    setIsHelpMenuOpen((currentValue) => !currentValue);
  };

  const openAboutDialog = () => {
    setIsHelpMenuOpen(false);
    setIsAboutDialogOpen(true);
  };

  return (
    <>
      <nav className="app-menu" aria-label="Application menu">
        <div className="app-menu__item" ref={menuRef}>
          <button
            ref={helpButtonRef}
            className="app-menu__trigger"
            type="button"
            aria-haspopup="menu"
            aria-expanded={isHelpMenuOpen}
            aria-controls="help-menu"
            onClick={toggleHelpMenu}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setIsHelpMenuOpen(true);
              }
            }}
          >
            Help
          </button>

          {isHelpMenuOpen && (
            <div className="app-menu__dropdown" id="help-menu" role="menu">
              <button
                ref={aboutButtonRef}
                className="app-menu__option"
                type="button"
                role="menuitem"
                onClick={openAboutDialog}
              >
                About Birthday Wishlist
              </button>
            </div>
          )}
        </div>
      </nav>

      {isAboutDialogOpen && <AboutDialog onClose={closeAboutDialog} />}
    </>
  );
}

export default AppMenu;

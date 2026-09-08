import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import AboutDialog from "./AboutDialog";

const menuOptions = [
  {
    id: "about",
    label: "About Birthday Wishlist",
  },
];

function AppMenu() {
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const closeHelpMenu = useCallback(() => {
    setIsHelpMenuOpen(false);
  }, []);

  const closeAboutDialog = useCallback(() => {
    setIsAboutDialogOpen(false);

    window.requestAnimationFrame(() => {
      helpButtonRef.current?.focus();
    });
  }, []);

  const openAboutDialog = useCallback(() => {
    setIsHelpMenuOpen(false);
    setIsAboutDialogOpen(true);
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

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
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
      menuItemRefs.current[focusedItemIndex]?.focus();
    }
  }, [focusedItemIndex, isHelpMenuOpen]);

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocusedItemIndex((prev) => (prev + 1) % menuOptions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocusedItemIndex(
        (prev) => (prev - 1 + menuOptions.length) % menuOptions.length,
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      setFocusedItemIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setFocusedItemIndex(menuOptions.length - 1);
    }
  };

  const toggleHelpMenu = () => {
    setIsHelpMenuOpen((currentValue) => {
      if (!currentValue) {
        setFocusedItemIndex(0);
      }

      return !currentValue;
    });
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
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setFocusedItemIndex(0);
                setIsHelpMenuOpen(true);
              }
            }}
          >
            Help
          </button>

          {isHelpMenuOpen && (
            <div
              className="app-menu__dropdown"
              id="help-menu"
              role="menu"
              onKeyDown={handleMenuKeyDown}
            >
              {menuOptions.map((option, index) => (
                <button
                  key={option.id}
                  ref={(node) => {
                    menuItemRefs.current[index] = node;
                  }}
                  className="app-menu__option"
                  type="button"
                  role="menuitem"
                  tabIndex={index === focusedItemIndex ? 0 : -1}
                  onClick={openAboutDialog}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {isAboutDialogOpen && <AboutDialog onClose={closeAboutDialog} />}
    </>
  );
}

export default AppMenu;
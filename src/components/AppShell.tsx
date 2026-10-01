import type { ReactNode } from "react";
import type { WishlistTheme } from "../types/wishlist";
import MacWindow from "./MacWindow";

type AppShellProps = {
  title: string;
  children: ReactNode;
  theme?: WishlistTheme;
  liveAnnouncement?: string;
};

function AppShell({
  title,
  children,
  theme = "classic",
  liveAnnouncement = "",
}: AppShellProps) {
  return (
    <div className="wishlist-theme" data-wishlist-theme={theme}>
      <main className="desktop">
        {liveAnnouncement && (
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {liveAnnouncement}
          </div>
        )}

        <MacWindow title={title}>
          <div className="wishlist-content">{children}</div>
        </MacWindow>
      </main>
    </div>
  );
}

export default AppShell;

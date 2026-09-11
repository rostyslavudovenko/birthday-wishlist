import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import AppFooter from "../components/AppFooter";
import MacWindow from "../components/MacWindow";
import {
  getCachedFeaturedWishlists,
  loadFeaturedWishlists,
} from "../services/wishlistCache";
import type { FeaturedWishlist } from "../types/wishlist";

function HomePage() {
  const cachedWishlists = getCachedFeaturedWishlists();

  const [wishlists, setWishlists] = useState<FeaturedWishlist[]>(
    () => cachedWishlists ?? [],
  );
  const [isLoading, setIsLoading] = useState(() => cachedWishlists === null);
  const [isRefreshing, setIsRefreshing] = useState(
    () => cachedWishlists !== null,
  );
  const [error, setError] = useState<string | null>(null);

  const loadWishlists = useCallback(
    async ({ showInitialLoading = false } = {}) => {
      if (showInitialLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError(null);

      try {
        const featuredWishlists = await loadFeaturedWishlists();
        setWishlists(featuredWishlists);
      } catch (loadError) {
        console.error("Could not load featured wishlists:", loadError);
        setError("The wishlists could not be loaded. Please try again.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    document.title = "Birthday Wishlists";
  }, []);

  useEffect(() => {
    let isActive = true;

    void loadFeaturedWishlists()
      .then((featuredWishlists) => {
        if (!isActive) {
          return;
        }

        setWishlists(featuredWishlists);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!isActive) {
          return;
        }

        console.error("Could not load featured wishlists:", loadError);
        setError("The wishlists could not be loaded. Please try again.");
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setIsLoading(false);
        setIsRefreshing(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const retryLoading = () => {
    void loadWishlists({
      showInitialLoading: wishlists.length === 0,
    });
  };

  return (
    <main className="desktop">
      <MacWindow title="Wishlist Directory">
        <div className="wishlist-content">
          <section className="intro">
            <div className="intro-icon" aria-hidden="true">
              🎁
            </div>

            <div>
              <h2>Birthday Wishlists</h2>
              <p>
                Open a wishlist, choose a gift, and avoid buying the same thing
                as someone else.
              </p>
            </div>
          </section>

          {error && (
            <div className="notice notice--error" role="alert">
              <span>{error}</span>

              <button
                className="notice-action"
                type="button"
                onClick={retryLoading}
              >
                Try again
              </button>
            </div>
          )}

          {isRefreshing && wishlists.length > 0 && (
            <div className="sr-only" role="status" aria-live="polite">
              Refreshing wishlists.
            </div>
          )}

          {isLoading ? (
            <div className="state-window" role="status">
              <span className="state-icon" aria-hidden="true">
                ⌛
              </span>
              <p>Loading wishlists...</p>
            </div>
          ) : wishlists.length === 0 && !error ? (
            <div className="state-window">
              <span className="state-icon" aria-hidden="true">
                □
              </span>
              <p>No public wishlists are available yet.</p>
            </div>
          ) : (
            <section
              className="wishlist-directory"
              aria-label="Public wishlists"
              aria-busy={isRefreshing}
            >
              {wishlists.map((wishlist) => (
                <article className="directory-window" key={wishlist.slug}>
                  <header className="window-title-bar">
                    <div className="title-lines" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <h2>{wishlist.ownerName}</h2>

                    <div className="title-lines" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </header>

                  <div className="directory-content">
                    <div className="directory-icon" aria-hidden="true">
                      {wishlist.icon}
                    </div>

                    <h3>{wishlist.title}</h3>
                    <p>{wishlist.description}</p>

                    <div className="directory-stats">
                      <span>
                        {wishlist.giftCount}{" "}
                        {wishlist.giftCount === 1 ? "gift" : "gifts"}
                      </span>
                      <span>{wishlist.availableCount} available</span>
                    </div>

                    <Link
                      className="retro-button directory-link"
                      to={`/w/${wishlist.slug}`}
                    >
                      Open wishlist
                    </Link>
                  </div>
                </article>
              ))}
            </section>
          )}

          <AppFooter />
        </div>
      </MacWindow>
    </main>
  );
}

export default HomePage;

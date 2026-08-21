import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import AppFooter from "../components/AppFooter";
import MacWindow from "../components/MacWindow";
import { fetchFeaturedWishlists } from "../services/wishlists";
import type { FeaturedWishlist } from "../types/wishlist";

function HomePage() {
  const [wishlists, setWishlists] = useState<FeaturedWishlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWishlists = useCallback(async () => {
    setError(null);

    try {
      const featuredWishlists = await fetchFeaturedWishlists();

      setWishlists(featuredWishlists);
    } catch (loadError) {
      console.error("Could not load featured wishlists:", loadError);

      setError("The wishlists could not be loaded. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWishlists();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadWishlists]);

  const retryLoading = () => {
    setIsLoading(true);
    void loadWishlists();
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
            >
              {wishlists.map((wishlist) => (
                <article className="directory-window" key={wishlist.slug}>
                  <header className="window-title-bar">
                    <span className="window-control" aria-hidden="true" />

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

                    <span
                      className="window-control window-control--right"
                      aria-hidden="true"
                    />
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

import { useEffect } from "react";
import { Link } from "react-router";
import MacWindow from "../components/MacWindow";

function NotFoundPage() {
  useEffect(() => {
    document.title = "404 Not Found — Birthday Wishlist";
  }, []);

  return (
    <main className="desktop">
      <MacWindow title="404">
        <div className="wishlist-content">
          <div className="not-found-content">
            <span className="not-found-icon" aria-hidden="true">
              ?
            </span>

            <h2>Page not found</h2>

            <p>The requested page does not exist or may have moved.</p>

            <Link className="retro-button directory-link" to="/">
              Return home
            </Link>
          </div>
        </div>
      </MacWindow>
    </main>
  );
}

export default NotFoundPage;

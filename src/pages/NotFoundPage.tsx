import { useEffect } from "react";
import { Link } from "react-router";
import AppShell from "../components/AppShell";

function NotFoundPage() {
  useEffect(() => {
    document.title = "404 Not Found — Birthday Wishlist";
  }, []);

  return (
    <AppShell title="404">
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
    </AppShell>
  );
}

export default NotFoundPage;

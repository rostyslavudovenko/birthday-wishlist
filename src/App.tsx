import { useLayoutEffect } from "react";
import { Route, Routes, useLocation, useParams } from "react-router";
import "./App.css";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import WishlistPage from "./pages/WishlistPage";

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

function WishlistRoute() {
  const { slug = "" } = useParams();

  return <WishlistPage key={slug} />;
}

function App() {
  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/w/:slug" element={<WishlistRoute />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default App;

import { Route, Routes, useParams } from "react-router";
import "./App.css";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import WishlistPage from "./pages/WishlistPage";

function WishlistRoute() {
  const { slug = "" } = useParams();

  return <WishlistPage key={slug} />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/w/:slug" element={<WishlistRoute />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;

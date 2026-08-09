import "./App.css";

type Gift = {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string;
  reserved: boolean;
};

const gifts: Gift[] = [
  {
    id: 1,
    name: "Mechanical Keyboard",
    description:
      "A compact wireless keyboard with a comfortable layout for everyday work.",
    price: "Around €100",
    image: "⌨",
    reserved: false,
  },
  {
    id: 2,
    name: "Coffee Grinder",
    description:
      "A small manual grinder for making fresh coffee at home or while travelling.",
    price: "Around €45",
    image: "☕",
    reserved: true,
  },
  {
    id: 3,
    name: "LEGO Architecture Set",
    description:
      "A detailed building set for a quiet evening and a spot on the bookshelf.",
    price: "Around €60",
    image: "🏛",
    reserved: false,
  },
];

function GiftCard({ gift }: { gift: Gift }) {
  return (
    <article className="gift-window">
      <header className="window-title-bar">
        <span className="window-control" aria-hidden="true" />

        <div className="title-lines" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <h2>{gift.name}</h2>

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

      <div className="gift-content">
        <div className="gift-image" aria-hidden="true">
          {gift.image}
        </div>

        <div className="gift-details">
          <div className="gift-heading">
            <h3>{gift.name}</h3>

            <span
              className={`status-badge ${
                gift.reserved ? "status-badge--reserved" : ""
              }`}
            >
              {gift.reserved ? "Reserved" : "Available"}
            </span>
          </div>

          <p>{gift.description}</p>
          <p className="gift-price">{gift.price}</p>

          <button
            className="retro-button"
            type="button"
            disabled={gift.reserved}
          >
            {gift.reserved ? "Already chosen" : "Choose this gift"}
          </button>
        </div>
      </div>
    </article>
  );
}

function App() {
  const availableCount = gifts.filter((gift) => !gift.reserved).length;

  return (
    <main className="desktop">
      <section className="wishlist-window">
        <header className="window-title-bar window-title-bar--main">
          <span className="window-control" aria-hidden="true" />

          <div className="title-lines" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <h1>Birthday Wishlist</h1>

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

        <div className="wishlist-content">
          <section className="intro">
            <div className="intro-icon" aria-hidden="true">
              🎁
            </div>

            <div>
              <h2>Welcome to my wishlist!</h2>
              <p>
                Choose a gift you would like to give. Once selected, it will be
                marked as reserved for everyone else.
              </p>
            </div>
          </section>

          <div className="toolbar" aria-label="Wishlist summary">
            <span>
              {gifts.length} {gifts.length === 1 ? "gift" : "gifts"}
            </span>
            <span>
              {availableCount} {availableCount === 1 ? "is" : "are"} still
              available
            </span>
          </div>

          <section className="gift-grid" aria-label="Birthday gifts">
            {gifts.map((gift) => (
              <GiftCard key={gift.id} gift={gift} />
            ))}
          </section>

          <footer className="wishlist-footer">
            <span aria-hidden="true">♥</span>
            <p>Thank you for making my birthday special.</p>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default App;

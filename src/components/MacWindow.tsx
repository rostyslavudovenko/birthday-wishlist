import type { ReactNode } from "react";

type MacWindowProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

function MacWindow({ title, children, className = "" }: MacWindowProps) {
  const windowClassName = ["wishlist-window", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={windowClassName}>
      <header className="window-title-bar window-title-bar--main">
        <span className="window-control" aria-hidden="true" />

        <div className="title-lines" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <h1>{title}</h1>

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

      {children}
    </section>
  );
}

export default MacWindow;

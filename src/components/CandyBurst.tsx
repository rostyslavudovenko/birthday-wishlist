import type { CSSProperties } from "react";

const CANDY_EMOJI = ["🍭", "🍬", "🍩", "🍪", "🧁", "✨", "💖", "⭐", "🎀", "🍫", "🍒", "🌈"];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

type CandyBurstProps = {
  count?: number;
};

function CandyBurst({ count = 24 }: CandyBurstProps) {
  const particles = Array.from({ length: count }, (_, index) => {
    const drift = randomBetween(-140, 140);
    const delay = randomBetween(0, 0.25);
    const duration = randomBetween(1.4, 2.1);
    const rotation = randomBetween(-160, 160);
    const scale = randomBetween(0.7, 1.4);
    const size = randomBetween(16, 30);

    return {
      key: index,
      emoji: CANDY_EMOJI[index % CANDY_EMOJI.length],
      drift,
      delay,
      duration,
      rotation,
      scale,
      size,
    };
  });

  return (
    <div className="candy-burst" aria-hidden="true">
      {particles.map(
        ({
          key,
          emoji,
          drift,
          delay,
          duration,
          rotation,
          scale,
          size,
        }) => (
          <span
            key={key}
            style={
              {
                "--dx": `${drift}px`,
                "--delay": `${delay}s`,
                "--dur": `${duration}s`,
                "--rot": `${rotation}deg`,
                "--scale": scale,
                width: `${size}px`,
                height: `${size}px`,
                fontSize: `${size}px`,
              } as CSSProperties
            }
          >
            {emoji}
          </span>
        ),
      )}
    </div>
  );
}

export default CandyBurst;

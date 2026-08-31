import type { CSSProperties } from "react";

const CANDY_EMOJI = ["🍭", "🍬", "🍩", "🍪", "🧁", "✨", "💖", "⭐", "🎀", "🍫", "🍒", "🌈"];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

type CandyBurstProps = {
  count?: number;
};

function CandyBurst({ count = 30 }: CandyBurstProps) {
  const particles = Array.from({ length: count }, (_, index) => {
    const originX = randomBetween(4, 96);
    const originY = randomBetween(5, 92);
    const drift = randomBetween(-160, 160);
    const rise = randomBetween(16, 40);
    const fall = randomBetween(12, 34);
    const delay = randomBetween(0, 0.3);
    const duration = randomBetween(1.5, 2.3);
    const rotation = randomBetween(-200, 200);
    const scale = randomBetween(0.7, 1.4);
    const size = randomBetween(16, 32);

    return {
      key: index,
      emoji: CANDY_EMOJI[index % CANDY_EMOJI.length],
      originX,
      originY,
      drift,
      rise,
      fall,
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
          originX,
          originY,
          drift,
          rise,
          fall,
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
                "--ox": `${originX}vw`,
                "--oy": `${originY}vh`,
                "--dx": `${drift}px`,
                "--rise": `${rise}vh`,
                "--fall": `${fall}vh`,
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

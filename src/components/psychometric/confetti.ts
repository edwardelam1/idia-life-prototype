import confetti from "canvas-confetti";

// Teal + Orange brand palette
const TEAL = ["#14b8a6", "#0d9488", "#5eead4", "#2dd4bf"];
const ORANGE = ["#f97316", "#ea580c", "#fb923c", "#fdba74"];
const BRAND = [...TEAL, ...ORANGE];

export const fireWelcomeConfetti = () => {
  confetti({
    particleCount: 40,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.7 },
    colors: BRAND,
    scalar: 0.8,
  });
  confetti({
    particleCount: 40,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.7 },
    colors: BRAND,
    scalar: 0.8,
  });
};

export const fireCompletionConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 90,
    startVelocity: 45,
    origin: { x: 0.5, y: 0.6 },
    colors: BRAND,
  });
};

// Graffiti-style burst: scattered, random angles, multi-shape — fired on entering Social page
export const fireGraffitiConfetti = () => {
  const shoot = (originX: number) => {
    confetti({
      particleCount: 30,
      angle: 60 + Math.random() * 60,
      spread: 80,
      startVelocity: 35 + Math.random() * 20,
      origin: { x: originX, y: 0.9 },
      colors: BRAND,
      shapes: ["square", "circle"],
      scalar: 0.9 + Math.random() * 0.6,
      ticks: 200,
    });
  };
  shoot(0.1);
  shoot(0.5);
  shoot(0.9);
  setTimeout(() => {
    shoot(0.25);
    shoot(0.75);
  }, 200);
};

export const fireFinaleConfetti = () => {
  const duration = 2500;
  const end = Date.now() + duration;
  const interval = setInterval(() => {
    if (Date.now() > end) {
      clearInterval(interval);
      return;
    }
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.8 },
      colors: BRAND,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.8 },
      colors: BRAND,
    });
  }, 250);
};

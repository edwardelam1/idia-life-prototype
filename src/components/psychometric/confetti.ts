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

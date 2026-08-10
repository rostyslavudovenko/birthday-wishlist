import type { Gift } from "../types/gift";

export const initialGifts: Gift[] = [
  {
    id: 1,
    name: "Mechanical Keyboard",
    description:
      "A compact wireless keyboard with a comfortable layout for everyday work.",
    price: "Around €100",
    image: "⌨",
    reservedBy: null,
  },
  {
    id: 2,
    name: "Coffee Grinder",
    description:
      "A small manual grinder for making fresh coffee at home or while travelling.",
    price: "Around €45",
    image: "☕",
    reservedBy: "Reserved",
  },
  {
    id: 3,
    name: "LEGO Architecture Set",
    description:
      "A detailed building set for a quiet evening and a spot on the bookshelf.",
    price: "Around €60",
    image: "🏛",
    reservedBy: null,
  },
];

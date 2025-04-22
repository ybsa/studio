export type Color = "Red" | "Green" | "Blue" | "Yellow" | "Wild";
export type CardType = "Number" | "Skip" | "Reverse" | "DrawTwo" | "Wild" | "WildDrawFour";

export interface Card {
  color: Color;
  type: CardType;
  value?: number; // Only for Number cards
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
}

export type Action = "draw" | "play" | "chooseColor" | "gameOver"; // Added export here

export interface GameState {
  players: Player[];
  deck: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  direction: "clockwise" | "counter-clockwise";
  currentColor: Color; // The color that must be matched, changes with Wild cards
  actionRequired?: Action; // To handle specific states like needing to draw or choose a color
}

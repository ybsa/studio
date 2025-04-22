import { Card, Color, CardType } from './types';

const COLORS: Color[] = ["Red", "Green", "Blue", "Yellow"];
const SPECIAL_TYPES: CardType[] = ["Skip", "Reverse", "DrawTwo"];
const WILD_TYPES: CardType[] = ["Wild", "WildDrawFour"];

export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Add Number cards (0-9 for each color)
  COLORS.forEach(color => {
    // One 0 card
    deck.push({ color, type: "Number", value: 0 });
    // Two each of 1-9 cards
    for (let i = 1; i <= 9; i++) {
      deck.push({ color, type: "Number", value: i });
      deck.push({ color, type: "Number", value: i });
    }
  });

  // Add Special cards (Skip, Reverse, DrawTwo) - two for each color
  COLORS.forEach(color => {
    SPECIAL_TYPES.forEach(type => {
      deck.push({ color, type });
      deck.push({ color, type });
    });
  });

  // Add Wild cards (Wild, WildDrawFour) - four of each
  WILD_TYPES.forEach(type => {
    for (let i = 0; i < 4; i++) {
      deck.push({ color: "Wild", type });
    }
  });

  return deck;
}

// Fisher-Yates (aka Knuth) Shuffle algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  let currentIndex = deck.length;
  let temporaryValue: Card;
  let randomIndex: number;

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = deck[currentIndex];
    deck[currentIndex] = deck[randomIndex];
    deck[randomIndex] = temporaryValue;
  }

  return deck;
}

export function dealInitialHands(deck: Card[], numPlayers: number, cardsPerHand: number = 7): { hands: Card[][]; remainingDeck: Card[] } {
    const hands: Card[][] = Array(numPlayers).fill(0).map(() => []);
    const remainingDeck = [...deck]; // Create a copy to avoid modifying the original deck directly

    for (let i = 0; i < cardsPerHand; i++) {
        for (let j = 0; j < numPlayers; j++) {
            if (remainingDeck.length > 0) {
                hands[j].push(remainingDeck.pop()!);
            } else {
                console.error("Deck ran out of cards during initial deal!");
                // Handle insufficient cards scenario if necessary
                break;
            }
        }
         if (remainingDeck.length === 0 && i < cardsPerHand -1) break; // Exit outer loop if deck is empty
    }

    return { hands, remainingDeck };
}

export function drawCards(deck: Card[], discardPile: Card[], numCards: number): { drawnCards: Card[]; newDeck: Card[]; newDiscardPile: Card[] } {
    let currentDeck = [...deck];
    let currentDiscardPile = [...discardPile];
    const drawnCards: Card[] = [];

    for (let i = 0; i < numCards; i++) {
        if (currentDeck.length === 0) {
            // If the deck is empty, shuffle the discard pile (except the top card) to become the new deck
            if (currentDiscardPile.length <= 1) {
                console.error("Cannot draw card: Deck and discard pile are empty!");
                break; // No cards left to draw
            }
            const topDiscard = currentDiscardPile.pop()!; // Keep the top card
            currentDeck = shuffleDeck(currentDiscardPile);
            currentDiscardPile = [topDiscard]; // Reset discard pile with only the top card
            if(currentDeck.length === 0) {
                 console.error("Cannot draw card: Deck became empty after reshuffling discard pile!");
                 break; // Still no cards
            }
        }
        drawnCards.push(currentDeck.pop()!);
    }

    return { drawnCards, newDeck: currentDeck, newDiscardPile: currentDiscardPile };
}

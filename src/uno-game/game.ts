/ src/uno-game/game.ts
import { Card, Player, GameState, Color, CardType } from './types';
import { createDeck, shuffleDeck, dealInitialHands, drawCards } from './deck';

// ... (initializeGame, isCardPlayable, getValidMoves, getNextPlayerIndex, applyCardEffect, playCard functions remain the same) ...

export function initializeGame(playerNames: string[]): GameState {
    if (playerNames.length < 2) {
        throw new Error("Uno requires at least 2 players.");
    }

    let deck = createDeck();
    deck = shuffleDeck(deck);

    const { hands, remainingDeck } = dealInitialHands(deck, playerNames.length);

    const players: Player[] = playerNames.map((name, index) => ({
        id: `player-${index + 1}`,
        name: name,
        hand: hands[index],
    }));

    let discardPile: Card[] = [];
    let currentDeck = remainingDeck;
    let firstCard: Card | undefined;

    do {
        if (currentDeck.length === 0) {
             let shuffledDiscard;
             ({ newDeck: currentDeck, newDiscardPile: shuffledDiscard } = drawCards(currentDeck, discardPile, 0));
             discardPile = shuffledDiscard;
             if (currentDeck.length === 0) throw new Error("Could not start game: Deck immediately empty.");
        }
        firstCard = currentDeck.pop();
        if (firstCard) {
            discardPile.push(firstCard);
        } else {
             throw new Error("Could not draw initial discard card.");
        }
    } while (firstCard.type === "WildDrawFour");

    let currentPlayerIndex = 0;
    let direction: "clockwise" | "counter-clockwise" = "clockwise";
    let currentColor = firstCard.color !== "Wild" ? firstCard.color : "Red"; // Default chosen color for starting Wild
    let actionRequired: GameState['actionRequired'] = "play"; // Default action

     // Initial game state setup
     let initialGameState: GameState = {
        players,
        deck: currentDeck,
        discardPile,
        currentPlayerIndex,
        direction,
        currentColor,
        actionRequired: 'play', // Start with play action
    };


    // Apply the effect of the first card AFTER the basic state is set up
    if (firstCard.type === "Wild") {
         initialGameState.actionRequired = "chooseColor"; // First player must choose color
         // currentColor is already defaulted, player will update it
    } else {
        // For non-wild starting cards, apply effect immediately and move to next player if needed
        const tempState = applyCardEffect(firstCard, initialGameState, currentPlayerIndex); // Apply effect based on initial player
        initialGameState = {
             ...tempState,
             currentPlayerIndex: tempState.currentPlayerIndex,
             actionRequired: 'play'
        };
    }


    return initialGameState;
}


export function isCardPlayable(card: Card, topDiscardCard: Card, currentColor: Color): boolean {
    if (card.color === "Wild") {
        return true;
    }
    return card.color === currentColor ||
           (card.type !== 'Number' && card.type === topDiscardCard.type) ||
           (card.type === "Number" && topDiscardCard.type === "Number" && card.value === topDiscardCard.value);
}

export function getValidMoves(hand: Card[], topDiscardCard: Card, currentColor: Color): Card[] {
    return hand.filter(card => isCardPlayable(card, topDiscardCard, currentColor));
}

export function getNextPlayerIndex(currentIndex: number, numPlayers: number, direction: "clockwise" | "counter-clockwise"): number {
    const increment = direction === "clockwise" ? 1 : -1;
    return (currentIndex + increment + numPlayers) % numPlayers;
}


export function applyCardEffect(playedCard: Card, currentState: GameState, playerIndex: number): GameState {
    let { players, deck, discardPile, currentPlayerIndex, direction, currentColor } = { ...currentState };
    const numPlayers = players.length;
    let nextPlayerIndex = currentPlayerIndex;
    let actionRequired: GameState['actionRequired'] = 'play';

    const targetPlayerIndex = getNextPlayerIndex(playerIndex, numPlayers, direction);

    switch (playedCard.type) {
        case "Skip":
            nextPlayerIndex = getNextPlayerIndex(targetPlayerIndex, numPlayers, direction);
            console.log(`Player ${players[targetPlayerIndex].name} skipped!`);
            break;

        case "Reverse":
            direction = direction === "clockwise" ? "counter-clockwise" : "clockwise";
            if (numPlayers === 2) {
                nextPlayerIndex = getNextPlayerIndex(targetPlayerIndex, numPlayers, direction);
                 console.log(`Direction reversed! Player ${players[targetPlayerIndex].name} skipped (2 players)!`);
            } else {
                nextPlayerIndex = getNextPlayerIndex(playerIndex, numPlayers, direction);
                 console.log(`Direction reversed!`);
            }
            break;

        case "DrawTwo":
            {
                console.log(`Player ${players[targetPlayerIndex].name} draws 2 cards and is skipped!`);
                const { drawnCards, newDeck, newDiscardPile } = drawCards(deck, discardPile.slice(0, -1), 2);
                players[targetPlayerIndex].hand.push(...drawnCards);
                deck = newDeck;
                discardPile = [...newDiscardPile, playedCard];
                nextPlayerIndex = getNextPlayerIndex(targetPlayerIndex, numPlayers, direction);
            }
            break;

        case "Wild":
            console.log(`Player ${players[playerIndex].name} played Wild. They must choose a color.`);
            actionRequired = "chooseColor";
            nextPlayerIndex = playerIndex; // Current player needs to choose color
            break;

        case "WildDrawFour":
             {
                console.log(`Player ${players[targetPlayerIndex].name} draws 4 cards and is skipped! Player ${players[playerIndex].name} must choose a color.`);
                const { drawnCards, newDeck, newDiscardPile } = drawCards(deck, discardPile.slice(0, -1), 4);
                players[targetPlayerIndex].hand.push(...drawnCards);
                deck = newDeck;
                discardPile = [...newDiscardPile, playedCard];
                actionRequired = "chooseColor";
                nextPlayerIndex = playerIndex; // Current player needs to choose color
            }
            break;

        case "Number":
        default:
             nextPlayerIndex = getNextPlayerIndex(playerIndex, numPlayers, direction);
            break;
    }

    let newCurrentColor = currentColor;
    if (playedCard.color !== 'Wild') {
        newCurrentColor = playedCard.color;
    }


    return {
        ...currentState,
        players,
        deck,
        discardPile,
        currentPlayerIndex: nextPlayerIndex,
        direction,
        currentColor: newCurrentColor,
        actionRequired,
    };
}


export function playCard(currentState: GameState, playerIndex: number, cardIndexInHand: number): GameState {
    const { players, discardPile, currentPlayerIndex, currentColor, actionRequired } = currentState;

    if (playerIndex !== currentPlayerIndex) {
        throw new Error(`Not Player ${players[playerIndex].name}'s turn.`);
    }
    if (actionRequired !== 'play') {
         throw new Error(`Cannot play card now. Required action: ${actionRequired}`);
    }

    const player = players[playerIndex];
    if (cardIndexInHand < 0 || cardIndexInHand >= player.hand.length) {
        throw new Error(`Invalid card index: ${cardIndexInHand}`);
    }

    const cardToPlay = player.hand[cardIndexInHand];
    const topDiscard = discardPile[discardPile.length - 1];

    if (!isCardPlayable(cardToPlay, topDiscard, currentColor)) {
        throw new Error(`Card [${cardToPlay.color} ${cardToPlay.type} ${cardToPlay.value ?? ''}] cannot be played on [${topDiscard.color} ${topDiscard.type} ${topDiscard.value ?? ''}] with current color ${currentColor}.`);
    }


    const updatedHand = player.hand.filter((_, index) => index !== cardIndexInHand);
    const updatedPlayers = [...players];
    updatedPlayers[playerIndex] = { ...player, hand: updatedHand };
    const updatedDiscardPile = [...discardPile, cardToPlay];

     let intermediateState: GameState = {
         ...currentState,
         players: updatedPlayers,
         discardPile: updatedDiscardPile,
     };

    if (updatedHand.length === 0) {
        console.log(`Player ${player.name} wins!`);
        return {
            ...intermediateState,
             actionRequired: 'gameOver',
             currentPlayerIndex: playerIndex
         };
    }
     if (updatedHand.length === 1) {
         console.log(`Player ${player.name} says UNO!`);
     }

    const finalState = applyCardEffect(cardToPlay, intermediateState, playerIndex);

    return finalState;
}

/**
 * Handles the action where the current player chooses a color after playing a Wild card.
 *
 * @param currentState The current game state (expecting actionRequired === 'chooseColor').
 * @param playerIndex The index of the player choosing the color.
 * @param chosenColor The color chosen by the player.
 * @returns The updated GameState.
 * @throws Error if it's not the player's turn or if the action is not 'chooseColor'.
 */
export function chooseColor(currentState: GameState, playerIndex: number, chosenColor: Color): GameState {
    const { players, currentPlayerIndex, actionRequired, discardPile, direction, deck } = currentState;

    if (playerIndex !== currentPlayerIndex) {
        throw new Error(`Not Player ${players[playerIndex].name}'s turn to choose color.`);
    }
    if (actionRequired !== 'chooseColor') {
        throw new Error(`Cannot choose color now. Required action: ${actionRequired}`);
    }
    if (chosenColor === 'Wild') {
        throw new Error(`Cannot choose 'Wild' as the color.`);
    }

    const lastPlayedCard = discardPile[discardPile.length - 1];
    let nextPlayerIndex = currentPlayerIndex; // Will be updated based on card type

     // Determine who plays next *after* the color is chosen
     if (lastPlayedCard.type === "Wild") {
         // Regular wild, next player in sequence plays
         nextPlayerIndex = getNextPlayerIndex(playerIndex, players.length, direction);
     } else if (lastPlayedCard.type === "WildDrawFour") {
         // Wild Draw Four: the *target* player was already forced to draw and is skipped.
         // So, the player *after* the target plays next.
         const targetPlayerIndex = getNextPlayerIndex(playerIndex, players.length, direction);
         nextPlayerIndex = getNextPlayerIndex(targetPlayerIndex, players.length, direction);
     }


    console.log(`Player ${players[playerIndex].name} chose ${chosenColor}.`);

    return {
        ...currentState,
        currentColor: chosenColor,
        currentPlayerIndex: nextPlayerIndex, // Move to the actual next player
        actionRequired: 'play', // The next required action is for the new current player to play
    };
}

/**
 * Handles the action where the current player draws a card because they cannot play.
 *
 * @param currentState The current game state.
 * @param playerIndex The index of the player drawing the card.
 * @returns The updated GameState.
 * @throws Error if it's not the player's turn or if the action is not 'play'.
 */
export function handleDraw(currentState: GameState, playerIndex: number): GameState {
     let { players, deck, discardPile, currentPlayerIndex, actionRequired, currentColor, direction } = currentState;

     if (playerIndex !== currentPlayerIndex) {
        throw new Error(`Not Player ${players[playerIndex].name}'s turn to draw.`);
    }
     // Player should only draw if they are required to play but have no valid moves
     // Or, in some rule variations, they choose to draw even if they have moves.
     // For simplicity here, we assume they draw when 'play' is required.
    if (actionRequired !== 'play') {
         throw new Error(`Cannot draw now. Required action: ${actionRequired}`);
    }

     const player = players[playerIndex];
     const topDiscard = discardPile[discardPile.length - 1];
     const validMoves = getValidMoves(player.hand, topDiscard, currentColor);

     if (validMoves.length > 0) {
         // Optional: Throw error if player tries to draw when they have valid moves
         // console.warn(`Player ${player.name} drew a card but had playable cards.`);
         // OR strictly enforce:
         // throw new Error(`Player ${player.name} cannot draw, they have playable cards.`);
     }

     console.log(`Player ${player.name} is drawing a card.`);

     // Draw one card
     const { drawnCards, newDeck, newDiscardPile } = drawCards(deck, discardPile, 1);
     deck = newDeck;
     discardPile = newDiscardPile; // Update discard pile in case reshuffle happened

     if (drawnCards.length === 0) {
         console.error("Could not draw card: Deck and discard pile are empty!");
         // No card drawn, turn passes to next player without changing hand
          return {
             ...currentState,
             deck,
             discardPile,
             currentPlayerIndex: getNextPlayerIndex(playerIndex, players.length, direction),
             actionRequired: 'play',
         };
     }

     const drawnCard = drawnCards[0];
     console.log(`Player ${player.name} drew: [${drawnCard.color} ${drawnCard.type} ${drawnCard.value ?? ''}]`);

     // Add card to player's hand
     const updatedHand = [...player.hand, drawnCard];
     const updatedPlayers = [...players];
     updatedPlayers[playerIndex] = { ...player, hand: updatedHand };


     // Check if the *drawn* card is immediately playable
     if (isCardPlayable(drawnCard, topDiscard, currentColor)) {
         console.log(`Player ${player.name} can play the drawn card.`);
         // The player's turn continues, they now have the *option* to play the card they just drew.
         // The UI should reflect this: update the hand, and keep it the player's turn.
         // Action remains 'play'.
          return {
             ...currentState,
             players: updatedPlayers,
             deck,
             discardPile,
             // currentPlayerIndex remains the same
             actionRequired: 'play',
         };

     } else {
         console.log(`Player ${player.name} cannot play the drawn card. Turn passes.`);
         // Card is not playable, turn ends, move to the next player.
         return {
             ...currentState,
             players: updatedPlayers,
             deck,
             discardPile,
             currentPlayerIndex: getNextPlayerIndex(playerIndex, players.length, direction),
             actionRequired: 'play',
         };
     }
}


// --- Potentially Needed ---
// handleChallenge(...) - Optional WildDrawFour challenge rule

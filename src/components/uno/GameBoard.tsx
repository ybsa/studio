// src/components/uno/GameBoard.tsx
'use client'; // Required for useState, useEffect, etc.

import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Card, Color } from '@/uno-game/types';
import {
    initializeGame,
    playCard,
    handleDraw,
    chooseColor,
    isCardPlayable,
    getValidMoves,
} from '@/uno-game/game';
import { CardComponent } from './CardComponent';
import { PlayerHand } from './PlayerHand';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// --- Configuration ---
const PLAYER_NAMES = ["Player 1", "Player 2 (AI)"]; // Example player names
const HUMAN_PLAYER_ID = "player-1"; // Assuming Player 1 is the human user

// --- Component ---
const GameBoard: React.FC = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showColorChooser, setShowColorChooser] = useState<boolean>(false);

    // Initialize game on mount
    useEffect(() => {
        try {
            setError(null);
            const initialState = initializeGame(PLAYER_NAMES);
            setGameState(initialState);
            console.log("Game Initialized:", initialState);

            if (initialState.actionRequired === 'chooseColor' && initialState.players[initialState.currentPlayerIndex].id === HUMAN_PLAYER_ID) {
                 setShowColorChooser(true);
            }
            // If AI starts and needs to choose color, the AI useEffect will handle it.

        } catch (err: any) {
            console.error("Error initializing game:", err);
            setError(err.message || "Failed to initialize game.");
        }
    }, []);

    // --- Memoized Callbacks for Game Actions ---
    const canHumanPlay = useCallback(() => {
        if (!gameState) return false;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        return currentPlayer.id === HUMAN_PLAYER_ID && gameState.actionRequired === 'play';
    }, [gameState]);

     const canHumanChooseColor = useCallback(() => {
        if (!gameState) return false;
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        return currentPlayer.id === HUMAN_PLAYER_ID && gameState.actionRequired === 'chooseColor';
    }, [gameState]);

    const handlePlayCardCallback = useCallback((cardIndex: number) => {
        if (!gameState || !canHumanPlay()) return;
        const currentPlayerIndex = gameState.currentPlayerIndex;
        // Double check it's human turn before processing
        if (gameState.players[currentPlayerIndex].id !== HUMAN_PLAYER_ID) return;

        try {
            setError(null);
            const newState = playCard(gameState, currentPlayerIndex, cardIndex);
            setGameState(newState);
            if (newState.actionRequired === 'chooseColor' && newState.players[newState.currentPlayerIndex].id === HUMAN_PLAYER_ID) {
                setShowColorChooser(true);
            } else if (newState.actionRequired === 'gameOver') {
                 setError(`Game Over! ${newState.players[newState.currentPlayerIndex].name} wins!`);
             }
        } catch (err: any) {
            console.error("Error playing card:", err);
            setError(err.message || "Invalid move.");
        }
    }, [gameState, canHumanPlay]);

    const handleDrawCardCallback = useCallback(() => {
         if (!gameState || !canHumanPlay()) return;
         const currentPlayerIndex = gameState.currentPlayerIndex;
         if (gameState.players[currentPlayerIndex].id !== HUMAN_PLAYER_ID) return;

         const currentPlayer = gameState.players[currentPlayerIndex];
         const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
         const validMoves = getValidMoves(currentPlayer.hand, topDiscard, gameState.currentColor);
         if (validMoves.length > 0) {
              setError("You have playable cards, drawing is not necessary.");
              return;
         }

        try {
            setError(null);
            const newState = handleDraw(gameState, currentPlayerIndex);
            setGameState(newState);
        } catch (err: any) {
            console.error("Error drawing card:", err);
            setError(err.message || "Failed to draw card.");
        }
    }, [gameState, canHumanPlay]);

     const handleChooseColorCallback = useCallback((color: Color) => {
         if (!gameState || !canHumanChooseColor()) return;
         const currentPlayerIndex = gameState.currentPlayerIndex;
         if (gameState.players[currentPlayerIndex].id !== HUMAN_PLAYER_ID) return;

         try {
            setError(null);
             setShowColorChooser(false);
             const newState = chooseColor(gameState, currentPlayerIndex, color);
             setGameState(newState);
         } catch (err: any) {
             console.error("Error choosing color:", err);
             setError(err.message || "Failed to choose color.");
         }
     }, [gameState, canHumanChooseColor]);

     // --- Card Playability Check ---
     const getPlayableStatusForHuman = useCallback((card: Card): boolean => {
         if (!gameState || !canHumanPlay()) return false;
         const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];
         if (!topDiscard) return true;
         return isCardPlayable(card, topDiscard, gameState.currentColor);
     }, [gameState, canHumanPlay]);

    // --- AI Logic Helper ---
    const determineAIAction = (aiPlayer: Player, currentState: GameState): { action: 'play', cardIndex: number } | { action: 'draw' } | { action: 'chooseColor', color: Color } | null => {
        const topDiscard = currentState.discardPile[currentState.discardPile.length - 1];
        if (!topDiscard && currentState.actionRequired === 'play') {
             // This might happen if the discard pile was emptied and reshuffled, 
             // but the game logic should ideally handle starting the discard pile again.
             // If it's the AI's turn to play and there's somehow no discard card, it must draw.
             console.warn("AI turn to play, but discard pile is empty. Forcing draw.")
             return { action: 'draw'}; 
         }

        if (currentState.actionRequired === 'chooseColor') {
            // Simple strategy: Choose the color the AI has the most of (excluding Wilds)
            const colorCounts: Record<string, number> = { Red: 0, Green: 0, Blue: 0, Yellow: 0 }; // Use string index
            aiPlayer.hand.forEach(card => {
                if (card.color !== 'Wild') {
                    colorCounts[card.color]++;
                }
            });
            let bestColor: Color = 'Red'; // Default
            let maxCount = -1;
            // Ensure we only iterate over actual Color types, not 'Wild'
            (['Red', 'Green', 'Blue', 'Yellow'] as Color[]).forEach(color => {
                 // Check if colorCounts has the property before accessing
                 if (Object.prototype.hasOwnProperty.call(colorCounts, color) && colorCounts[color] > maxCount) {
                    maxCount = colorCounts[color];
                    bestColor = color;
                }
            });
             console.log(`AI choosing color: ${bestColor}`);
            return { action: 'chooseColor', color: bestColor };
        }

        if (currentState.actionRequired === 'play') {
            // Ensure topDiscard is not null before proceeding
            if (!topDiscard) {
                 console.error("AI cannot determine move: topDiscard is null during 'play' action.");
                 return { action: 'draw' }; // Or handle error state differently
            }
            const validMoves = getValidMoves(aiPlayer.hand, topDiscard, currentState.currentColor);

            if (validMoves.length > 0) {
                 // Simple strategy: Play the first valid card found
                 const cardToPlay = validMoves[0];
                 // Find index reliably, even if objects are different instances but logically equal
                 const cardIndex = aiPlayer.hand.findIndex(c => 
                     c.color === cardToPlay.color && 
                     c.type === cardToPlay.type && 
                     c.value === cardToPlay.value
                 ); 
                 if (cardIndex === -1) {
                     console.error("AI Error: Could not find chosen valid card in hand!");
                     // Fallback: draw if card index can't be found (shouldn't happen)
                     return { action: 'draw' }; 
                 }
                 console.log(`AI playing card index ${cardIndex}: ${cardToPlay.color} ${cardToPlay.type}`, cardToPlay.value ?? '');
                 return { action: 'play', cardIndex: cardIndex };
            } else {
                 // No valid moves, must draw
                 console.log("AI drawing card");
                 return { action: 'draw' };
            }
        }

        console.error(`AI cannot determine action for state: ${currentState.actionRequired}`);
        return null; // Fallback if actionRequired is unexpected
    };


    // --- Effect for AI Turn ---
    useEffect(() => {
        // Ensure gameState is loaded and game is not over
        if (!gameState || gameState.actionRequired !== 'play' && gameState.actionRequired !== 'chooseColor' && gameState.actionRequired !== 'draw') return;

        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const isAITurn = currentPlayer.id !== HUMAN_PLAYER_ID;

        // Trigger AI action if it's AI's turn and requires 'play' or 'chooseColor'
        if (isAITurn && (gameState.actionRequired === 'play' || gameState.actionRequired === 'chooseColor')) {
            console.log(`AI's turn (${currentPlayer.name}), action required: ${gameState.actionRequired}`);

            const thinkingTime = 1000 + Math.random() * 1000; // Simulate thinking (1-2 seconds)
            const timeoutId = setTimeout(() => {
                 // Re-check gameState *inside* timeout in case it changed rapidly
                 // Although React state updates should ideally handle this via re-triggering effect.
                 // This is more of a safeguard.
                 if (!gameState || gameState.players[gameState.currentPlayerIndex].id !== currentPlayer.id) {
                      console.log("AI turn skipped: Game state changed before AI could act.");
                      return;
                 }
                 
                 try {
                     setError(null); // Clear previous errors before AI acts
                     const actionChoice = determineAIAction(currentPlayer, gameState);

                     if (!actionChoice) {
                         console.error("AI failed to determine valid action.");
                         // Maybe force draw as a last resort?
                          setGameState(prevState => prevState ? handleDraw(prevState, gameState.currentPlayerIndex) : null);
                         return;
                     }

                     console.log("AI Action determined:", actionChoice);
                     let newState: GameState | null = null;
                     
                     // Create a temporary state reference for the action functions
                     const currentStateForAction = gameState; 

                     if (actionChoice.action === 'play') {
                         newState = playCard(currentStateForAction, gameState.currentPlayerIndex, actionChoice.cardIndex);
                     } else if (actionChoice.action === 'draw') {
                         newState = handleDraw(currentStateForAction, gameState.currentPlayerIndex);
                     } else if (actionChoice.action === 'chooseColor') {
                         newState = chooseColor(currentStateForAction, gameState.currentPlayerIndex, actionChoice.color);
                     }

                     if (newState) {
                        setGameState(newState);
                        console.log("New state after AI action:", newState);

                         if (newState.actionRequired === 'gameOver') {
                              setError(`Game Over! ${newState.players[newState.currentPlayerIndex].name} wins!`);
                         }
                         // No need to check for immediate next AI action here, the effect will re-trigger if necessary.
                     }

                 } catch (err: any) {
                     console.error("Error during AI turn execution:", err);
                     setError(`AI Error: ${err.message}`);
                     // Game might be stuck here. Consider adding recovery logic if needed.
                 }

             }, thinkingTime);

             // Cleanup timeout if effect re-runs before timeout completes
             return () => clearTimeout(timeoutId);
         }

    }, [gameState]); // Dependency: Re-run whenever gameState changes


    // --- Render Logic --- (Keep the existing render logic the same)
    if (!gameState) {
        return <div className="p-4 text-center">Loading Game...</div>;
    }

    const { players, deck, discardPile, currentPlayerIndex, direction, currentColor } = gameState;
    const humanPlayer = players.find(p => p.id === HUMAN_PLAYER_ID);
    const opponents = players.filter(p => p.id !== HUMAN_PLAYER_ID);
    const topDiscardCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
    const currentPlayer = players[currentPlayerIndex];

    return (
        <div className="flex flex-col items-center justify-between min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 text-white p-4 relative overflow-hidden">

            {/* Opponent Hands */}
             <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                {opponents.map(player => (
                     <div key={player.id} className="flex flex-col items-center mb-4">
                         <span className={cn("text-sm font-semibold mb-1", currentPlayer.id === player.id ? "text-yellow-400 animate-pulse" : "text-gray-400")}>
                            {player.name} {currentPlayer.id === player.id ? "(Thinking...)" : ""}
                         </span>
                        <PlayerHand
                            cards={player.hand}
                            playerId={player.id}
                            hideCards={true}
                            isCurrentPlayer={currentPlayer.id === player.id}
                        />
                     </div>
                ))}
            </div>

            {/* Game Area */}
            <div className="flex items-center justify-center gap-4 my-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                 {/* Deck */}
                <div className="flex flex-col items-center">
                     <CardComponent
                        card={null}
                        isHidden={true}
                        onClick={canHumanPlay() ? handleDrawCardCallback : undefined}
                        className={cn(
                             "cursor-pointer transition-transform hover:scale-105",
                            !canHumanPlay() ? "opacity-50 cursor-not-allowed" : ""
                         )}
                        title={canHumanPlay() ? "Draw a card" : "Cannot draw now"}
                    />
                     <span className="text-xs mt-1">Deck ({deck.length})</span>
                 </div>

                 {/* Discard Pile */}
                 <div className="flex flex-col items-center">
                    <CardComponent
                        card={topDiscardCard}
                        isPlayable={false}
                        className={topDiscardCard ? "" : "opacity-50"}
                    />
                     <span className="text-xs mt-1">Discard ({discardPile.length})</span>
                      <span className={cn("text-sm font-bold mt-1",
                         currentColor === 'Red' && 'text-red-500',
                         currentColor === 'Green' && 'text-green-500',
                         currentColor === 'Blue' && 'text-blue-500',
                         currentColor === 'Yellow' && 'text-yellow-400',
                         currentColor === 'Wild' && 'text-gray-300', // Indicate wild color needs choice?
                       )}>
                         Color: {currentColor}
                      </span>
                 </div>
            </div>

            {/* Human Player Hand */}
             <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-screen-lg px-4">
                 <div className="flex flex-col items-center">
                      <span className={cn("text-lg font-bold mb-2", currentPlayer.id === HUMAN_PLAYER_ID ? "text-yellow-400" : "text-gray-300")}>
                         {humanPlayer?.name} {currentPlayer.id === HUMAN_PLAYER_ID ? "(Your Turn)" : ""}
                     </span>
                    {humanPlayer && (
                        <PlayerHand
                            cards={humanPlayer.hand}
                            playerId={humanPlayer.id}
                            isCurrentPlayer={currentPlayer.id === HUMAN_PLAYER_ID}
                            onCardPlay={handlePlayCardCallback}
                            getPlayableStatus={getPlayableStatusForHuman}
                            hideCards={false}
                        />
                    )}
                 </div>
            </div>

             {/* Game Messages/Errors */}
             {error && (
                <div className="absolute bottom-24 left-4 bg-red-600/80 text-white p-3 rounded shadow-lg z-50 max-w-sm">
                     <div className="flex justify-between items-center">
                         <span>{error}</span>
                         <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-2 text-white hover:bg-red-700 p-1 h-auto">X</Button>
                     </div>
                 </div>
             )}

              {/* Color Chooser Modal */}
               {showColorChooser && canHumanChooseColor() && (
                 <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                     <div className="bg-gray-700 p-6 rounded-lg shadow-xl border border-gray-600">
                         <h3 className="text-xl font-semibold mb-4 text-center">Choose a Color</h3>
                         <div className="flex justify-center gap-4">
                             {( ["Red", "Green", "Blue", "Yellow"] as Color[] ).map(color => (
                                <Button
                                    key={color}
                                    onClick={() => handleChooseColorCallback(color)}
                                     className={cn("w-20 h-20 rounded-full text-white font-bold text-lg shadow-md transition-transform hover:scale-110 border-4",
                                         color === 'Red' && 'bg-red-600 hover:bg-red-700 border-red-800',
                                         color === 'Green' && 'bg-green-600 hover:bg-green-700 border-green-800',
                                         color === 'Blue' && 'bg-blue-600 hover:bg-blue-700 border-blue-800',
                                         color === 'Yellow' && 'bg-yellow-500 hover:bg-yellow-600 border-yellow-700 text-black',
                                     )}
                                >
                                     {color}
                                </Button>
                             ))}
                         </div>
                     </div>
                 </div>
             )}

              {/* Game Over Overlay */}
              {gameState.actionRequired === 'gameOver' && (
                  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                      <div className="bg-green-700 p-8 rounded-lg shadow-xl border border-green-500 text-center">
                          <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                          <p className="text-xl mb-6">{players[gameState.currentPlayerIndex].name} is the winner!</p>
                           <Button onClick={() => window.location.reload()} // Simple refresh to restart
                                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                                Play Again
                           </Button>
                      </div>
                  </div>
              )}

        </div>
    );
};

export default GameBoard;

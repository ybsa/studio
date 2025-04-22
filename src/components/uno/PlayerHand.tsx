/ src/components/uno/PlayerHand.tsx
import React from 'react';
import { Card } from '@/uno-game/types';
import { CardComponent } from './CardComponent';
import { cn } from '@/lib/utils';

interface PlayerHandProps extends React.HTMLAttributes<HTMLDivElement> {
  cards: Card[];
  playerId: string; // To identify the player
  isCurrentPlayer?: boolean; // To highlight the active player's hand
  onCardPlay?: (cardIndex: number) => void; // Callback when a card is clicked
  getPlayableStatus?: (card: Card) => boolean; // Function to determine if a card is playable
  hideCards?: boolean; // Render card backs instead of faces
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  playerId,
  isCurrentPlayer = false,
  onCardPlay,
  getPlayableStatus,
  hideCards = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
          "flex flex-wrap justify-center items-end gap-[-20px] p-4", // Overlapping cards slightly
          isCurrentPlayer && !hideCards ? "bg-blue-900/30 rounded-lg" : "", // Subtle background for current player's playable hand
          className
      )}
      {...props}
    >
      {cards.map((card, index) => (
        <CardComponent
          key={`${playerId}-card-${index}`} // Simple key, consider more robust keys if cards have unique IDs
          card={card}
          isHidden={hideCards}
          isPlayable={!hideCards && isCurrentPlayer && getPlayableStatus ? getPlayableStatus(card) : false}
          onClick={() => {
              // Only allow clicks on own, visible, playable cards
              if (!hideCards && isCurrentPlayer && onCardPlay && getPlayableStatus?.(card)) {
                  onCardPlay(index);
              }
          }}
          style={{
              // Add slight rotation/offset for a more "hand-held" look, especially for larger hands
              // transform: `rotate(${index * 1 - (cards.length * 0.5)}deg) translateY(${Math.abs(index - cards.length / 2) * 2}px)`,
              zIndex: index, // Ensure cards overlap correctly
          }}
          // Add transition for smoother hover effects if needed for playable cards
          className={cn(
              "transition-all duration-150 ease-in-out",
              !hideCards && isCurrentPlayer && getPlayableStatus?.(card) ? "hover:z-50 hover:-translate-y-4" : ""
           )}
        />
      ))}
       {cards.length === 0 && !hideCards && (
            <p className="text-gray-400 italic p-4">Empty hand!</p>
       )}
        {/* Show card count for hidden hands (opponents) */}
        {hideCards && cards.length > 0 && (
             <div className="flex items-center justify-center w-16 h-28 bg-gray-600 border-2 border-gray-800 rounded-md shadow-md text-white ml-2">
                 <span className="font-bold text-xl">{cards.length}</span>
            </div>
        )}
    </div>
  );
};

PlayerHand.displayName = "PlayerHand";

export { PlayerHand };


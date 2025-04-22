// src/components/uno/CardComponent.tsx

import React from 'react';
import { Card, Color, CardType } from '@/uno-game/types'; // Assuming types are in src/uno-game
import { cn } from "@/lib/utils"; // Using the shadcn/ui utility for class names
import { Ban, RefreshCw, ArrowRightLeft, Bot, Pickaxe } from 'lucide-react'; // Icons for special cards

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  card: Card | null; // Allow null for placeholder/back
  isPlayable?: boolean; // To add visual cues for playable cards
  isHidden?: boolean; // To render a card back
}

// Define color mappings for Tailwind CSS
const colorClasses: Record<Color, string> = {
  Red: "bg-red-500 border-red-700 text-white",
  Green: "bg-green-500 border-green-700 text-white",
  Blue: "bg-blue-500 border-blue-700 text-white",
  Yellow: "bg-yellow-400 border-yellow-600 text-black", // Yellow often looks better with black text
  Wild: "bg-black border-gray-500 text-white",
};

const CardComponent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ card, isPlayable, isHidden = false, className, ...props }, ref) => {
    const renderIcon = (type: CardType, size: number = 32) => {
      switch (type) {
        case "Skip": return <Ban size={size} />;
        case "Reverse": return <ArrowRightLeft size={size} />; // Using ArrowRightLeft for Reverse
        case "DrawTwo": return <div className="font-bold text-xl">+2</div>;
        case "Wild": return <Bot size={size} />; // Generic icon for Wild
        case "WildDrawFour": return <div className="font-bold text-xl">+4</div>;
        default: return null;
      }
    };

    const renderCardContent = () => {
      if (!card) return null; // Or render a placeholder

      const baseStyle = "relative flex flex-col items-center justify-center p-2 rounded-md shadow-md border-2 aspect-[2.5/3.5] w-20 h-28"; // Standard card size, added relative
      const colorStyle = colorClasses[card.color];

      const contentStyle = "text-center font-bold";
      const smallValueStyle = "absolute top-1 left-1 text-xs font-semibold";
      const smallValueBottomStyle = "absolute bottom-1 right-1 text-xs font-semibold transform rotate-180"; // Rotated for classic card look

      return (
        <div
          ref={ref}
          className={cn(
            baseStyle,
            colorStyle,
            isPlayable ? "ring-2 ring-offset-2 ring-white cursor-pointer hover:scale-105 transition-transform" : "cursor-default",
            className // Allow overriding/extending styles
          )}
          {...props}
        >
          {card.type === 'Number' ? (
            <>
              <span className={smallValueStyle}>{card.value}</span>
              <span className={cn(contentStyle, "text-4xl")}>{card.value}</span>
              <span className={smallValueBottomStyle}>{card.value}</span>
            </>
          ) : (
             <>
               <span className={cn(smallValueStyle, "text-lg")}>{renderIcon(card.type, 16)}</span>
               <span className={cn(contentStyle, "text-2xl")}>{renderIcon(card.type, 32)}</span>
               <span className={cn(smallValueBottomStyle, "text-lg")}>{renderIcon(card.type, 16)}</span>
             </>
          )}
           {/* Display chosen color for Wild cards if relevant (might be handled by parent) */}
           {card.color === 'Wild' && (
               <div className="absolute bottom-1 left-1 text-xs">(Choose)</div>
           )}
        </div>
      );
    };

     const renderCardBack = () => {
       return (
         <div
           ref={ref}
           className={cn(
             "flex items-center justify-center p-2 rounded-md shadow-md border-2 aspect-[2.5/3.5] w-20 h-28",
             "bg-gray-700 border-gray-900 text-white cursor-pointer hover:scale-105 transition-transform", // Style for the deck
             className
           )}
           {...props}
         >
           <span className="font-bold text-2xl italic select-none">UNO</span>
         </div>
       );
     };


    return isHidden ? renderCardBack() : renderCardContent();
  }
);

CardComponent.displayName = "CardComponent";

export { CardComponent };

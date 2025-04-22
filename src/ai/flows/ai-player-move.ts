'use server';

/**
 * @fileOverview An AI agent to suggest the best move for a player in an Uno game.
 *
 * - suggestAiPlayerMove - A function that suggests the best move for the AI player.
 * - SuggestAiPlayerMoveInput - The input type for the suggestAiPlayerMove function.
 * - SuggestAiPlayerMoveOutput - The return type for the suggestAiPlayerMove function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const CardSchema = z.object({
  color: z.enum(['red', 'yellow', 'blue', 'green', 'wild']),
  type: z.enum([
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'skip',
    'reverse',
    'drawTwo',
    'wild',
    'wildDrawFour',
  ]),
});

export type Card = z.infer<typeof CardSchema>;

const SuggestAiPlayerMoveInputSchema = z.object({
  hand: z.array(CardSchema).describe('The cards in the AI player\'s hand.'),
  topDiscardPileCard: CardSchema.describe('The top card on the discard pile.'),
  currentPlayerName: z.string().describe('The name of the current player.'),
  nextPlayerName: z.string().describe('The name of the next player.'),
});
export type SuggestAiPlayerMoveInput = z.infer<typeof SuggestAiPlayerMoveInputSchema>;

const SuggestAiPlayerMoveOutputSchema = z.object({
  cardToPlay: CardSchema.nullable().describe('The best card to play from the AI player\'s hand, or null if no card can be played.'),
  reason: z.string().describe('The AI\'s reasoning for choosing the card to play.'),
});
export type SuggestAiPlayerMoveOutput = z.infer<typeof SuggestAiPlayerMoveOutputSchema>;

export async function suggestAiPlayerMove(input: SuggestAiPlayerMoveInput): Promise<SuggestAiPlayerMoveOutput> {
  return suggestAiPlayerMoveFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAiPlayerMovePrompt',
  input: {
    schema: z.object({
      hand: z.array(CardSchema).describe('The cards in the AI player\'s hand.'),
      topDiscardPileCard: CardSchema.describe('The top card on the discard pile.'),
      currentPlayerName: z.string().describe('The name of the current player.'),
      nextPlayerName: z.string().describe('The name of the next player.'),
    }),
  },
  output: {
    schema: z.object({
      cardToPlay: CardSchema.nullable().describe('The best card to play from the AI player\'s hand, or null if no card can be played.'),
      reason: z.string().describe('The AI\'s reasoning for choosing the card to play.'),
    }),
  },
  prompt: `You are an expert Uno player. Given the current state of the game, you will determine the best card for the current player to play.

  The current player is: {{{currentPlayerName}}}
  The next player is: {{{nextPlayerName}}}

  The current player\'s hand is:
  {{#each hand}}
  - {{this.color}} {{this.type}}
  {{/each}}

  The top card on the discard pile is: {{topDiscardPileCard.color}} {{topDiscardPileCard.type}}

  Consider the game rules of Uno, and try to make a strategic move. Explain your reasoning.
  If there is no possible move, the cardToPlay should be null, and you should clearly explain why no move is possible.
  `,
});

const suggestAiPlayerMoveFlow = ai.defineFlow<
  typeof SuggestAiPlayerMoveInputSchema,
  typeof SuggestAiPlayerMoveOutputSchema
>(
  {
    name: 'suggestAiPlayerMoveFlow',
    inputSchema: SuggestAiPlayerMoveInputSchema,
    outputSchema: SuggestAiPlayerMoveOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

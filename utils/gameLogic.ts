import { CardData, Rank, Suit, PlayedCard } from '../types';

// Standard Truco Rank Order (Weakest to Strongest, ignoring Manilhas)
const BASE_ORDER = [
  Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
  Rank.QUEEN, Rank.JACK, Rank.KING, Rank.ACE,
  Rank.TWO, Rank.THREE
];

// Suit Order for Manilhas (Weakest to Strongest)
const SUIT_ORDER = [Suit.DIAMONDS, Suit.SPADES, Suit.HEARTS, Suit.CLUBS];

export const createDeck = (): CardData[] => {
  const deck: CardData[] = [];
  const suits = [Suit.DIAMONDS, Suit.SPADES, Suit.HEARTS, Suit.CLUBS];
  const ranks = Object.values(Rank);

  let idCounter = 0;
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `card-${idCounter++}`,
      });
    }
  }
  return shuffle(deck);
};

const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Calculates the "next" rank for Manilha determination
const getManilhaRank = (viraRank: Rank): Rank => {
  const index = BASE_ORDER.indexOf(viraRank);
  // If it's the last one (3), standard Truco usually loops to 4, 
  // but strictly speaking Truco Paulista maps 3 -> 4.
  const nextIndex = (index + 1) % BASE_ORDER.length;
  return BASE_ORDER[nextIndex];
};

// Assign power values to cards based on the Vira
export const calculatePower = (card: CardData, vira: CardData): number => {
  const manilhaRank = getManilhaRank(vira.rank);
  
  if (card.rank === manilhaRank) {
    // It's a Manilha. Base score 100 + Suit bonus
    const suitScore = SUIT_ORDER.indexOf(card.suit);
    return 100 + suitScore;
  }

  // Not a Manilha, standard rank score
  return BASE_ORDER.indexOf(card.rank);
};

export const determineWinner = (p1: PlayedCard | undefined, p2: PlayedCard | undefined, vira: CardData): 'player' | 'ai' | 'draw' => {
  // Safety guard against undefined cards (race conditions)
  if (!p1 || !p2) return 'draw';

  // Logic for Face Down cards
  if (p1.faceDown && p2.faceDown) return 'draw'; // Both hidden = draw (simplified rule)
  if (p1.faceDown) return p2.player; // Player 1 hid, Player 2 wins
  if (p2.faceDown) return p1.player; // Player 2 hid, Player 1 wins

  // Normal comparison
  const power1 = calculatePower(p1.card, vira);
  const power2 = calculatePower(p2.card, vira);

  if (power1 > power2) return p1.player;
  if (power2 > power1) return p2.player;
  return 'draw';
};

export const getAvailableTrucoAction = (current: number): number | null => {
  if (current === 1) return 3;
  if (current === 3) return 6;
  if (current === 6) return 9;
  if (current === 9) return 12;
  return null; // Cannot raise past 12
};
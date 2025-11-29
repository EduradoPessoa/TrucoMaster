export enum Suit {
  DIAMONDS = 'ouros',
  SPADES = 'espadas',
  HEARTS = 'copas',
  CLUBS = 'paus',
}

export enum Rank {
  FOUR = '4',
  FIVE = '5',
  SIX = '6',
  SEVEN = '7',
  QUEEN = 'Q',
  JACK = 'J',
  KING = 'K',
  ACE = 'A',
  TWO = '2',
  THREE = '3',
}

export interface CardData {
  suit: Suit;
  rank: Rank;
  id: string; // Unique ID for React keys
  power?: number; // Calculated power for the current round (considering manilha)
  isManilha?: boolean;
}

export enum AILevel {
  RESPONSIBLE = 'Responsável',
  NORMAL = 'Normal',
  CRAZY = 'Porra Louca',
}

export enum GamePhase {
  MENU = 'MENU',
  DEALING = 'DEALING',
  PLAYER_TURN = 'PLAYER_TURN',
  AI_THINKING = 'AI_THINKING',
  TRUCO_PROPOSAL_PLAYER = 'TRUCO_PROPOSAL_PLAYER', // Player proposed, AI deciding
  TRUCO_PROPOSAL_AI = 'TRUCO_PROPOSAL_AI', // AI proposed, Player deciding
  ROUND_RESULT = 'ROUND_RESULT',
  GAME_OVER = 'GAME_OVER',
}

export enum TrucoValue {
  NORMAL = 1,
  TRUCO = 3,
  SEIS = 6,
  NOVE = 9,
  DOZE = 12,
}

export interface PlayerState {
  hand: CardData[];
  roundsWon: number;
  name: string;
}

export interface PlayedCard {
  card: CardData;
  player: 'player' | 'ai';
  faceDown?: boolean;
}

export interface GameState {
  deck: CardData[];
  vira: CardData | null;
  player: PlayerState;
  ai: PlayerState;
  tableCards: PlayedCard[];
  trickHistory: PlayedCard[][]; // Stores played cards for completed rounds in the current hand
  currentRound: number; // 1, 2, or 3
  roundWinners: ('player' | 'ai' | 'draw' | null)[];
  scorePlayer: number;
  scoreAI: number;
  currentStakes: TrucoValue;
  turn: 'player' | 'ai';
  lastTrucoPlayer: 'player' | 'ai' | null; // Who raised last?
  phase: GamePhase;
  aiTaunt: string | null;
  difficulty: AILevel;
  isBettingLocked?: boolean;
}

export interface AIMoveResponse {
  action: 'PLAY' | 'TRUCO' | 'ACCEPT' | 'RUN' | 'RAISE' | 'FOLD';
  cardIndex?: number; // If action is PLAY
  taunt: string;
}
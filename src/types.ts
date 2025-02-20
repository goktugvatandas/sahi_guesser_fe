export interface User {
  id: string;
  username: string;
  avatar: string;
  score: number;
}

export interface Property {
  id: number;
  image: string;
  price: number;
  location: string;
  specs: string;
  category: "HOME" | "CAR";
}

export interface GameState {
  currentRound: number;
  score: number;
  totalRounds: number;
  gameOver: boolean;
  category: "HOME" | "CAR" | null;
  timeLeft: number;
  showResults: boolean;
  roundGuesses: RoundGuess[];
  lastGuess: number | null;
  hasCorrectGuess: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  mentions?: ChatMention[];
}

export interface GuessResult {
  userId: number;
  playerId: number;
  username: string;
  isCorrect: boolean;
}

export interface RoundGuess {
  userId: string;
  username: string;
  guess: number;
  accuracy: number;
  score: number;
}

export interface ChatMention {
  userId: string | number;
  username: string;
  indices: [number, number];
}

export interface OnlinePlayer {
  id: string | number;
  username: string;
  // ... other properties
}

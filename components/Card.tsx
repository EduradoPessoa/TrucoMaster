import React from 'react';
import { CardData, Suit } from '../types';

interface CardProps {
  card: CardData;
  hidden?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  isWinner?: boolean;
  isManilha?: boolean;
  small?: boolean;
}

const suitIcons: Record<Suit, string> = {
  [Suit.DIAMONDS]: '♦',
  [Suit.SPADES]: '♠',
  [Suit.HEARTS]: '♥',
  [Suit.CLUBS]: '♣',
};

const suitColors: Record<Suit, string> = {
  [Suit.DIAMONDS]: 'text-red-600',
  [Suit.SPADES]: 'text-gray-900',
  [Suit.HEARTS]: 'text-red-600',
  [Suit.CLUBS]: 'text-gray-900',
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  hidden = false, 
  onClick, 
  disabled = false, 
  className = '',
  isWinner = false,
  isManilha = false,
  small = false
}) => {
  if (hidden) {
    return (
      <div 
        className={`relative bg-blue-800 border-2 border-white rounded-lg card-shadow flex items-center justify-center
        ${small ? 'w-12 h-16' : 'w-24 h-36'} ${className}`}
      >
        <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
        <div className="absolute w-8 h-8 rounded-full bg-yellow-500 border-2 border-white"></div>
      </div>
    );
  }

  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative bg-white rounded-lg card-shadow flex flex-col justify-between p-2 select-none transition-transform
        ${small ? 'w-14 h-20 text-sm' : 'w-24 h-36 text-xl'}
        ${!disabled && onClick ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl' : ''}
        ${isWinner ? 'ring-4 ring-yellow-400' : ''}
        ${isManilha ? 'ring-2 ring-purple-500' : ''}
        ${className}
      `}
    >
      <div className={`font-bold font-display ${suitColors[card.suit]} flex items-center gap-0.5`}>
        <span>{card.rank}</span>
        <span className="text-[0.7em]">{suitIcons[card.suit]}</span>
      </div>
      
      <div className={`absolute inset-0 flex items-center justify-center text-4xl ${suitColors[card.suit]}`}>
         {suitIcons[card.suit]}
      </div>

      <div className={`font-bold font-display rotate-180 self-end ${suitColors[card.suit]} flex items-center gap-0.5`}>
        <span>{card.rank}</span>
        <span className="text-[0.7em]">{suitIcons[card.suit]}</span>
      </div>
    </div>
  );
};
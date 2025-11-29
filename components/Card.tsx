import React, { useState } from 'react';
import { CardData, Suit, Rank } from '../types';
import { calculatePower } from '../utils/gameLogic';

interface CardProps {
  card: CardData;
  hidden?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  isWinner?: boolean;
  isManilha?: boolean;
  small?: boolean;
  vira?: CardData | null; // Pass Vira to calculate tooltip context
  showHint?: boolean; // New prop for Beginner mode
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

const getCardDescription = (card: CardData, vira: CardData | null): { title: string; subtitle: string } => {
  if (!vira) return { title: `${card.rank} de ${card.suit}`, subtitle: '' };

  const power = calculatePower(card, vira);
  
  // Manilhas (Power >= 100)
  if (power >= 100) {
    if (card.suit === Suit.CLUBS) return { title: 'ZAP', subtitle: 'A mais forte!' };
    if (card.suit === Suit.HEARTS) return { title: 'COPAS', subtitle: '2ª mais forte' };
    if (card.suit === Suit.SPADES) return { title: 'ESPADILHA', subtitle: '3ª mais forte' };
    if (card.suit === Suit.DIAMONDS) return { title: 'PICA-FUMO', subtitle: '4ª mais forte' };
  }

  // Common Cards (Ranks)
  // Truco Rank: 3 > 2 > A > K > J > Q > 7 > 6 > 5 > 4
  switch (card.rank) {
    case Rank.THREE: return { title: '3', subtitle: 'Forte' };
    case Rank.TWO: return { title: '2', subtitle: 'Forte' };
    case Rank.ACE: return { title: 'Ás', subtitle: 'Média' };
    case Rank.KING: return { title: 'Rei', subtitle: 'Média' };
    case Rank.JACK: return { title: 'Valete', subtitle: 'Média/Fraca' };
    case Rank.QUEEN: return { title: 'Dama', subtitle: 'Fraca' };
    case Rank.SEVEN: return { title: '7', subtitle: 'Fraca' };
    case Rank.SIX: return { title: '6', subtitle: 'Fraca' };
    case Rank.FIVE: return { title: '5', subtitle: 'Muito Fraca' };
    case Rank.FOUR: return { title: '4', subtitle: 'Lixo' };
    default: return { title: `${card.rank}`, subtitle: '' };
  }
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  hidden = false, 
  onClick, 
  disabled = false, 
  className = '',
  isWinner = false,
  isManilha = false,
  small = false,
  vira = null,
  showHint = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

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

  const { title, subtitle } = getCardDescription(card, vira);

  return (
    <div className="relative group/card">
      <div 
        onClick={!disabled ? onClick : undefined}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          relative bg-white rounded-lg card-shadow flex flex-col justify-between p-2 select-none transition-transform overflow-hidden
          ${small ? 'w-14 h-20 text-sm' : 'w-24 h-36 text-xl'}
          ${!disabled && onClick ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl' : ''}
          ${isWinner ? 'ring-4 ring-yellow-400' : ''}
          ${isManilha ? 'ring-2 ring-purple-500' : ''}
          ${className}
        `}
      >
        {/* Top Corner */}
        <div className={`font-bold font-display ${suitColors[card.suit]} flex items-center gap-0.5`}>
          <span>{card.rank}</span>
          <span className="text-[0.7em]">{suitIcons[card.suit]}</span>
        </div>
        
        {/* Center Suit */}
        <div className={`absolute inset-0 flex items-center justify-center text-4xl ${suitColors[card.suit]}`}>
           {suitIcons[card.suit]}
        </div>

        {/* Bottom Corner */}
        <div className={`font-bold font-display rotate-180 self-end ${suitColors[card.suit]} flex items-center gap-0.5`}>
          <span>{card.rank}</span>
          <span className="text-[0.7em]">{suitIcons[card.suit]}</span>
        </div>

        {/* BEGINNER HINT BADGE - VISIBLE ON THE CARD FACE */}
        {showHint && isManilha && !small && (
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-purple-600/90 text-white text-[10px] font-bold px-1 py-0.5 rounded shadow-sm border border-white/30 z-20 whitespace-nowrap rotate-[-15deg] animate-pulse">
              {title}
           </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && !hidden && !small && !disabled && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 bg-black/90 text-white text-xs rounded-lg py-2 px-1 z-50 pointer-events-none flex flex-col items-center animate-fade-in-up shadow-xl border border-white/20">
          <span className="font-bold text-yellow-400 uppercase tracking-wide">{title}</span>
          {subtitle && <span className="text-gray-300 text-[10px]">{subtitle}</span>}
          {/* Arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 rotate-45 border-r border-b border-white/20"></div>
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { PlayedCard } from '../types';
import { Card } from './Card';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface HistoryLogProps {
  history: PlayedCard[][];
  currentRoundCards: PlayedCard[];
  roundWinners: ('player' | 'ai' | 'draw' | null)[];
  onClose: () => void;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ history, currentRoundCards, roundWinners, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity" onClick={onClose}>
      <div 
        className="w-80 h-full bg-gradient-to-b from-green-900 to-green-950 border-l border-white/20 shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
            <h2 className="text-white font-display text-xl tracking-wide flex items-center gap-2">
                📜 Histórico
            </h2>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
                <XMarkIcon className="w-6 h-6" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {history.map((trick, index) => {
                const winner = roundWinners[index];
                return (
                    <div key={index} className="bg-black/20 p-3 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${winner === 'player' ? 'bg-blue-500' : winner === 'ai' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        <div className="flex justify-between items-center mb-3 pl-2">
                            <h3 className="text-white/80 text-sm font-bold uppercase tracking-wider">Rodada {index + 1}</h3>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${winner === 'player' ? 'bg-blue-900 text-blue-200' : winner === 'ai' ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>
                                {winner === 'player' ? 'VITÓRIA' : winner === 'ai' ? 'DERROTA' : 'EMPATE'}
                            </span>
                        </div>
                        <div className="flex justify-center gap-4">
                            {trick.map((played, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <span className="text-[10px] uppercase text-white/40 mb-1 tracking-wider">{played.player === 'player' ? 'Você' : 'CPU'}</span>
                                    <div className="transform scale-75 origin-top">
                                        <Card card={played.card} hidden={played.faceDown} small />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
             
             {/* Current Round */}
             {currentRoundCards.length > 0 && (
                <div className="bg-white/5 p-3 rounded-xl border border-yellow-500/30 relative">
                     <div className="absolute top-0 right-0 p-1">
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                     </div>
                     <h3 className="text-yellow-200 text-sm font-bold mb-3 uppercase tracking-wider pl-1">Em Andamento</h3>
                     <div className="flex justify-center gap-4">
                        {currentRoundCards.map((played, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <span className="text-[10px] uppercase text-white/40 mb-1">{played.player === 'player' ? 'Você' : 'CPU'}</span>
                                <div className="transform scale-75 origin-top">
                                     <Card card={played.card} hidden={played.faceDown} small />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
             )}

             {history.length === 0 && currentRoundCards.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-40 text-white/30 space-y-2">
                     <span className="text-4xl">🎴</span>
                     <p className="text-sm italic">Nenhuma jogada nesta mão.</p>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

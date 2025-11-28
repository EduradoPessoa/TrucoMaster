import React, { useState } from 'react';
import { Game } from './components/Game';
import { AILevel } from './types';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AILevel>(AILevel.NORMAL);

  const startGame = () => {
    const levels = [AILevel.RESPONSIBLE, AILevel.NORMAL, AILevel.CRAZY];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    setSelectedDifficulty(randomLevel);
    setIsPlaying(true);
  };

  if (isPlaying) {
    return <Game difficulty={selectedDifficulty} onExit={() => setIsPlaying(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
           <h1 className="text-6xl font-display text-yellow-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform -rotate-2">
             TRUCO
           </h1>
           <p className="text-xl text-green-200 mt-2 font-light tracking-wide">MASTER AI</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Pronto para o desafio?</h2>
            <p className="text-gray-300 text-sm">
              O oponente será sorteado aleatoriamente entre três personalidades: <br/>
              <span className="text-blue-300 font-semibold">Responsável</span>, 
              <span className="text-green-300 font-semibold"> Normal</span> ou 
              <span className="text-red-300 font-semibold"> Porra Louca</span>.
            </p>
            <p className="text-yellow-200 text-xs italic mt-2">
              Você só descobrirá jogando...
            </p>
          </div>
          
          <button 
            onClick={startGame}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-xl font-bold font-display rounded-xl shadow-lg border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3"
          >
            <span>BARALHAR E JOGAR</span>
            <span className="text-2xl">🃏</span>
          </button>
        </div>

        <div className="text-xs text-white/40">
           Powered by Google Gemini 2.5 Flash
        </div>
      </div>
    </div>
  );
};

export default App;
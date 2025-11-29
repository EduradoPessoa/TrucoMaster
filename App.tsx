import React, { useState } from 'react';
import { Game } from './components/Game';
import { AILevel, UserExperience } from './types';
import { AcademicCapIcon, StarIcon, FireIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AILevel>(AILevel.NORMAL);
  const [userExperience, setUserExperience] = useState<UserExperience>(UserExperience.INTERMEDIATE);

  const startGame = () => {
    const levels = [AILevel.RESPONSIBLE, AILevel.NORMAL, AILevel.CRAZY];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    setSelectedDifficulty(randomLevel);
    setIsPlaying(true);
  };

  if (isPlaying) {
    return (
      <Game 
        difficulty={selectedDifficulty} 
        userExperience={userExperience}
        onExit={() => setIsPlaying(false)} 
      />
    );
  }

  const expLevels = [
    { 
      id: UserExperience.BEGINNER, 
      label: 'Iniciante', 
      icon: <AcademicCapIcon className="w-6 h-6"/>, 
      desc: 'Mostra dicas nas cartas Manilhas' 
    },
    { 
      id: UserExperience.INTERMEDIATE, 
      label: 'Pleno', 
      icon: <StarIcon className="w-6 h-6"/>, 
      desc: 'Jogo padrão sem ajudas visuais' 
    },
    { 
      id: UserExperience.MASTER, 
      label: 'Mestre', 
      icon: <FireIcon className="w-6 h-6"/>, 
      desc: 'Apenas para quem sabe o que faz' 
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
           <h1 className="text-6xl font-display text-yellow-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] transform -rotate-2">
             TRUCO
           </h1>
           <p className="text-xl text-green-200 mt-2 font-light tracking-wide">MASTER AI</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl space-y-6">
          
          {/* Experience Selector */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">Seu Nível de Experiência</h2>
            <div className="grid grid-cols-1 gap-2">
              {expLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setUserExperience(lvl.id)}
                  className={`flex items-center p-3 rounded-lg border transition-all duration-200 text-left relative overflow-hidden group
                    ${userExperience === lvl.id 
                      ? 'bg-green-600 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]' 
                      : 'bg-black/20 border-white/10 hover:bg-white/5'
                    }
                  `}
                >
                  <div className={`p-2 rounded-full mr-4 ${userExperience === lvl.id ? 'bg-white/20 text-white' : 'bg-black/30 text-gray-400'}`}>
                    {lvl.icon}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{lvl.label}</div>
                    <div className={`text-xs ${userExperience === lvl.id ? 'text-green-100' : 'text-gray-500 group-hover:text-gray-400'}`}>{lvl.desc}</div>
                  </div>
                  {userExperience === lvl.id && (
                     <div className="absolute right-4 text-green-200 animate-pulse">●</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-white/10 w-full my-4"></div>

          <div className="space-y-2">
            <p className="text-gray-300 text-sm">
              Você enfrentará um oponente de nível aleatório: <br/>
              <span className="text-blue-300 font-semibold">Responsável</span>, 
              <span className="text-green-300 font-semibold"> Normal</span> ou 
              <span className="text-red-300 font-semibold"> Porra Louca</span>.
            </p>
          </div>
          
          <button 
            onClick={startGame}
            className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black text-xl font-bold font-display rounded-xl shadow-lg border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-3 mt-4"
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
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  GameState, PlayerState, GamePhase, AILevel, TrucoValue, CardData, Suit, Rank, PlayedCard 
} from '../types';
import { createDeck, calculatePower, determineWinner, getAvailableTrucoAction } from '../utils/gameLogic';
import { getAIMove } from '../services/geminiService';
import { Card } from './Card';
import { HistoryLog } from './HistoryLog';
import { Confetti } from './Confetti';
import { PlayIcon, HandRaisedIcon, XCircleIcon, CheckCircleIcon, ArrowPathIcon, EyeSlashIcon, ClockIcon } from '@heroicons/react/24/solid';
import { playCardSound, playLoseSound, playTrucoSound, playWinSound } from '../utils/soundEffects';

const MAX_SCORE = 12;

interface GameProps {
  difficulty: AILevel;
  onExit: () => void;
}

const INITIAL_PLAYER_STATE = (name: string): PlayerState => ({
  hand: [],
  roundsWon: 0,
  name
});

interface TableCardProps {
  played: PlayedCard;
  index: number;
}

// Helper component for animating cards onto the table
const TableCard: React.FC<TableCardProps> = ({ played, index }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation next frame
    requestAnimationFrame(() => {
        setMounted(true);
    });
  }, []);

  const isAI = played.player === 'ai';
  
  // Final visual adjustments
  const finalClass = index === 0 
    ? '-translate-x-4 rotate-6' 
    : 'translate-x-4 -rotate-6';
  
  // Start from off-screen (relative to the container center anchor)
  const startTranslateY = isAI ? '-translate-y-48' : 'translate-y-48';

  return (
    <div 
        className={`absolute transition-all duration-300 ease-out 
        ${isAI ? '-top-4' : '-bottom-4'} 
        ${index === 0 ? 'z-0' : 'z-10'}
        ${mounted 
            ? `${finalClass} translate-y-0 opacity-100 scale-100` 
            : `${startTranslateY} translate-x-0 rotate-0 opacity-0 scale-50`
        }
        `}
    >
        <Card card={played.card} hidden={played.faceDown} />
    </div>
  );
};

export const Game: React.FC<GameProps> = ({ difficulty, onExit }) => {
  const [gameState, setGameState] = useState<GameState>({
    deck: [],
    vira: null,
    player: INITIAL_PLAYER_STATE('Você'),
    ai: INITIAL_PLAYER_STATE('Computador'),
    tableCards: [],
    trickHistory: [],
    currentRound: 1,
    roundWinners: [null, null, null],
    scorePlayer: 0,
    scoreAI: 0,
    currentStakes: TrucoValue.NORMAL,
    turn: 'player', 
    lastTrucoPlayer: null,
    phase: GamePhase.DEALING,
    aiTaunt: null,
    difficulty
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pointAnimation, setPointAnimation] = useState<{player: 'player'|'ai', points: number} | null>(null);

  // Ref to prevent double-execution of AI turns
  const isAIProcessing = useRef(false);

  // Sound effects
  const playSound = (type: 'card' | 'win' | 'lose' | 'truco') => {
    if (type === 'card') playCardSound();
    if (type === 'win') playWinSound();
    if (type === 'lose') playLoseSound();
    if (type === 'truco') playTrucoSound();
  };

  // --- Helpers ---

  const showNotification = (msg: string, duration = 1500) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), duration);
  };

  const startNewHand = useCallback(() => {
    const deck = createDeck();
    const pHand = [deck.pop()!, deck.pop()!, deck.pop()!];
    const aiHand = [deck.pop()!, deck.pop()!, deck.pop()!];
    const vira = deck.pop()!;

    // Sort hand for player convenience
    pHand.sort((a, b) => calculatePower(a, vira) - calculatePower(b, vira));

    setGameState(prev => ({
      ...prev,
      deck,
      vira,
      player: { ...prev.player, hand: pHand, roundsWon: 0 },
      ai: { ...prev.ai, hand: aiHand, roundsWon: 0 },
      tableCards: [],
      trickHistory: [],
      currentRound: 1,
      roundWinners: [null, null, null],
      currentStakes: TrucoValue.NORMAL,
      lastTrucoPlayer: null,
      phase: GamePhase.PLAYER_TURN, 
      turn: (prev.scorePlayer + prev.scoreAI) % 2 === 0 ? 'player' : 'ai',
      aiTaunt: null
    }));
    
    // Reset AI processing lock
    isAIProcessing.current = false;
  }, []);

  // --- Effects ---

  // Initial Deal
  useEffect(() => {
    if (gameState.phase === GamePhase.DEALING) {
      setTimeout(startNewHand, 500);
    }
  }, [gameState.phase, startNewHand]);

  // AI Turn Handler
  useEffect(() => {
    const runAITurn = async () => {
      // Safety Checks:
      // 1. Must be AI turn
      // 2. Must be in PLAYER_TURN phase (standard gameplay)
      // 3. Must NOT be already processing a move (Race condition fix)
      // 4. Must NOT have 2 cards on table already (Round ended)
      if (
        gameState.turn !== 'ai' || 
        gameState.phase !== GamePhase.PLAYER_TURN || 
        isAIProcessing.current ||
        gameState.tableCards.length >= 2
      ) {
        return;
      }

      // Lock AI execution
      isAIProcessing.current = true;

      try {
        setGameState(prev => ({ ...prev, phase: GamePhase.AI_THINKING }));
        
        // Faster thinking: 300ms to 800ms
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));

        const move = await getAIMove(gameState);
        
        if (move.taunt) {
          setGameState(prev => ({ ...prev, aiTaunt: move.taunt }));
          // Clear taunt faster (3s)
          setTimeout(() => setGameState(prev => ({...prev, aiTaunt: null})), 3000);
        }

        if (move.action === 'PLAY') {
           handleAIPlayCard(move.cardIndex || 0);
        } else if (move.action === 'TRUCO' || move.action === 'RAISE') {
           handleAIProposeTruco();
        } else if (move.action === 'FOLD') {
           // AI Surrenders hand
           resolveHand('player');
        }
      } catch (e) {
        console.error("AI Turn Error", e);
      } finally {
        // Unlock happens after state updates in the handlers, but as a fallback:
        // Note: The handlers (handleAIPlayCard) set state which triggers re-render.
        // If turn changes to 'player', this effect won't run again, so 'true' is fine.
        // If we set false here immediately, and state update is slow, it might double fire.
        // We will release the lock only if something failed or turn didn't change (rare).
        if (gameState.turn === 'ai') {
           isAIProcessing.current = false;
        }
      }
    };
    
    runAITurn();
    
  }, [gameState.turn, gameState.phase, gameState.player.hand.length, gameState.tableCards.length]); 

  // Resolving Round (End of a trick)
  useEffect(() => {
    if (gameState.tableCards.length === 2 && gameState.phase === GamePhase.PLAYER_TURN) {
      resolveTrick();
    }
  }, [gameState.tableCards]);

  // --- Logic Handlers ---

  const handleAIPlayCard = (index: number) => {
    setGameState(prev => {
      // Double check inside state update to be sure
      if (prev.tableCards.length >= 2) return prev;

      const card = prev.ai.hand[index];
      // Fallback if index invalid
      if (!card) {
          const fallbackCard = prev.ai.hand[0];
          const fallbackHand = prev.ai.hand.slice(1);
           return {
            ...prev,
            ai: { ...prev.ai, hand: fallbackHand },
            tableCards: [...prev.tableCards, { card: fallbackCard, player: 'ai' }],
            turn: 'player', 
            phase: GamePhase.PLAYER_TURN 
          };
      }

      const newHand = prev.ai.hand.filter((_, i) => i !== index);
      return {
        ...prev,
        ai: { ...prev.ai, hand: newHand },
        tableCards: [...prev.tableCards, { card, player: 'ai' }],
        turn: 'player', 
        phase: GamePhase.PLAYER_TURN 
      };
    });
    
    isAIProcessing.current = false; // Release lock
    playSound('card');
  };

  const handlePlayerPlayCard = (index: number, faceDown: boolean = false) => {
    if (gameState.turn !== 'player' || gameState.phase !== GamePhase.PLAYER_TURN) return;

    setGameState(prev => {
      const card = prev.player.hand[index];
      const newHand = prev.player.hand.filter((_, i) => i !== index);
      return {
        ...prev,
        player: { ...prev.player, hand: newHand },
        tableCards: [...prev.tableCards, { card, player: 'player', faceDown }],
        turn: 'ai'
      };
    });
    playSound('card');
  };

  const resolveTrick = async () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.ROUND_RESULT }));
    
    // Faster resolution (700ms)
    await new Promise(r => setTimeout(r, 700));

    setGameState(prev => {
      const pPlayed = prev.tableCards.find(c => c.player === 'player')!;
      const aiPlayed = prev.tableCards.find(c => c.player === 'ai')!;
      
      const roundWinner = determineWinner(pPlayed, aiPlayed, prev.vira!);

      const newRoundWinners = [...prev.roundWinners];
      newRoundWinners[prev.currentRound - 1] = roundWinner;
      
      let nextTurn = roundWinner === 'draw' ? prev.roundWinners[0] || 'player' : roundWinner; 
      if (roundWinner === 'draw') {
         nextTurn = prev.tableCards[0].player; 
      }

      // Store current cards in history before clearing
      const currentTrickCards = [...prev.tableCards];

      return {
        ...prev,
        roundWinners: newRoundWinners,
        trickHistory: [...prev.trickHistory, currentTrickCards],
        currentRound: prev.currentRound + 1,
        tableCards: [],
        turn: nextTurn as 'player' | 'ai',
        phase: GamePhase.PLAYER_TURN
      };
    });
    
    // Ensure lock is released for next round actions
    isAIProcessing.current = false;
    
    checkHandWinner();
  };

  const checkHandWinner = () => {
    setGameState(prev => {
      const wins = prev.roundWinners.filter(w => w !== null);
      if (wins.length === 0) return prev; 

      let winner: 'player' | 'ai' | null = null;
      
      const pWins = wins.filter(w => w === 'player').length;
      const aiWins = wins.filter(w => w === 'ai').length;
      const draws = wins.filter(w => w === 'draw').length;

      if (pWins === 2) winner = 'player';
      else if (aiWins === 2) winner = 'ai';
      
      else if (draws > 0) {
        if (prev.roundWinners[0] === 'draw') {
           if (prev.roundWinners[1] !== null && prev.roundWinners[1] !== 'draw') winner = prev.roundWinners[1] as 'player' | 'ai';
           else if (prev.roundWinners[2] !== null) winner = prev.roundWinners[2] as 'player' | 'ai' || prev.roundWinners[1] as 'player'|'ai'; 
        } else {
           if (prev.roundWinners[1] === 'draw') winner = prev.roundWinners[0] as 'player'|'ai';
           else if (prev.roundWinners[2] === 'draw') winner = prev.roundWinners[0] as 'player'|'ai'; 
        }
      } else if (prev.currentRound > 3) {
         if (pWins > aiWins) winner = 'player';
         else winner = 'ai';
      }

      if (winner) {
         setTimeout(() => resolveHand(winner!), 100);
         return prev;
      }

      return prev;
    });
  };

  const resolveHand = (winner: 'player' | 'ai') => {
    // Play win/lose sound
    playSound(winner === 'player' ? 'win' : 'lose');

    // Trigger celebratory confetti if player wins
    if (winner === 'player') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4000);
    }

    setGameState(prev => {
      const points = prev.currentStakes;
      const newScoreP = winner === 'player' ? prev.scorePlayer + points : prev.scorePlayer;
      const newScoreAI = winner === 'ai' ? prev.scoreAI + points : prev.scoreAI;
      
      // Trigger animation
      setPointAnimation({ player: winner, points });
      setTimeout(() => setPointAnimation(null), 1500);

      showNotification(`${winner === 'player' ? 'Você' : 'Computador'} venceu a mão!`, 2000);

      if (newScoreP >= MAX_SCORE || newScoreAI >= MAX_SCORE) {
         return {
             ...prev,
             scorePlayer: newScoreP,
             scoreAI: newScoreAI,
             phase: GamePhase.GAME_OVER
         }
      }

      return {
        ...prev,
        scorePlayer: newScoreP,
        scoreAI: newScoreAI,
        phase: GamePhase.DEALING
      };
    });
  };

  // --- Truco Interactions ---

  const handlePlayerTruco = () => {
    if (gameState.phase !== GamePhase.PLAYER_TURN || gameState.turn !== 'player') return;
    if (gameState.lastTrucoPlayer === 'player') {
       showNotification("Você não pode aumentar sua própria aposta!");
       return;
    }
    const nextVal = getAvailableTrucoAction(gameState.currentStakes);
    if (!nextVal) return;

    playSound('truco');

    setGameState(prev => ({
      ...prev,
      phase: GamePhase.TRUCO_PROPOSAL_PLAYER
    }));

    handleAIResponseToTruco(nextVal);
  };

  const handleAIResponseToTruco = async (value: number) => {
    if (isAIProcessing.current) return;
    isAIProcessing.current = true;

    setGameState(prev => ({ ...prev, aiTaunt: "Humm... deixe me pensar..." }));
    
    // Faster Truco response time
    await new Promise(r => setTimeout(r, 1000));

    const move = await getAIMove({ ...gameState, currentStakes: value }); 
    
    let action = move.action;
    if (action === 'PLAY') action = Math.random() > 0.5 ? 'ACCEPT' : 'RUN';

    setGameState(prev => ({ ...prev, aiTaunt: move.taunt }));

    if (action === 'ACCEPT') {
        setGameState(prev => ({
            ...prev,
            currentStakes: value as TrucoValue,
            lastTrucoPlayer: 'player',
            phase: GamePhase.PLAYER_TURN 
        }));
        showNotification("Computador aceitou!", 1000);
    } else if (action === 'RUN') {
        resolveHand('player');
        showNotification("Computador correu!", 1000);
    } else if (action === 'RAISE' || action === 'TRUCO') { 
        playSound('truco');
        const nextNextVal = getAvailableTrucoAction(value);
        if (nextNextVal) {
             setGameState(prev => ({
                ...prev,
                currentStakes: value as TrucoValue, 
                phase: GamePhase.TRUCO_PROPOSAL_AI,
                lastTrucoPlayer: 'ai' 
             }));
             showNotification(`Computador pediu ${nextNextVal === 6 ? 'MEIO PAU (6)' : nextNextVal}! Aceita?`);
        } else {
            setGameState(prev => ({
                ...prev,
                currentStakes: value as TrucoValue,
                lastTrucoPlayer: 'player',
                phase: GamePhase.PLAYER_TURN
            }));
        }
    }
    isAIProcessing.current = false;
  };

  const handleAIProposeTruco = () => {
      const nextVal = getAvailableTrucoAction(gameState.currentStakes);
      if(!nextVal) {
          isAIProcessing.current = false;
          return; 
      }

      playSound('truco');

      setGameState(prev => ({
          ...prev,
          phase: GamePhase.TRUCO_PROPOSAL_AI,
          turn: 'player' 
      }));
      
      isAIProcessing.current = false;
  };

  const playerRespondToTruco = (response: 'ACCEPT' | 'RUN' | 'RAISE') => {
      const pendingValue = getAvailableTrucoAction(gameState.currentStakes) || 3;

      if (response === 'ACCEPT') {
          setGameState(prev => ({
              ...prev,
              currentStakes: pendingValue as TrucoValue,
              lastTrucoPlayer: 'ai',
              phase: GamePhase.PLAYER_TURN,
              turn: 'ai' 
          }));
      } else if (response === 'RUN') {
          resolveHand('ai');
      } else if (response === 'RAISE') {
           playSound('truco');
           const nextNextVal = getAvailableTrucoAction(pendingValue);
           if (!nextNextVal) return;
           
           setGameState(prev => ({
               ...prev,
               currentStakes: pendingValue as TrucoValue, 
               phase: GamePhase.TRUCO_PROPOSAL_PLAYER
           }));
           handleAIResponseToTruco(nextNextVal);
      }
  };


  // --- Render Helpers ---

  if (gameState.phase === GamePhase.GAME_OVER) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black/80 z-50 absolute inset-0 text-white">
            <h1 className="text-6xl font-display mb-8 text-yellow-400">
                {gameState.scorePlayer >= MAX_SCORE ? "VITÓRIA!" : "DERROTA..."}
            </h1>
            <p className="text-2xl mb-8">
                {gameState.scorePlayer >= MAX_SCORE ? "Você humilhou o computador." : "Mais sorte na próxima."}
            </p>
            <button 
                onClick={onExit}
                className="px-8 py-4 bg-green-600 rounded-full text-xl font-bold hover:bg-green-500 transition shadow-lg"
            >
                Voltar ao Menu
            </button>
        </div>
    )
  }

  const isPlayerTurn = gameState.turn === 'player' && gameState.phase === GamePhase.PLAYER_TURN;
  const isTrucoResponse = gameState.phase === GamePhase.TRUCO_PROPOSAL_AI;

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden">
      
      {/* Confetti Animation */}
      {showConfetti && <Confetti />}

      {/* History Log Overlay */}
      {showHistory && (
          <HistoryLog 
            history={gameState.trickHistory} 
            currentRoundCards={gameState.tableCards} 
            roundWinners={gameState.roundWinners}
            onClose={() => setShowHistory(false)} 
          />
      )}

      {/* Top Bar: Score & Opponent */}
      <div className="flex justify-between items-center p-4 bg-black/30 backdrop-blur-sm relative z-40">
        <div className="flex flex-col items-start relative">
           <span className="text-xs uppercase tracking-widest text-gray-300">Computador</span>
           <div className="flex gap-1 mt-1">
             {[...Array(gameState.scoreAI)].map((_, i) => (
               <div key={i} className="w-2 h-6 bg-red-500 rounded-sm shadow-sm" />
             ))}
             <span className="ml-2 text-xl font-bold">{gameState.scoreAI}</span>
           </div>
           {/* AI Score Animation */}
           {pointAnimation?.player === 'ai' && (
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-red-400 font-display font-bold text-3xl animate-float-up z-50 pointer-events-none drop-shadow-md">
                +{pointAnimation.points}
              </span>
           )}
        </div>
        
        <div className="flex flex-col items-center">
             <span className="text-yellow-400 font-display text-2xl drop-shadow-md">
                 {gameState.currentStakes} PONTOS
             </span>
             <div className="flex text-xs gap-2 mt-1">
                {gameState.roundWinners.map((w, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full border border-white 
                        ${w === 'player' ? 'bg-blue-500' : w === 'ai' ? 'bg-red-500' : w === 'draw' ? 'bg-yellow-500' : 'bg-transparent'}
                    `}></div>
                ))}
             </div>
        </div>

        <div className="flex gap-4 items-center">
            {/* History Toggle Button */}
            <button 
                onClick={() => setShowHistory(true)} 
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
                title="Ver Histórico"
            >
                <ClockIcon className="w-6 h-6 text-white" />
            </button>

            <div className="flex flex-col items-end relative">
                <span className="text-xs uppercase tracking-widest text-gray-300">Você</span>
                <div className="flex gap-1 mt-1">
                    {[...Array(gameState.scorePlayer)].map((_, i) => (
                    <div key={i} className="w-2 h-6 bg-blue-500 rounded-sm shadow-sm" />
                    ))}
                    <span className="ml-2 text-xl font-bold">{gameState.scorePlayer}</span>
                </div>
                 {/* Player Score Animation */}
                {pointAnimation?.player === 'player' && (
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-blue-400 font-display font-bold text-3xl animate-float-up z-50 pointer-events-none drop-shadow-md">
                        +{pointAnimation.points}
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Opponent Area */}
      <div className="flex-1 flex justify-center items-start pt-4 relative">
         <div className="flex gap-2">
            {gameState.ai.hand.map((card) => (
                <Card key={card.id} card={card} hidden small />
            ))}
         </div>
         {gameState.aiTaunt && (
             <div className="absolute top-20 right-10 bg-white text-black p-4 rounded-2xl rounded-tl-none shadow-2xl max-w-[220px] animate-bounce z-20 border-2 border-black transform rotate-2">
                 <p className="text-sm font-bold font-display leading-tight italic">"{gameState.aiTaunt}"</p>
                 {/* Bubble Tail */}
                 <div className="absolute -top-3 -left-[2px] w-4 h-4 bg-white border-l-2 border-t-2 border-black transform -rotate-45"></div>
             </div>
         )}
      </div>

      {/* Game Table Area */}
      <div className="flex-1 flex flex-col justify-center items-center relative my-4">
          
          {/* Vira Card */}
          <div className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 flex flex-col items-center z-0">
              <span className="text-[10px] md:text-xs font-bold mb-1 opacity-70 text-yellow-200 tracking-wider">VIRA</span>
              {gameState.vira && (
                  <div key={gameState.vira.id} className="animate-pop-in">
                    <Card 
                        card={gameState.vira} 
                        small 
                        className="opacity-100 ring-2 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.4)]" 
                    />
                  </div>
              )}
          </div>

          {/* Played Cards */}
          <div className="w-64 h-48 border-4 border-white/10 rounded-3xl flex items-center justify-center relative bg-green-800/20 backdrop-blur-sm shadow-inner z-10">
             {gameState.tableCards.map((played, idx) => (
                 <TableCard key={played.card.id} played={played} index={idx} />
             ))}
             {gameState.tableCards.length === 0 && (
                 <div className="text-white/10 font-display text-4xl select-none">TRUCO</div>
             )}
          </div>
      </div>

      {/* Player Area */}
      <div className="flex-1 flex flex-col justify-end pb-8 relative">
          
          {/* Controls */}
          {isTrucoResponse ? (
             <div className="absolute top-0 left-0 right-0 flex justify-center gap-4 z-30">
                 <button onClick={() => playerRespondToTruco('ACCEPT')} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                     <CheckCircleIcon className="w-5 h-5"/> Aceitar
                 </button>
                 <button onClick={() => playerRespondToTruco('RUN')} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                     <XCircleIcon className="w-5 h-5"/> Correr
                 </button>
                 <button onClick={() => playerRespondToTruco('RAISE')} className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                     <ArrowPathIcon className="w-5 h-5"/> Aumentar
                 </button>
             </div>
          ) : (
            <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
                 {isPlayerTurn && gameState.lastTrucoPlayer !== 'player' && gameState.currentStakes < 12 && (
                    <button 
                        onClick={handlePlayerTruco}
                        className="pointer-events-auto bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-2 rounded-full font-display font-bold shadow-xl border-b-4 border-yellow-700 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2 animate-pulse"
                    >
                        <HandRaisedIcon className="w-6 h-6" /> 
                        {gameState.currentStakes === 1 ? 'TRUCO!' : gameState.currentStakes === 3 ? 'SEIS!' : gameState.currentStakes === 6 ? 'NOVE!' : 'DOZE!'}
                    </button>
                 )}
            </div>
          )}

          {/* Hand */}
          <div className="flex justify-center items-end gap-[-20px] h-40">
              {gameState.player.hand.map((card, idx) => (
                  <div key={card.id} className={`relative group transition-transform hover:-translate-y-4 ${isPlayerTurn ? 'cursor-pointer' : 'opacity-80'}`} style={{ transform: `rotate(${(idx - 1) * 5}deg) translateY(${Math.abs(idx-1)*5}px)` }}>
                      <Card 
                        card={card} 
                        onClick={() => handlePlayerPlayCard(idx, false)}
                        disabled={!isPlayerTurn}
                        isManilha={gameState.vira ? calculatePower(card, gameState.vira) >= 100 : false}
                      />
                      {/* Play Face Down Button - Only available round 2+ and player turn */}
                      {isPlayerTurn && gameState.currentRound >= 2 && (
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePlayerPlayCard(idx, true);
                            }}
                            className="absolute -top-3 -right-2 bg-gray-700 text-white p-1.5 rounded-full shadow-md border border-gray-500 hover:bg-gray-600 z-50 transform hover:scale-110 transition"
                            title="Jogar Coberta (Escondida)"
                          >
                             <EyeSlashIcon className="w-4 h-4" />
                          </button>
                      )}
                  </div>
              ))}
          </div>
          
          <div className="h-8 flex justify-center items-center mt-2">
             {notification && <span className="bg-black/60 px-4 py-1 rounded-full text-sm font-bold text-white animate-fade-in-up">{notification}</span>}
          </div>
      </div>
    </div>
  );
};

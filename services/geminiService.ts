import { GoogleGenAI, Type } from "@google/genai";
import { AILevel, GameState, AIMoveResponse, Rank, Suit } from '../types';

// IMPORTANT: In a real production app, never expose keys on the client.
// However, per instructions, we access process.env.API_KEY directly.
const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("API_KEY not found in environment variables.");
        // Fallback for demo purposes if key is missing to prevent crash, 
        // effectively disabling AI but allowing UI to load.
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const getAIMove = async (gameState: GameState): Promise<AIMoveResponse> => {
  const client = getClient();
  if (!client) {
    // Fallback simple logic if no API key
    console.warn("Using fallback logic due to missing API Key");
    return fallbackLogic(gameState);
  }

  const { ai, player, vira, tableCards, currentStakes, difficulty, roundWinners, scoreAI, scorePlayer, turn, phase } = gameState;

  // Construct context
  const handStr = ai.hand.map((c, i) => `${i}: ${c.rank} of ${c.suit}`).join(', ');
  const tableStr = tableCards.length > 0 
    ? tableCards.map(c => `${c.player === 'ai' ? 'Me' : 'Opponent'} played ${c.card.rank} of ${c.card.suit}`).join(', ') 
    : 'Empty';
  
  const roundsStr = roundWinners.map((w, i) => `Round ${i+1}: ${w === 'ai' ? 'I won' : w === 'player' ? 'Opponent won' : 'Draw'}`).join(', ');

  // Define detailed persona instructions
  let personaInstruction = "";
  switch (difficulty) {
    case AILevel.RESPONSIBLE:
        personaInstruction = `
            STRATEGY: Conservative, Analytical, Risk-Averse.
            - BLUFFING: Never. Do not bluff.
            - TRUCO/RAISE: Only if you hold a Manilha or strong 3/2 and are sure to win.
            - ACCEPT: Only if you have a winning hand. Fold if in doubt.
            - PLAY: Play highest cards only when necessary to win the round. Save Manilhas for the end.
            - LANGUAGE: Polite, calm, calculating. Uses wisdom proverbs. "Vou na boa", "O jogo é jogado", "Melhor não arriscar".
        `;
        break;
    case AILevel.NORMAL:
        personaInstruction = `
            STRATEGY: Balanced, Competitive, Standard Player.
            - BLUFFING: Occasional (20% chance). Bluff if you have a face card (Q, J, K) to look strong.
            - TRUCO/RAISE: Standard logic. Pressure the opponent if they hesitate.
            - ACCEPT: If you have at least one strong card.
            - PLAY: Try to win the first round to gain advantage.
            - LANGUAGE: Standard Truco slang. Confident but not crazy. "Truco marreco!", "Essa é minha", "Bate na mesa".
        `;
        break;
    case AILevel.CRAZY:
        personaInstruction = `
            STRATEGY: Chaotic, Ultra-Aggressive, Psychological Warfare.
            - BLUFFING LOGIC:
                1. SITUATIONAL AWARENESS: IF SCORE IS TIED OR YOU ARE LOSING/BEHIND, INCREASE BLUFF RATE TO 90%. You must try to steal points.
                2. HAND STRENGTH: If you have MEDIOCRE cards (Face cards, Aces, or even generic 4/5/6), ACT LIKE YOU HAVE A MANILHA. 
                3. TRUCO: Scream TRUCO frequently with weak hands to confuse the opponent.
            - TRUCO/RAISE: 
                - Always pressure. If the opponent proposes Truco, RAISE TO 6 (MEIO PAU) immediately, even with a bad hand. 
                - Do not let them breathe.
            - ACCEPT: Never surrender. Always pay to see.
            - PLAY: Unpredictable. Play Manilha first round just to scare, or hold garbage to the end.
            - LANGUAGE: LOUD, ALL CAPS, RUDE, AGGRESSIVE. Uses heavy insults (friendly banter). "SEIS NELES SEU PATO!", "TREMEU???", "VEM PRO PAU!".
        `;
        break;
    default:
        personaInstruction = "Play optimally.";
  }

  const systemInstruction = `
    You are playing a game of Truco Paulista against a human.
    Your difficulty level is: ${difficulty}.
    
    ${personaInstruction}

    Game Context:
    - Score: Me ${scoreAI} vs Opponent ${scorePlayer} (Max 12).
    - Stakes: ${currentStakes} points.
    - My Hand: [${handStr}]
    - Vira (Trump Indicator): ${vira?.rank} of ${vira?.suit}
    - Table: ${tableStr}
    - History: ${roundsStr}
    
    Task: Decide your move (PLAY, TRUCO, ACCEPT, RUN, RAISE, FOLD) and provide a 'taunt'.
    
    Taunt Instructions:
    - The taunt MUST be in Portuguese (Brazil).
    - It MUST strictly match the tone of your persona defined above.
    - It MUST be context-aware (e.g., if you are winning big, be arrogant; if losing, be defensive).
    - Max 10-12 words.

    Output JSON format only.
  `;

  try {
    const modelId = difficulty === AILevel.CRAZY ? 'gemini-3-pro-preview' : 'gemini-2.5-flash';
    
    const response = await client.models.generateContent({
      model: modelId,
      contents: `Decide the move based on the provided game state. The opponent is waiting.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ['PLAY', 'TRUCO', 'ACCEPT', 'RUN', 'RAISE', 'FOLD'] },
            cardIndex: { type: Type.INTEGER, description: "Index of card in hand to play (0-based). Required if action is PLAY." },
            taunt: { type: Type.STRING, description: "A context-aware Portuguese Truco phrase matching your persona." }
          },
          required: ['action', 'taunt']
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");
    
    const move = JSON.parse(jsonText) as AIMoveResponse;
    
    // Validate card index
    if (move.action === 'PLAY' && (move.cardIndex === undefined || move.cardIndex < 0 || move.cardIndex >= ai.hand.length)) {
      move.cardIndex = 0; // Fallback
    }

    return move;

  } catch (error) {
    console.error("Gemini AI Error:", error);
    return fallbackLogic(gameState);
  }
};

// New Function: Generate a specific reaction when the AI loses the hand
export const getAIReaction = async (gameState: GameState, winner: 'player' | 'ai'): Promise<string> => {
    if (winner === 'ai') return ""; // Only react if AI lost (for now)

    const client = getClient();
    if (!client) {
        // Fallback reaction logic
        const lastTrick = gameState.trickHistory[gameState.trickHistory.length - 1];
        if (lastTrick && lastTrick.length > 0) {
            const lastCard = lastTrick.find(c => c.player === 'player')?.card;
            if (lastCard) return `Ah não! Esse ${lastCard.rank} me quebrou...`;
        }
        return "Que sorte a sua...";
    }

    const { difficulty, vira, trickHistory } = gameState;

    // Construct a summary of the last moments
    const lastRound = trickHistory[trickHistory.length - 1];
    let lastRoundStr = "Last round cards: ";
    if (lastRound) {
        lastRoundStr += lastRound.map(p => `${p.player === 'ai' ? 'Me' : 'Opponent'}: ${p.card.rank}${p.card.suit}`).join(' vs ');
    }

    const prompt = `
        The hand just ended. The HUMAN PLAYER WON. You (the AI) lost.
        Difficulty/Persona: ${difficulty}.
        Vira: ${vira?.rank}.
        ${lastRoundStr}.
        
        Generate a short, bitter, or shocked reaction phrase (in Portuguese) specifically commenting on the card the player used to win or your own bad luck.
        Example: "Como você tinha esse Zap?!", "Sortudo demais com esse 7!", "Eu achei que meu 3 levava...".
        
        Max 10 words. Plain text.
    `;

    try {
         const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'text/plain',
                maxOutputTokens: 20,
            }
         });
         return response.text?.trim() || "Perdi essa...";
    } catch (e) {
        return "Perdi essa...";
    }
}

// Fallback logic for when API fails or is missing
const fallbackLogic = (gameState: GameState): AIMoveResponse => {
    const { difficulty, ai, scoreAI, scorePlayer, currentStakes } = gameState;
    
    // Simple logic
    let action: 'PLAY' | 'TRUCO' | 'FOLD' | 'ACCEPT' | 'RAISE' = 'PLAY';
    let cardIndex = 0;

    // --- Difficulty Based Decision Making (Fallback) ---
    
    // 1. Determine Truco Probability
    let trucoChance = 0.05; // Base low
    
    if (difficulty === AILevel.NORMAL) {
        trucoChance = 0.15;
    } else if (difficulty === AILevel.CRAZY) {
        trucoChance = 0.40; // High base chance
        // CRAZY LOGIC: If losing or tied, become even more aggressive
        if (scoreAI <= scorePlayer) {
            trucoChance = 0.80; // "Desperate" mode or "Bully" mode
        }
    }

    // 2. Decide Action
    const canTruco = currentStakes < 12; // Simplified check
    
    // Check if we are responding to a Truco (Phase check handled roughly here by available actions context conceptually)
    // Since this is a simple fallback, we mostly look at initiating or random play.
    
    if (canTruco && Math.random() < trucoChance) {
        action = 'TRUCO';
    } 
    
    // 3. Select Card (Basic logic: Play highest to win, or random)
    if (action === 'PLAY') {
        // Simple heuristic: play random card to avoid getting stuck always playing index 0
        cardIndex = Math.floor(Math.random() * ai.hand.length);
    }
    
    // Expanded taunt library
    const taunts = {
        [AILevel.RESPONSIBLE]: [
            "Vamos com calma, o jogo é longo.",
            "Essa eu pago pra ver, mas sem loucura.",
            "Jogando na técnica, sempre.",
            "Sem pressa, amigo. O erro é seu.",
            "O jogo é jogado, o lambari é pescado.",
            "Não vou cair nessa sua.",
            "Humildade e pés no chão.",
            "Quem muito quer, nada tem."
        ],
        [AILevel.NORMAL]: [
            "Truco marreco! Quero ver.",
            "Segura essa manga, pato!",
            "Cuidado que a casa cai, hein!",
            "Não tem nem pro cheiro hoje.",
            "Desce do muro e joga!",
            "Vou zapar na sua testa!",
            "Aqui tem café no bule.",
            "Tá com medo? Compra um cachorro."
        ],
        [AILevel.CRAZY]: [
            "SEIS NELES!!! VEM TRANQUILO!",
            "PATO NOVO MERGULHA FUNDO! QUACK QUACK!",
            "LADRÃO! EU VI ESSA CARTA!",
            "SEGURA O ZAP NA TESTA!",
            "TREMEU A BASE AÍ? TÁ SUANDO FRIO?",
            "VAI ENCARAR OU VAI CORRER PRO COLO DA MÃE?",
            "HOJE TEM!!! AQUI É PRESSÃO!",
            "MEIO PAU!!! QUERO VER PEGAR!",
            "BATE NA MESA QUE É HOMEM!"
        ]
    };

    const personaTaunts = taunts[difficulty] || taunts[AILevel.NORMAL];
    const randomTaunt = personaTaunts[Math.floor(Math.random() * personaTaunts.length)];

    return {
        action: action as any,
        cardIndex,
        taunt: randomTaunt
    };
}
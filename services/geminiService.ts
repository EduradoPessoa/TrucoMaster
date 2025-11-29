
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

// Helper for timeout
const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

export const getAIMove = async (gameState: GameState): Promise<AIMoveResponse> => {
  const client = getClient();
  if (!client) {
    console.warn("Using fallback logic due to missing API Key");
    return fallbackLogic(gameState);
  }

  const { ai, player, vira, tableCards, currentStakes, difficulty, roundWinners, scoreAI, scorePlayer, turn, phase } = gameState;

  // Construct context
  const handStr = ai.hand.map((c, i) => `${i}: ${c.rank} of ${c.suit}`).join(', ');
  const tableStr = tableCards.length > 0 
    ? tableCards.map(c => `${c.player === 'ai' ? 'Me' : 'Opp'} played ${c.card.rank}`).join(', ') 
    : 'Empty';
  
  const roundsStr = roundWinners.map((w, i) => `R${i+1}: ${w}`).join(', ');

  const scoreDiff = scoreAI - scorePlayer;

  // Define detailed persona instructions
  let personaInstruction = "";
  switch (difficulty) {
    case AILevel.RESPONSIBLE:
        personaInstruction = `
            PERSONA: 'O Professor'. Conservative, Analytical.
            - STYLE: Proverbs, math.
            - IF WINNING: "A lógica prevalece."
            - TRUCO: Only when certain.
            - BLUFF: Never.
        `;
        break;
    case AILevel.NORMAL:
        personaInstruction = `
            PERSONA: 'O Malandro'. Bar Player.
            - STYLE: Truco slang.
            - IF WINNING: "Passa pro caixa!"
            - TRUCO: "Truco, ladrão!"
            - BLUFF: Sometimes.
        `;
        break;
    case AILevel.CRAZY:
        personaInstruction = `
            PERSONA: 'O Psicopata' (Porra Louca). Chaotic, Aggressive.
            - STYLE: CAPS LOCK, insults, screaming.
            - STRATEGY: If score is even or losing, BLUFF constantly with ANY cards. Force opponent to fold.
            - IF WINNING: "EU SOU UMA LENDA!!!"
            - IF LOSING/TIED: "VOU VIRAR ESSA MESA!!", "LADRÃO!!"
            - TRUCO: Screams "MEIO PAU!!!", "SEIS!!!"
        `;
        break;
    default:
        personaInstruction = "Play optimally.";
  }

  const systemInstruction = `
    Play Truco Paulista. Difficulty: ${difficulty}.
    ${personaInstruction}

    CRITICAL RULES:
    1. If Score Me is 11: NO TRUCO/RAISE. Only PLAY (if turn) or ACCEPT/FOLD (if responding).
    2. If Opponent Truco'd: RAISE max once (to 6). Max stakes 6. No raising to 9/12.
    3. If stakes are 6, cannot RAISE.

    Context:
    Score: Me ${scoreAI} x Opp ${scorePlayer}. Stakes: ${currentStakes}.
    Hand: [${handStr}]
    Table: ${tableStr}
    History: ${roundsStr}
    Vira: ${vira?.rank}
    
    Task: Output JSON move.
    
    TAUNT RULES:
    - Portuguese (Brazil).
    - Match PERSONA.
    - Context aware (winning/losing/bluffing).
    - Max 10 words.
  `;

  try {
    // Use Flash model for speed
    const modelId = 'gemini-2.5-flash';
    
    // Increased timeout to 12s to prevent errors on slower networks
    const apiCall = client.models.generateContent({
      model: modelId,
      contents: `Decide move. Opponent waiting.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 250, // Limit output size for speed
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ['PLAY', 'TRUCO', 'ACCEPT', 'RUN', 'RAISE', 'FOLD'] },
            cardIndex: { type: Type.INTEGER },
            taunt: { type: Type.STRING }
          },
          required: ['action', 'taunt']
        }
      }
    });

    // Race the API call against a 12 second timeout
    const response: any = await Promise.race([apiCall, timeoutPromise(12000)]);

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");
    
    const move = JSON.parse(jsonText) as AIMoveResponse;
    
    // Validate card index
    if (move.action === 'PLAY' && (move.cardIndex === undefined || move.cardIndex < 0 || move.cardIndex >= ai.hand.length)) {
      move.cardIndex = 0; // Fallback
    }

    // CRITICAL: Enforce Rule 11 Post-Gen
    if ((move.action === 'TRUCO' || move.action === 'RAISE') && scoreAI >= 11) {
        console.warn("AI tried to TRUCO/RAISE with score 11. Forcing PLAY/ACCEPT.");
        
        if (phase === 'TRUCO_PROPOSAL_PLAYER') {
             move.action = 'ACCEPT'; 
             move.taunt = difficulty === AILevel.CRAZY ? "MÃO DE 11 NÃO TEM MEDO!!!" : "Aceito.";
        } else {
             move.action = 'PLAY';
             move.cardIndex = 0; 
             move.taunt = difficulty === AILevel.CRAZY ? "NO ESCURO!" : "Vamos ver.";
        }
    }

    return move;

  } catch (error) {
    console.error("Gemini AI Error/Timeout:", error);
    return fallbackLogic(gameState);
  }
};

// New Function: Generate a specific reaction when the AI loses the hand
export const getAIReaction = async (gameState: GameState, winner: 'player' | 'ai'): Promise<string> => {
    if (winner === 'ai') return ""; 

    const client = getClient();
    
    // Fallback if no client
    if (!client) {
        return "Que azar o meu...";
    }

    const { difficulty, vira, trickHistory, currentStakes, scoreAI, scorePlayer } = gameState;

    // Construct a context of the final showdown
    const lastTrick = trickHistory[trickHistory.length - 1];
    let contextStr = `Stakes: ${currentStakes}. Score: Me ${scoreAI} vs Opp ${scorePlayer}.\n`;
    
    if (lastTrick) {
        const pCard = lastTrick.find(c => c.player === 'player');
        const aiCard = lastTrick.find(c => c.player === 'ai');
        if (pCard && aiCard) {
            contextStr += `Final: I played ${aiCard.card.rank}, Opp played ${pCard.card.rank} (WINNER).`;
        }
    } else {
        contextStr += "I folded.";
    }

    const prompt = `
        You LOST the hand in Truco Paulista.
        Persona: ${difficulty}.
        Vira: ${vira?.rank}.
        ${contextStr}

        Task: One phrase reaction (PT-BR).
        - Specific (mention card/luck).
        - Max 10 words.
    `;

    try {
         // Race logic for reaction, timeout 10s
         const response: any = await Promise.race([
             client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'text/plain',
                    maxOutputTokens: 50,
                }
             }),
             timeoutPromise(10000)
         ]);

         return response.text?.trim() || "Perdi essa...";
    } catch (e) {
        console.error("AI Reaction Error:", e);
        return "Perdi essa...";
    }
}

// Fallback logic for when API fails or is missing
const fallbackLogic = (gameState: GameState): AIMoveResponse => {
    const { difficulty, ai, scoreAI, scorePlayer, currentStakes, isBettingLocked } = gameState;
    
    // Simple logic
    let action: 'PLAY' | 'TRUCO' | 'FOLD' | 'ACCEPT' | 'RAISE' = 'PLAY';
    let cardIndex = 0;

    // --- Difficulty Based Decision Making (Fallback) ---
    let trucoChance = 0.05; 
    
    if (difficulty === AILevel.NORMAL) {
        trucoChance = 0.15;
    } else if (difficulty === AILevel.CRAZY) {
        trucoChance = 0.40; 
        if (scoreAI <= scorePlayer) {
            trucoChance = 0.85; 
            if (currentStakes < 3) trucoChance = 0.95;
        }
    }

    // 2. Decide Action
    let canTruco = currentStakes < 6 && !isBettingLocked; 
    
    // RULE OF 11 CHECK
    if (scoreAI >= 11) {
        canTruco = false;
    }
    
    if (canTruco && Math.random() < trucoChance) {
        action = 'TRUCO';
    } 
    
    // 3. Select Card
    if (action === 'PLAY') {
        cardIndex = Math.floor(Math.random() * ai.hand.length);
    }
    
    // Expanded taunt library
    const taunts = {
        [AILevel.RESPONSIBLE]: [
            "Vamos com calma.",
            "Essa eu pago pra ver.",
            "Jogando na técnica.",
            "O erro é seu.",
            "Matematicamente improvável."
        ],
        [AILevel.NORMAL]: [
            "Truco marreco!",
            "Segura essa manga!",
            "Cuidado que a casa cai!",
            "Vou zapar na testa!",
            "Ladrão que rouba ladrão..."
        ],
        [AILevel.CRAZY]: [
            "SEIS NELES!!!",
            "PATO NOVO MERGULHA FUNDO!",
            "LADRÃO! EU VI!",
            "SEGURA O ZAP!",
            "TREMEU A BASE AÍ?",
            "VAI ENCARAR??",
            "HOJE TEM!!!",
            "MEIO PAU!!!",
            "BATE NA MESA!!",
            "EU NÃO TENHO MEDO!!!",
            "VIRA ESSE JOGO!!",
            "SÓ NA PRESSÃO!!",
            "A SORTE TÁ COMIGO!",
            "MÃO FRACA, CABEÇA FRACA!"
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


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

  const scoreDiff = scoreAI - scorePlayer;
  const isWinning = scoreDiff > 0;
  const isLosing = scoreDiff < 0;
  const isTightMatch = Math.abs(scoreDiff) <= 2;
  const isGamePoint = scoreAI >= 11 || scorePlayer >= 11;

  // Define detailed persona instructions
  let personaInstruction = "";
  switch (difficulty) {
    case AILevel.RESPONSIBLE:
        personaInstruction = `
            PERSONA: 'O Professor'. Conservative, Analytical, Educational.
            - STYLE: Uses proverbs, math, and logic. Calm demeanor.
            - IF WINNING: "A lógica prevalece.", "Estatística pura, meu amigo."
            - IF LOSING: "A variância está contra mim.", "Interessante..."
            - TRUCO: Only when mathematically certain. "Calculado e aprovado. TRUCO."
            - BLUFF: Never.
        `;
        break;
    case AILevel.NORMAL:
        personaInstruction = `
            PERSONA: 'O Malandro'. Standard Bar Player. Competitive but fun.
            - STYLE: Classic Truco slang (Paulista style).
            - IF WINNING: "Passa pro caixa!", "Aqui tem café no bule!", "Pato novo na lagoa?"
            - IF LOSING: "Deu sorte, hein?", "O jogo vira..."
            - TRUCO: Aggressive but fair. "Truco, ladrão!", "Bate na mesa se for homem!"
            - BLUFF: Sometimes. Acts confident.
        `;
        break;
    case AILevel.CRAZY:
        personaInstruction = `
            PERSONA: 'O Psicopata'. Chaotic, Unhinged, Loud.
            - STYLE: CAPS LOCK, insults (friendly), random noises, aggressive.
            - IF WINNING: "EU SOU UMA LENDA!!!", "CHORA NENÉM!!!", "SEGURA O ZAP!!"
            - IF LOSING: "ROUBO!!!", "FOI OLHO GORDO!!!", "VOU VIRAR ESSA MESA!!"
            - TRUCO: Screams constantly. "MEIO PAU!!!", "SEIS!!!", "TREMEU A PERNA??"
            - BLUFF: Always. Lier. "Tenho o Zap!" (Has a 4).
        `;
        break;
    default:
        personaInstruction = "Play optimally.";
  }

  const systemInstruction = `
    You are playing a game of Truco Paulista against a human.
    Your difficulty/persona is: ${difficulty}.
    
    ${personaInstruction}

    CRITICAL RULES:
    1. If your score (Me) is 11, you CANNOT call TRUCO or RAISE. You can only PLAY (if it's your turn) or ACCEPT/FOLD (if responding to Truco).
    2. If the opponent called Truco (and you are deciding to ACCEPT/RAISE/RUN), you can only RAISE once per turn sequence (up to 6).
    3. Max stakes are 6 (Truco -> 6). You cannot raise to 9 or 12.
    4. If stakes are already 6, you cannot RAISE.

    Game Context:
    - Score: Me ${scoreAI} vs Opponent ${scorePlayer} (Max 12).
    - Stakes: ${currentStakes} points.
    - My Hand: [${handStr}]
    - Vira (Trump Indicator): ${vira?.rank} of ${vira?.suit}
    - Table: ${tableStr}
    - History: ${roundsStr}
    - Game Point Situation: ${isGamePoint ? "YES - TENSION IS HIGH" : "No"}
    
    Task: Decide your move (PLAY, TRUCO, ACCEPT, RUN, RAISE, FOLD) and provide a 'taunt'.
    
    TAUNT GENERATION RULES:
    1. The taunt MUST be in Portuguese (Brazil).
    2. MATCH YOUR PERSONA PERFECTLY.
    3. BE CONTEXT AWARE:
       - If you are calling TRUCO/RAISE: Be intimidating. Challenge their courage.
       - If you are RUNNING/FOLDING: Make an excuse or mock the opponent's luck.
       - If playing a STRONG card (Manilha): Boast about it. "Zap na testa!"
       - If playing a WEAK card: Be subtle or try to deceive.
       - If SCORE is 11x11: Be extremely tense or confident.
    4. Max 10-12 words. Keep it punchy.

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

    // CRITICAL: Enforce Rule 11 Post-Gen
    if ((move.action === 'TRUCO' || move.action === 'RAISE') && scoreAI >= 11) {
        console.warn("AI tried to TRUCO/RAISE with score 11. Forcing PLAY/ACCEPT.");
        
        if (phase === 'TRUCO_PROPOSAL_PLAYER') {
             // Responding to player's Truco: Must Accept or Run. Cannot Raise.
             // We default to Accept to keep flow, or Run if hand is terrible (simplification: accept for now)
             move.action = 'ACCEPT'; 
             move.taunt = difficulty === AILevel.CRAZY ? "MÃO DE 11 NÃO TEM MEDO!!!" : "Mão de 11... Eu aceito.";
        } else {
             // AI Turn to play: Cannot call Truco. Must Play.
             move.action = 'PLAY';
             move.cardIndex = 0; 
             move.taunt = difficulty === AILevel.CRAZY ? "JOGANDO NO ESCURO!" : "Vamos jogar essa mão de 11.";
        }
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
    const { difficulty, ai, scoreAI, scorePlayer, currentStakes, isBettingLocked } = gameState;
    
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
    let canTruco = currentStakes < 6 && !isBettingLocked; 
    
    // RULE OF 11 CHECK
    if (scoreAI >= 11) {
        canTruco = false;
    }
    
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
            "Quem muito quer, nada tem.",
            "Matematicamente improvável você ganhar essa."
        ],
        [AILevel.NORMAL]: [
            "Truco marreco! Quero ver.",
            "Segura essa manga, pato!",
            "Cuidado que a casa cai, hein!",
            "Não tem nem pro cheiro hoje.",
            "Desce do muro e joga!",
            "Vou zapar na sua testa!",
            "Aqui tem café no bule.",
            "Tá com medo? Compra um cachorro.",
            "Se correr o bicho pega!",
            "Ladrão que rouba ladrão..."
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
            "BATE NA MESA QUE É HOMEM!",
            "EU NÃO TENHO MEDO DE NADA!!!",
            "VIRA ESSE JOGO AGORA!!!"
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

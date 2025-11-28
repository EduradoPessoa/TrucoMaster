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

  const systemInstruction = `
    You are playing a game of Truco Paulista against a human.
    Your persona is: ${difficulty}.
    
    Persona Guidelines:
    - ${AILevel.RESPONSIBLE}: Play conservatively. Calm demeanor. Uses phrases like "Vou na boa", "Essa eu passo". rarely bluffs.
    - ${AILevel.NORMAL}: Balanced strategy. Uses standard Truco slang ("Cuidado com o zap", "Essa é minha").
    - ${AILevel.CRAZY} (Porra Louca): Chaotic, aggressive, loud. Uses HEAVY slang, CAPSLOCK, and provocations ("SEIS NELES!", "LADRÃO!", "MARRECO!", "PATO NOVO MERGULHA FUNDO"). Bluffs frequently.

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
    - It MUST be context-aware.
    - If you are winning by a lot: Be arrogant.
    - If you are losing: Be defensive or dismissive ("Sorte de principiante").
    - If playing a Manilha (Zap/Copas/Espadilha/Ouros): Brag about it ("Segura o ZAP!").
    - If Truco/Raise: Intimidate ("TREMEU?", "VAI CORRER?").
    - If Folding: Make an excuse ("Não valia nada", "Deixa pra próxima").
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

// Fallback logic for when API fails or is missing
const fallbackLogic = (gameState: GameState): AIMoveResponse => {
    const { difficulty, ai } = gameState;
    
    // Simple random play logic
    let action: 'PLAY' | 'TRUCO' | 'FOLD' = 'PLAY';
    if (Math.random() < 0.1) action = 'TRUCO';
    
    // Select taunt based on difficulty
    const taunts = {
        [AILevel.RESPONSIBLE]: [
            "Vamos com calma.",
            "Essa eu pago pra ver.",
            "Jogando na técnica.",
            "Sem pressa.",
            "O jogo é jogado.",
        ],
        [AILevel.NORMAL]: [
            "Truco marreco!",
            "Segura essa manga.",
            "Cuidado que a casa cai.",
            "Não tem nem pro cheiro.",
            "Desce do muro!",
        ],
        [AILevel.CRAZY]: [
            "SEIS NELES!!!",
            "PATO NOVO MERGULHA FUNDO!",
            "LADRÃO!",
            "SEGURA O ZAP!",
            "TREMEU A BASE AÍ?",
            "VAI ENCARAR OU VAI CORRER?",
            "HOJE TEM!!!"
        ]
    };

    const personaTaunts = taunts[difficulty] || taunts[AILevel.NORMAL];
    const randomTaunt = personaTaunts[Math.floor(Math.random() * personaTaunts.length)];

    return {
        action: action as any,
        cardIndex: 0,
        taunt: randomTaunt
    };
}
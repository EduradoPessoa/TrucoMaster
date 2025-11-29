# 🎴 Truco Master AI

Bem-vindo ao **Truco Master AI**, um jogo de Truco Paulista moderno e envolvente desenvolvido com React, onde você desafia uma Inteligência Artificial alimentada pelo **Google Gemini**.

O jogo não é apenas algorítmico; o oponente possui "personalidade", reage ao jogo, faz blefes contextualizados e utiliza gírias clássicas do Truco brasileiro.

![Truco Master AI Banner](https://via.placeholder.com/800x400?text=Truco+Master+AI+Powered+by+Gemini)

## ✨ Funcionalidades

- **Oponente Inteligente (Gemini AI):** A IA analisa sua mão, a mesa, o placar e o histórico para tomar decisões (Jogar, Pedir Truco, Fugir, Aceitar).
- **3 Personalidades de IA:**
  - 🧠 **Responsável:** Joga baseado em estatística e lógica. Não se arrisca.
  - 🕶️ **Normal:** O jogador de bar padrão. Equilibra risco e segurança.
  - 🤪 **Porra Louca:** Agressivo, grita (em caixa alta), blefa constantemente e tenta roubar o jogo.
- **Regras Oficiais do Truco Paulista:**
  - Manilhas variáveis baseadas na "Vira".
  - Ordem de força: 3 > 2 > A > K > J > Q > 7 > 6 > 5 > 4.
  - Pontuação até 12 pontos.
- **Mecânicas Avançadas:**
  - **Mão de 11:** Regras visuais e lógicas para impedir aumento de aposta.
  - **Jogar Coberta:** Possibilidade de esconder a carta na segunda rodada.
  - **Limite de Aposta:** Travamento de aposta após aceitar (máximo 6 pontos/Meio-Pau).
- **Experiência do Usuário:**
  - **Animações:** Cartas voando para a mesa, confetes na vitória, pontuação flutuante.
  - **Sons Imersivos:** Efeitos gerados via Web Audio API (sem arquivos pesados) para embaralhamento, cartas, truco e vitória.
  - **Histórico:** Log visual das cartas jogadas nas rodadas anteriores.
  - **Modo Iniciante:** Dicas visuais nas cartas para identificar Manilhas.

## 🚀 Tecnologias Utilizadas

- **Frontend:** React 19 (TypeScript).
- **Estilização:** Tailwind CSS.
- **IA / Backend:** Google GenAI SDK (`@google/genai`) rodando no client-side (para demo).
- **Ícones:** Heroicons.
- **Áudio:** Native Web Audio API.

## 📦 Como Rodar o Projeto

### Pré-requisitos
- Node.js instalado.
- Uma API Key do Google Gemini (obtenha em [Google AI Studio](https://aistudio.google.com/)).

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/truco-master-ai.git
   cd truco-master-ai
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure a API Key:**
   Crie um arquivo `.env` na raiz do projeto e adicione sua chave:
   ```env
   API_KEY=sua_chave_do_google_gemini_aqui
   ```
   > **Nota:** Como este é um projeto front-end, certifique-se de que sua ferramenta de build (Vite/Webpack) esteja configurada para expor essa variável (ex: `VITE_API_KEY` ou define plugin), ou use `process.env.API_KEY` conforme configurado no `services/geminiService.ts`.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```

## 🎮 Como Jogar

1. **Selecione sua Experiência:** Na tela inicial, escolha entre Iniciante (com dicas), Pleno ou Mestre.
2. **O Jogo:** O sistema sorteará um nível de dificuldade para o computador (escondido de você).
3. **Turnos:** Jogue suas cartas clicando nelas.
4. **Truco:** Se tiver cartas boas (ou quiser blefar), use o botão de "Truco" (ou pedir 6).
5. **Mão de 11:** Se você ou o oponente tiverem 11 pontos, as regras mudam. Você poderá ver as cartas do parceiro (em duplas - aqui simulado pela lógica de ver se vale a pena), e não pode aumentar a aposta.

## 📂 Estrutura do Projeto

- `/components`: Componentes React (Game, Card, HistoryLog, Confetti).
- `/services`: Integração com a API do Google Gemini.
- `/utils`: Lógica pura do jogo (deck, validação de vencedor) e sintetizador de áudio.
- `/types.ts`: Definições de tipos TypeScript para o estado do jogo.

## 🤖 Engenharia de Prompt

O coração deste projeto reside no arquivo `services/geminiService.ts`. Utilizamos "System Instructions" robustas para forçar a IA a adotar uma persona específica, respeitar as regras estritas de pontuação (como não pedir Truco na mão de 11) e gerar "Taunts" (provocações) em português brasileiro autêntico.

---

Desenvolvido com ♠️ ♥️ ♣️ ♦️ e IA.
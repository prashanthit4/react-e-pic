# 🎨 react-e-pic — TypeScript Multiplayer Game

Real-time 4-player (configurable) Pictionary built with **React 19 + TypeScript + Node.js + Socket.io + Redis + MongoDB**.

---

## Quick Start (manual — recommended for dev)

### 1. Start databases

```bash
# Redis
docker run -d -p 6379:6379 redis:7-alpine

# MongoDB (optional — game history only)
docker run -d -p 27017:27017 mongo:7
```

### 2. Server

```bash
cd server
cp .env.example .env    # edit game settings here
npm install
npm run dev             # ts-node-dev hot-reload on :3001
```

### 3. Client

```bash
cd client
npm install
npm run dev             # Vite dev server on :3000
```

Open **http://localhost:3000** in 4 browser tabs. Create in tab 1, join with the code in tabs 2–4.

---

## Docker Compose (all-in-one)

```bash
docker-compose up --build
```

Client → http://localhost:3000 · Server → http://localhost:3001

---

## Configuring the game (server/.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `GAME_MAX_PLAYERS` | `4` | Total players per game (must be even) |
| `GAME_NUM_TEAMS` | `2` | Number of teams |
| `GAME_ROUND_DURATION` | `120` | Seconds per round |
| `GAME_TOTAL_ROUNDS` | `8` | Rounds before game ends |

Examples:
- **6 players / 2 teams** → `GAME_MAX_PLAYERS=6 GAME_NUM_TEAMS=2`
- **6 players / 3 teams** → `GAME_MAX_PLAYERS=6 GAME_NUM_TEAMS=3`
- **Quick game** → `GAME_TOTAL_ROUNDS=4 GAME_ROUND_DURATION=60`

---

## Project structure

```
react-e-pic/
├── docker-compose.yml
├── server/                    # Node.js + Express + Socket.io
│   ├── src/
│   │   ├── index.ts           # Server entry, all Socket.io handlers
│   │   ├── config.ts          # Env vars + TURN_ORDER builder
│   │   ├── types/index.ts     # All shared TypeScript interfaces
│   │   ├── game/
│   │   │   ├── GameStateManager.ts  # Redis state machine
│   │   │   └── words.ts             # Word bank
│   │   └── models/Game.ts     # Mongoose schema
│   ├── .env                   # Local config (gitignored)
│   └── package.json           # npm run dev → ts-node-dev
│
└── client/                    # React 19 + TypeScript + Vite
    ├── src/
    │   ├── main.tsx            # createRoot entry
    │   ├── App.tsx             # Screen router
    │   ├── types/index.ts      # Client-side TypeScript types
    │   ├── styles/             # One CSS file per component
    │   ├── context/
    │   │   ├── SocketContext.tsx
    │   │   └── GameContext.tsx
    │   └── components/
    │       ├── ui/             # Button, Input, Card, TeamBadge, PlayerSlot
    │       ├── canvas/         # DrawingCanvas
    │       ├── chat/           # Chat
    │       ├── game/           # GameBoard, Scoreboard, Timer
    │       ├── lobby/          # Lobby, WaitingRoom
    │       └── overlay/        # RoundOverlay, GameOver
    └── package.json
```

---

## React 19 features used

- `createRoot` (stable in React 19)
- `use` context via `createContext` with the new direct `<Context value={...}>` syntax (no `.Provider`)
- `useMemo` for confetti piece generation
- `useReducer` for all game state with discriminated union actions
- Strict Mode enabled in `main.tsx`

AI Assisted development(Claude)

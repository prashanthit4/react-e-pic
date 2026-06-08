# 🎨 Pictionary — Multiplayer Draw & Guess

A real-time 4-player Pictionary game built with **React + Node.js + Socket.io + Redis + MongoDB**.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (React + Vite)              │
│  Lobby → WaitingRoom → GameBoard                    │
│  DrawingCanvas · Chat · Scoreboard · Timer          │
└─────────────────────┬───────────────────────────────┘
                      │ Socket.io + REST
┌─────────────────────▼───────────────────────────────┐
│              SERVER (Node.js + Express)              │
│  Socket.io events · Game state machine              │
│  Timer management · Round resolution logic          │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
┌──────────────▼───┐  ┌───────────▼──────────────────┐
│  Redis (Primary) │  │  MongoDB (Persistent)         │
│  Game state      │  │  Game history, final scores   │
│  TTL: 1 hour     │  │  Player names, round data     │
└──────────────────┘  └──────────────────────────────┘
```

## 👥 Team Structure

| Player | Index | Team |
|--------|-------|------|
| P1     | 0     | 🔴 Team Red  |
| P2     | 1     | 🔴 Team Red  |
| P3     | 2     | 🔵 Team Blue |
| P4     | 3     | 🔵 Team Blue |

**Turn order:** P1 → P3 → P2 → P4 → (repeat) = 8 rounds total

**Scoring:** Only the artist's teammate earns a point on correct guess. Opponents cannot score.

---

## 🚀 Quick Start

### Option A — Docker Compose (recommended)

```bash
# Start everything
docker-compose up --build

# Open your browser to:
# http://localhost:3000
```

### Option B — Manual Setup

**Prerequisites:** Node.js 18+, Redis, MongoDB

```bash
# 1. Start Redis and MongoDB
redis-server &
mongod --dbpath /tmp/mongo &

# 2. Start the server
cd server
cp .env.example .env
npm install
npm start

# 3. Start the client (new terminal)
cd client
npm install
npm run dev
```

Open **http://localhost:3000** in 4 different tabs/browsers.

---

## 🎮 How to Play

1. **Player 1** clicks **Create Game** → shares the 8-character game code
2. **Players 2, 3, 4** click **Join Game** and enter the code
3. Game auto-starts when all 4 players have joined
4. Each round:
   - The **Artist** sees a secret word — draw it!
   - The Artist's **Teammate** types guesses in the chat
   - **Correct guess** = +1 point for the team
   - **Timer hits 0** = no points, word revealed
5. After 8 rounds (2 per player), the team with more points wins!

---

## 🔌 Socket.io Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `game:join` | `{ gameId, playerName }` | Join a game room |
| `game:reconnect` | `{ gameId, playerIndex }` | Reconnect to active game |
| `chat:send` | `{ text }` | Send a chat message or guess |
| `draw:start` | `{ x, y, color, size, tool }` | Start drawing stroke |
| `draw:move` | `{ from, to, color, size, eraser }` | Drawing coordinates |
| `draw:end` | `{}` | End drawing stroke |
| `draw:clear` | `{}` | Clear the canvas |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `game:state` | Full game state | Updated game state (word hidden from non-artists) |
| `game:started` | `{}` | Game begins |
| `game:finished` | `{ scores, players }` | Game over |
| `timer:tick` | `{ remaining }` | Countdown every second |
| `chat:message` | Message object | Chat or system message |
| `round:correct` | `{ word, guessedBy, scoringTeam, scores }` | Correct guess event |
| `round:timeout` | `{ word }` | Round timer expired |
| `draw:move` | Drawing data | Broadcast drawing to non-artist players |
| `draw:clear` | `{}` | Broadcast canvas clear |

---

## 📁 Project Structure

```
pictionary/
├── docker-compose.yml
├── server/
│   ├── index.js          # Express + Socket.io server
│   ├── gameState.js      # Redis-backed game state manager
│   ├── models.js         # MongoDB schemas (Game, Round)
│   ├── constants.js      # Word bank, round duration, turn order
│   └── .env.example
└── client/
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── context/
        │   ├── SocketContext.jsx   # Socket.io connection
        │   └── GameContext.jsx     # Game state + dispatch
        └── components/
            ├── Lobby.jsx           # Create/join screen
            ├── WaitingRoom.jsx     # Players joining
            ├── GameBoard.jsx       # Main game screen
            ├── DrawingCanvas.jsx   # Canvas + drawing tools
            ├── Chat.jsx            # Chat + guess evaluation
            ├── Scoreboard.jsx      # Live scores + players
            ├── Timer.jsx           # Countdown timer
            ├── RoundOverlay.jsx    # Correct/timeout overlay
            └── GameOver.jsx        # Final results + confetti
```

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```
PORT=3001
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/pictionary
CLIENT_URL=http://localhost:3000
```

### Client (Vite auto-proxies `/api` and `/socket.io` to server)
```
VITE_SERVER_URL=         # Leave empty for proxy, or set to http://server:3001
```

---

## 🎨 Drawing Tools

- **8 colors** including black, red, blue, teal, orange, yellow, purple, white
- **4 brush sizes**: fine (3px), medium (6px), large (12px), jumbo (20px)  
- **Eraser tool**: double-width eraser
- **Clear canvas**: wipes everything for all players

---

## 🔧 Redis Fallback

The server includes an **in-memory fallback** if Redis is unavailable. This works for single-server development but won't persist across restarts. For production, always use Redis.

---

## 📊 MongoDB Schema

```javascript
Game {
  gameId: String,          // 8-char code
  players: [{
    name, teamId, playerIndex, socketId
  }],
  rounds: [{
    roundNumber, artistIndex, word,
    guessedBy, teamScored, duration
  }],
  finalScores: { team0, team1 },
  status: 'waiting' | 'playing' | 'finished',
  startedAt, endedAt, createdAt
}
```

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { SocketProvider } from './context/SocketContext';
import { GameProvider } from './context/GameContext';
import App from './App';
import './styles/global.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <SocketProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </SocketProvider>
  </StrictMode>,
);

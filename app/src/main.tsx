import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initConsoleFilter } from './utils/consoleFilter'

initConsoleFilter();

const rootElement = document.getElementById('root');

// Simple Error Boundary
const ErrorFallback = ({ error }: { error: any }) => (
  <div style={{ padding: '20px', color: 'red' }}>
    <h2>Something went wrong:</h2>
    <pre>{error?.message || JSON.stringify(error)}</pre>
  </div>
);

if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (e) {
    console.error("Mounting Error:", e);
    rootElement.innerHTML = `<div style="padding: 20px; color: red"><h2>Application Failed to Start</h2><pre>${e instanceof Error ? e.message : String(e)}</pre></div>`;
  }
} else {
    console.error("Root element not found!");
}

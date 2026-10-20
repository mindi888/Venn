import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { startBackendWakeup } from "@/lib/backendStatus";

// Start waking the backend immediately; only pages that need it wait on it
startBackendWakeup();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

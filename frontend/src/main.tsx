import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { BackendWakeupGate } from "./BackendWakeupGate";


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BackendWakeupGate>
      <App />
    </BackendWakeupGate>
  </React.StrictMode>,
)

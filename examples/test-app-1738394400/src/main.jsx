import React from 'react'
import ReactDOM from 'react-dom/client'
import { initAgentAware } from '@reskill/agent-aware'
import App from './App'
import './App.css'

initAgentAware({ debug: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './global.css'
import './i18n'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { initializeSocket } from './utils/socket.js'

// Socket bağlantısını başlat
initializeSocket();

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SocketProvider } from "./contexts/SocketContext";

createRoot(document.getElementById('root')).render(

  <SocketProvider>  {/* ✅ Wrap entire app with the provider */}
    <App />
  </SocketProvider>

)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'
import { FrameProvider } from './context/FrameContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <FrameProvider>
          <App />
        </FrameProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
)

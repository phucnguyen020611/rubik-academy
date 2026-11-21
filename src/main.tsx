import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './pages.css'
import './screens.css'
import App from './App'
import { ThemeProvider } from './theme'
import { LangProvider } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <App />
      </BrowserRouter>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
 

import { BrowserRouter } from 'react-router-dom';
import { RbacProvider } from './pages/context/RbacContext.jsx';
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <RbacProvider>
        <App />
      </RbacProvider>
    </BrowserRouter>
  </StrictMode>,
)
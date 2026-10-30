import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#121F38',
            color: '#F0F6FF',
            border: '1px solid #1E3A6E',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          },
          success: {
            iconTheme: { primary: '#34D399', secondary: '#121F38' },
          },
          error: {
            iconTheme: { primary: '#F87171', secondary: '#121F38' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)


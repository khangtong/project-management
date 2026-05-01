import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './store/AuthContext'
import App from './App.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              success: {
                style: {
                  background: '#fff',
                  color: '#2C2C2C',
                  borderRadius: '12px',
                  border: '1px solid #A0D995',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  fontSize: '14px',
                  padding: '12px 16px',
                },
                iconTheme: { primary: '#A0D995', secondary: '#fff' },
              },
              error: {
                style: {
                  background: '#fff',
                  color: '#2C2C2C',
                  borderRadius: '12px',
                  border: '1px solid #FCA5A5',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  fontSize: '14px',
                  padding: '12px 16px',
                },
                iconTheme: { primary: '#EF4444', secondary: '#fff' },
              },
              loading: {
                style: {
                  background: '#fff',
                  color: '#2C2C2C',
                  borderRadius: '12px',
                  border: '1px solid #E8D5B0',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  fontSize: '14px',
                  padding: '12px 16px',
                },
              },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
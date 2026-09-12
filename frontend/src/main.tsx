import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { Toaster } from 'react-hot-toast'
import '@rainbow-me/rainbowkit/styles.css'

import App from './App'
import './index.css'
import { wagmiConfig } from './lib/wagmi'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
})

function AppShell() {
  const { theme } = useTheme()

  return (
    <RainbowKitProvider
      theme={
        theme === 'light'
          ? lightTheme({
              accentColor: '#b45309',
              accentColorForeground: '#f8f6fc',
              borderRadius: 'large',
              fontStack: 'system',
              overlayBlur: 'small',
            })
          : darkTheme({
              accentColor: '#f59e0b',
              accentColorForeground: '#0a0612',
              borderRadius: 'large',
              fontStack: 'system',
              overlayBlur: 'small',
            })
      }
      modalSize="compact"
    >
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-card)',
              color: 'var(--color-bright)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#f59e0b', secondary: theme === 'light' ? '#fff' : '#0a0612' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </RainbowKitProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AppShell />
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </React.StrictMode>
)

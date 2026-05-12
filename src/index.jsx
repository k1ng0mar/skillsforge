import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available. Reload?')) updateSW(true)
  },
  onOfflineReady() {
    console.log('App ready to work offline')
  },
})

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const Root = clerkKey
  ? (
    <ClerkProvider publishableKey={clerkKey}>
      <App clerkAuth={true} />
    </ClerkProvider>
  )
  : <App clerkAuth={false} />

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {Root}
  </React.StrictMode>
)

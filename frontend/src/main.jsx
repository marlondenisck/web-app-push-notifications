import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

const SW_UPDATE_INTERVAL_MS = 10000 // Verifica por atualizações a cada 10 segundos

function setupAutoServiceWorkerUpdates(registration) {
  let refreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) {
      return
    }

    refreshing = true
    window.location.reload()
  })

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing

    if (!installingWorker) {
      return
    }

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        console.log('Nova versão do Service Worker instalada e ativada automaticamente')
      }
    })
  })

  const checkForUpdates = () => {
    registration.update().catch((error) => {
      console.error('Erro ao verificar atualização do service worker:', error)
    })
  }

  checkForUpdates()
  setInterval(checkForUpdates, SW_UPDATE_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates()
    }
  })

  window.addEventListener('online', checkForUpdates)
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Verifica se o navegador suporta Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker registrado com sucesso:', registration)

      setupAutoServiceWorkerUpdates(registration)
      
      // Aguarda o service worker estar pronto
      await navigator.serviceWorker.ready
      console.log('Service Worker está ativo e pronto')
      
      try {
        // Verifica se o usuário já está inscrito
        let subscription = await registration.pushManager.getSubscription()
        
        // Obtém a chave pública VAPID
        const response = await fetch('http://localhost:3001/push/public-key')

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const publicKey = await response.text()
        const publicKeyUint8 = urlBase64ToUint8Array(publicKey)
        const storedPublicKey = localStorage.getItem('vapidPublicKey')

        // Se a chave mudou, forca nova inscricao para evitar VAPID mismatch
        if (subscription && storedPublicKey && storedPublicKey !== publicKey) {
          await subscription.unsubscribe()
          subscription = null
        }

        // Se não estiver inscrito, solicita a inscrição
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKeyUint8
          })

          console.log('Usuário inscrito com sucesso:', subscription)
        }

        localStorage.setItem('vapidPublicKey', publicKey)

        await axios.post('http://localhost:3001/push/register', subscription)
        console.log('Subscription registrada no backend com sucesso')

        // Removido envio automático de notificação
        // Para enviar notificações, use o botão "Teste via Service Worker" ou chame a rota /push/send
      } catch (error) {
        console.error('Erro na configuração das push notifications:', error)
      }
    } catch (error) {
      console.error('Erro ao registrar service worker:', error)
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

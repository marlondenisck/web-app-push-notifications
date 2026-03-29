import { getVapidPublicKey, registerPushSubscription } from './apiService'

const SW_UPDATE_INTERVAL_MS = 10000 // Verifica atualizações a cada 10 segundos

// Converte uma string Base64 URL-safe para Uint8Array, formato exigido pela Push API
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// Garante que o usuário está inscrito no push: cria uma nova inscrição se necessário
// e a registra no backend. Também lida com troca de chave VAPID.
export async function ensurePushSubscription() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('ServiceWorker não é suportado neste navegador')
  }

  if (!('PushManager' in window)) {
    throw new Error('Push API não é suportada neste navegador')
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  const { data: publicKey } = await getVapidPublicKey()
  const storedPublicKey = localStorage.getItem('vapidPublicKey')

  // Se a chave VAPID mudou, força nova inscrição para evitar mismatch
  if (subscription && storedPublicKey && storedPublicKey !== publicKey) {
    await subscription.unsubscribe()
    subscription = null
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  localStorage.setItem('vapidPublicKey', publicKey)
  await registerPushSubscription(subscription)

  return subscription
}

// Configura a verificação periódica de atualizações do Service Worker
// e recarrega a página automaticamente quando uma nova versão é ativada
function setupAutoUpdates(registration) {
  let refreshing = false

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing
    if (!installingWorker) return

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
    if (document.visibilityState === 'visible') checkForUpdates()
  })
  window.addEventListener('online', checkForUpdates)
}

// Registra o Service Worker no navegador e inicializa a inscrição push após o carregamento da página
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker registrado com sucesso:', registration)

      setupAutoUpdates(registration)

      await navigator.serviceWorker.ready
      console.log('Service Worker está ativo e pronto')

      try {
        await ensurePushSubscription()
        console.log('Subscription registrada no backend com sucesso')
      } catch (error) {
        console.error('Erro na configuração das push notifications:', error)
      }
    } catch (error) {
      console.error('Erro ao registrar service worker:', error)
    }
  })
}

import MrRobotSvg from '../assets/mr-robot.svg'

// Detecta o nome do navegador atual com base no userAgent
export function detectBrowser() {
  const ua = navigator.userAgent

  if (ua.indexOf('Edg') > -1) return 'Microsoft Edge'
  if (ua.indexOf('Chrome') > -1) return 'Google Chrome'
  if (ua.indexOf('Firefox') > -1) return 'Firefox'
  if (ua.indexOf('Safari') > -1) return 'Safari'

  return 'seu navegador'
}

// Solicita permissão para exibir notificações ao usuário.
// Chama o callback `onGranted` caso a permissão seja concedida.
export async function requestNotificationPermission(onGranted) {
  if (!('Notification' in window)) {
    alert('Este navegador não suporta notificações')
    return null
  }

  if (Notification.permission === 'denied') {
    console.log('Permissão para notificações já está bloqueada')
    return 'denied'
  }

  // Compatibilidade com Edge: às vezes retorna Promise, outras vezes valor direto
  const permission = await (
    typeof Notification.requestPermission === 'function'
      ? Notification.requestPermission()
      : new Promise((resolve) => Notification.requestPermission(resolve))
  )

  if (permission === 'granted') {
    console.log('Permissão para notificações concedida')
    if (onGranted) await onGranted()
  } else if (permission === 'denied') {
    console.log('Permissão para notificações negada')
  } else {
    console.log('Permissão para notificações foi adiada pelo usuário')
  }

  return permission
}

// Dispara uma notificação simples diretamente pela API do navegador (sem Service Worker)
export function testSimpleNotification() {
  new Notification('Teste de Notificação', {
    body: 'Esta é uma notificação simples de teste!',
    icon: MrRobotSvg,
  })
}

// Dispara uma notificação através do Service Worker registrado,
// permitindo que funcione mesmo com a aba em segundo plano
export async function testServiceWorkerNotification() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('ServiceWorker não é suportado neste navegador')
  }

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification('Teste via Service Worker', {
    body: 'Esta notificação foi enviada pelo Service Worker!',
    tag: 'test-notification',
    data: { url: window.location.href },
  })

  console.log('Notificação do service worker enviada com sucesso')
}

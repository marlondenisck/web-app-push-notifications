console.log('SERVICE WORKER: Registrado (frontend/public/service-worker.js)');

// Evento de instalação
self.addEventListener('install', function() {
  console.log('SERVICE WORKER: Instalado');
  // Força a ativação imediata do service worker
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', function(event) {
  console.log('SERVICE WORKER: Ativado');
  // Garante que o service worker controle todas as páginas imediatamente
  event.waitUntil(self.clients.claim());
});

// Evento de push - recebe notificações
self.addEventListener('push', function(event) {
  console.log('SERVICE WORKER: Push recebido', event);  

  const payload = event.data ? event.data.text() : 'Nova notificação';
  console.log(payload)

  event.waitUntil(
    self.registration.showNotification(
      payload
    )
  );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('SERVICE WORKER: Clique na notificação', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Abrir ou focar na janela da aplicação
  // event.waitUntil(
  //   self.clients.matchAll({ type: 'window' }).then(function(clientList) {
  //     for (let i = 0; i < clientList.length; i++) {
  //       const client = clientList[i];
  //       if (client.url === event.notification.data.url && 'focus' in client) {
  //         return client.focus();
  //       }
  //     }
  //     if (self.clients.openWindow) {
  //       return self.clients.openWindow(event.notification.data.url);
  //     }
  //   })
  // );
});
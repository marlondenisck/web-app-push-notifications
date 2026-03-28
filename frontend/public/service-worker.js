console.log('SERVICE WORKER: Registrado (frontend/public/service-worker.js)');

// Evento de instalação
self.addEventListener('install', function(event) {
  console.log('SERVICE WORKER: Instalado');
  // Força a ativação imediata do service worker
  event.waitUntil(self.skipWaiting());
});

// Evento de ativação
self.addEventListener('activate', function(event) {
  console.log('SERVICE WORKER: Ativado');
  // Garante que o service worker controle todas as páginas imediatamente
  event.waitUntil(self.clients.claim());
});

// Evento de push - recebe notificações..
self.addEventListener('push', function(event) {
  console.log('SERVICE WORKER: Push recebido', event);  

  const defaultNotification = {
    title: 'Nova notificação',
    body: '',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: {
      url: '/'
    }
  };

  let notificationData = defaultNotification;

  if (event.data) {
    try {
      const parsed = event.data.json();
      notificationData = {
        ...defaultNotification,
        ...parsed,
        data: {
          ...defaultNotification.data,
          ...(parsed.data || {})
        }
      };
    } catch (error) {
      notificationData = {
        ...defaultNotification,
        title: event.data.text()
      };
      console.warn('SERVICE WORKER: Payload push nao era JSON, usando texto simples', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data
    })
  );
});

// Evento de clique na notificação
self.addEventListener('notificationclick', function(event) {
  console.log('SERVICE WORKER: Clique na notificação', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = (event.notification && event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];

        if ('focus' in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return Promise.resolve();
    })
  );
});
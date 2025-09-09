import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Verifica se o navegador suporta Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js')
      console.log('Service Worker registrado com sucesso:', registration);
      
      // Aguarda o service worker estar pronto
      await navigator.serviceWorker.ready;
      console.log('Service Worker está ativo e pronto');
      
      try {
        // Verifica se o usuário já está inscrito
        let subscription = await registration.pushManager.getSubscription();
        
        // Se não estiver inscrito, solicita a inscrição
        if (!subscription) {
          // Obtém a chave pública VAPID
          const response = await fetch('http://localhost:3001/push/public-key');
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // Faz a inscrição
          const publicKey = await response.text();
          
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey
          });

          console.log('Usuário inscrito com sucesso:', subscription);
        }

        await axios.post('http://localhost:3001/push/register', subscription);

        setTimeout(() => {
          axios.post('http://localhost:3001/push/send', subscription);
        }, 5000); // Envia notificação após 5 segundos
      } catch (error) {
        console.error('Erro na configuração das push notifications:', error);
      }
    } catch (error) {
      console.error('Erro ao registrar service worker:', error);
    }
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

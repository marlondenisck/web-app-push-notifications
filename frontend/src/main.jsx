import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

navigator.serviceWorker.register('/service-worker.js')
    .then(async(registration) => {
      console.log('Service Worker registrado com sucesso:', registration);
        // Aguarda o service worker estar pronto
        await navigator.serviceWorker.ready;
        
        // verifica se o usuário já está inscrito
        let subscription = await registration.pushManager.getSubscription();
       
        // se não estiver inscrito, solicita a inscrição
        if (!subscription) {
          // obtém a chave pública VAPID
          const response = await fetch('http://localhost:3001/push/public-key');
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          // faz a inscrição
          const publicKey = await response.text();
         
         subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey
          });

          console.log('Usuário inscrito com sucesso:', publicKey, subscription);
        }

        await axios.post('http://localhost:3001/push/register', subscription);

        setTimeout(() => {
          axios.post('http://localhost:3001/push/send', subscription);
        }, 5000); // Envia notificação após 5 segundos
  })
    

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

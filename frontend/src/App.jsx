import { useState, useEffect } from 'react'
import axios from 'axios'

import './App.css'
import MrRobotSvg from './assets/mr-robot.svg'

function App() {
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission)
  const [permissionBlocked, setPermissionBlocked] = useState(Notification.permission === 'denied')
  const [browserInfo, setBrowserInfo] = useState('')

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
  }
  
  // Detecta o navegador atual para instruções específicas
  useEffect(() => {
    const ua = navigator.userAgent
    let browserName = "seu navegador"
    
    if (ua.indexOf("Edg") > -1) browserName = "Microsoft Edge"
    else if (ua.indexOf("Chrome") > -1) browserName = "Google Chrome"
    else if (ua.indexOf("Firefox") > -1) browserName = "Firefox"
    else if (ua.indexOf("Safari") > -1) browserName = "Safari"
    
    setBrowserInfo(browserName)
  }, [])

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações')
      return
    }

    try {
      // Verificar se as permissões já estão bloqueadas antes de solicitar
      if (Notification.permission === 'denied') {
        setPermissionBlocked(true)
        console.log('Permissão para notificações já está bloqueada')
        return
      }
      
      // Melhorando a compatibilidade com o Edge
      // No Edge, às vezes o método retorna uma Promise, outras vezes um valor direto
      const permission = await (
        typeof Notification.requestPermission === 'function' 
          ? Notification.requestPermission() 
          : new Promise((resolve) => Notification.requestPermission(resolve))
      )
      
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        console.log('Permissão para notificações concedida')
        setPermissionBlocked(false)
        
        // Vamos garantir que o service worker está registrado
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.ready
            console.log('Service worker está pronto')
          } catch (error) {
            console.error('Erro ao verificar service worker:', error)
          }
        }
      } else if (permission === 'denied') {
        console.log('Permissão para notificações negada')
        setPermissionBlocked(true)
      } else {
        console.log('Permissão para notificações foi adiada pelo usuário')
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error)
      alert('Ocorreu um erro ao solicitar permissão para notificações')
    }
  }

  const testNotification = () => {
    if (notificationPermission !== 'granted') {
      alert('Permissão para notificações não foi concedida')
      return
    }

    // Teste de notificação simples
    /** 
      Contexto: Executa no contexto da aba/página ativa
      Limitações:
        Só funciona enquanto a aba estiver aberta
        Se o usuário fechar a aba, não pode mais enviar notificações
        Não persiste se a página for recarregada
      Uso: Notificações imediatas e simples
     */
    new Notification('Teste de Notificação', {
      body: 'Esta é uma notificação simples de teste!',
      icon: MrRobotSvg
    })
  }

  const testServiceWorkerNotification = async () => {
    if (notificationPermission !== 'granted') {
      alert('Permissão para notificações não foi concedida')
      return
    }

    /**
        Contexto: Executa em background, independente da página
        Vantagens:
          Funciona mesmo com a aba fechada
          Persiste entre sessões do navegador
          Pode receber push notifications do servidor
          Permite ações customizadas (botões na notificação)
          Suporta notificações offline
     */
    try {
      // Verificar se o service worker está disponível
      if (!('serviceWorker' in navigator)) {
        alert('ServiceWorker não é suportado neste navegador')
        return
      }

      // Garantir que o service worker está registrado e ativo
      const registration = await navigator.serviceWorker.ready
      console.log('Service worker pronto para enviar notificação:', registration)
      
      // Enviar a notificação através do service worker
      await registration.showNotification('Teste via Service Worker', {
        body: 'Esta notificação foi enviada pelo Service Worker!',
        icon: MrRobotSvg,
        tag: 'test-notification', // Ajuda a prevenir múltiplas notificações iguais
        requireInteraction: true, // Mantém a notificação até o usuário interagir
        vibrate: [100, 50, 100], // Padrão de vibração (ms)
        data: {
          url: window.location.href // URL para abrir quando clicar na notificação
        }
      })
      
      console.log('Notificação do service worker enviada com sucesso')
    } catch (error) {
      console.error('Erro ao enviar notificação via service worker:', error)
      alert('Erro ao enviar notificação via Service Worker: ' + error.message)
    }
  }

  // Verificar o status das permissões de notificação ao carregar o componente
  useEffect(() => {
    // Verificar se o navegador suporta notificações
    if ('Notification' in window) {
      const currentPermission = Notification.permission
      setNotificationPermission(currentPermission)
      
      // Atualizar o estado se as permissões já estiverem negadas
      if (currentPermission === 'denied') {
        setPermissionBlocked(true)
        console.log('Permissões de notificação já estão bloqueadas')
      }
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await axios.get('http://localhost:3001/')
        setApiData(response.data)
        setError(null)
      } catch (err) {
        setError('Erro ao conectar com a API: ' + err.message)
        setApiData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleRefresh = () => {
    setApiData(null)
    setError(null)
    setLoading(true)
    
    axios.get('http://localhost:3001/')
      .then(response => {
        setApiData(response.data)
        setError(null)
      })
      .catch(err => {
        setError('Erro ao conectar com a API: ' + err.message)
        setApiData(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  return (
    <>
      <div className="card">
        <h2>Dados da API:</h2>
        
        {loading && <p>Carregando...</p>}
        
        {error && (
          <div style={{ color: 'red', margin: '10px 0' }}>
            <p>{error}</p>
          </div>
        )}
        
        {apiData && (
          <div style={{ 
            background: '#f0f0f0', 
            padding: '15px', 
            borderRadius: '8px', 
            margin: '10px 0',
            color: '#333'
          }}>
            <p><strong>Mensagem:</strong> {apiData.message}</p>
            <p><strong>Timestamp:</strong> {formatTimestamp(apiData.timestamp)}</p>
            <p><strong>Status:</strong> {apiData.status}</p>
          </div>
        )}
        
        <button onClick={handleRefresh} disabled={loading}>
          {loading ? 'Carregando...' : 'Atualizar Dados'}
        </button>
        
        <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
          <h3>Teste de Notificações</h3>
          
          <p>Status da permissão: <strong>{notificationPermission}</strong></p>
          
          {permissionBlocked && (
            <div style={{ 
              background: '#fff3cd', 
              color: '#856404', 
              padding: '15px', 
              borderRadius: '5px', 
              marginBottom: '15px',
              border: '1px solid #ffeeba'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>🚫 Permissões de notificação bloqueadas</h4>
              <p>
                As notificações foram bloqueadas porque os prompts de permissão foram ignorados várias vezes.
              </p>
              <p>
                <strong>Para desbloquear no {browserInfo}:</strong>
                {browserInfo === "Microsoft Edge" && (
                  <span>
                    Clique no ícone de cadeado ou ícone de ajuste (🔒) ao lado da URL, 
                    selecione "Configurações do site" e altere a configuração de notificações para "Permitir".
                  </span>
                )}
                {browserInfo === "Google Chrome" && (
                  <span>
                    Clique no ícone de cadeado (🔒) ao lado da URL, 
                    selecione "Configurações do site" e altere a configuração de notificações para "Permitir".
                  </span>
                )}
                {browserInfo === "Firefox" && (
                  <span>
                    Clique no ícone de cadeado (🔒) ao lado da URL, 
                    clique no "X" ao lado de "Bloquear notificações" para removê-lo.
                  </span>
                )}
                {browserInfo === "Safari" && (
                  <span>
                    Abra as Preferências do Safari → Websites → Notificações e altere as permissões para este site.
                  </span>
                )}
                {!["Microsoft Edge", "Google Chrome", "Firefox", "Safari"].includes(browserInfo) && (
                  <span>
                    Verifique as configurações de notificação nas preferências do site ou nas configurações de privacidade do navegador.
                  </span>
                )}
              </p>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button onClick={requestNotificationPermission}>
              Solicitar Permissão
            </button>
            
            <button onClick={testNotification} disabled={notificationPermission !== 'granted'}>
              Teste Notificação Simples
            </button>
            
            <button onClick={testServiceWorkerNotification} disabled={notificationPermission !== 'granted'}>
              Teste via Service Worker
            </button>
          </div>
        </div>
        
      
      </div>
    </>
  )
}

export default App

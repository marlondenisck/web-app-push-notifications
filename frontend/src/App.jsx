import { useState, useEffect } from 'react'

import './App.css'
import { fetchApiStatus } from './services/apiService'
import { ensurePushSubscription } from './services/serviceWorkerService'
import {
  detectBrowser,
  requestNotificationPermission,
  testSimpleNotification,
  testServiceWorkerNotification,
} from './services/notificationService'

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

function App() {
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission)
  const [permissionBlocked, setPermissionBlocked] = useState(Notification.permission === 'denied')
  const [browserInfo, setBrowserInfo] = useState('')

  useEffect(() => {
    setBrowserInfo(detectBrowser())
  }, [])

  useEffect(() => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission
      setNotificationPermission(currentPermission)
      if (currentPermission === 'denied') {
        setPermissionBlocked(true)
        console.log('Permissões de notificação já estão bloqueadas')
      }
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetchApiStatus()
        setApiData(response.data)
        setError(null)
      } catch (err) {
        setError('Erro ao conectar com a API: ' + err.message)
        setApiData(null)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleRefresh = async () => {
    setApiData(null)
    setError(null)
    setLoading(true)

    try {
      const response = await fetchApiStatus()
      setApiData(response.data)
      setError(null)
    } catch (err) {
      setError('Erro ao conectar com a API: ' + err.message)
      setApiData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestPermission = async () => {
    try {
      const permission = await requestNotificationPermission(async () => {
        try {
          await ensurePushSubscription()
          console.log('Subscription push registrada com sucesso')
        } catch (err) {
          console.error('Erro ao verificar service worker:', err)
          alert('Permissão concedida, mas houve um erro ao registrar o push no backend: ' + err.message)
        }
      })

      if (permission) {
        setNotificationPermission(permission)
        setPermissionBlocked(permission === 'denied')
      }
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err)
      alert('Ocorreu um erro ao solicitar permissão para notificações')
    }
  }

  const handleTestSimpleNotification = () => {
    if (notificationPermission !== 'granted') {
      alert('Permissão para notificações não foi concedida')
      return
    }
    testSimpleNotification()
  }

  const handleTestServiceWorkerNotification = async () => {
    if (notificationPermission !== 'granted') {
      alert('Permissão para notificações não foi concedida')
      return
    }

    try {
      await testServiceWorkerNotification()
    } catch (err) {
      console.error('Erro ao enviar notificação via service worker:', err)
      alert('Erro ao enviar notificação via Service Worker: ' + err.message)
    }
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
            color: '#333',
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
              border: '1px solid #ffeeba',
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>🚫 Permissões de notificação bloqueadas</h4>
              <p>
                As notificações foram bloqueadas porque os prompts de permissão foram ignorados várias vezes.
              </p>
              <p>
                <strong>Para desbloquear no {browserInfo}:</strong>
                {browserInfo === 'Microsoft Edge' && (
                  <span>
                    Clique no ícone de cadeado ou ícone de ajuste (🔒) ao lado da URL,
                    selecione "Configurações do site" e altere a configuração de notificações para "Permitir".
                  </span>
                )}
                {browserInfo === 'Google Chrome' && (
                  <span>
                    Clique no ícone de cadeado (🔒) ao lado da URL,
                    selecione "Configurações do site" e altere a configuração de notificações para "Permitir".
                  </span>
                )}
                {browserInfo === 'Firefox' && (
                  <span>
                    Clique no ícone de cadeado (🔒) ao lado da URL,
                    clique no "X" ao lado de "Bloquear notificações" para removê-lo.
                  </span>
                )}
                {browserInfo === 'Safari' && (
                  <span>
                    Abra as Preferências do Safari → Websites → Notificações e altere as permissões para este site.
                  </span>
                )}
                {!['Microsoft Edge', 'Google Chrome', 'Firefox', 'Safari'].includes(browserInfo) && (
                  <span>
                    Verifique as configurações de notificação nas preferências do site ou nas configurações de privacidade do navegador.
                  </span>
                )}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
            <button onClick={handleRequestPermission}>
              Solicitar Permissão
            </button>

            <button onClick={handleTestSimpleNotification} disabled={notificationPermission !== 'granted'}>
              Teste Notificação Simples
            </button>

            <button onClick={handleTestServiceWorkerNotification} disabled={notificationPermission !== 'granted'}>
              Teste via Service Worker
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default App

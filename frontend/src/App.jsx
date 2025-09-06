import { useState, useEffect } from 'react'
import axios from 'axios'

import './App.css'
import MrRobotSvg from './assets/mr-robot.svg'

function App() {
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission)

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

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações')
      return
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    
    if (permission === 'granted') {
      console.log('Permissão para notificações concedida')
    } else {
      console.log('Permissão para notificações negada')
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
    const registration = await navigator.serviceWorker.ready
    registration.showNotification('Teste via Service Worker', {
      body: 'Esta notificação foi enviada pelo Service Worker!',
      icon: MrRobotSvg,

    })
  }

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

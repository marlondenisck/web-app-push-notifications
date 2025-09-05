import { useState, useEffect } from 'react'
import axios from 'axios'

import './App.css'

function App() {
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        
      
      </div>
    </>
  )
}

export default App

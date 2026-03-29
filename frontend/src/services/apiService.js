import axios from 'axios'

export const API_BASE_URL = 'http://localhost:3001'

// Busca o status atual da API (mensagem, timestamp e status)
export const fetchApiStatus = () =>
  axios.get(`${API_BASE_URL}/`)

// Obtém a chave pública VAPID do servidor para assinar a inscrição push
export const getVapidPublicKey = () =>
  axios.get(`${API_BASE_URL}/push/public-key`, { responseType: 'text' })

// Registra a inscrição push do usuário no backend
export const registerPushSubscription = (subscription) =>
  axios.post(`${API_BASE_URL}/push/register`, subscription)

// Solicita ao backend que dispare uma notificação push para todos os inscritos
export const sendPushNotification = () =>
  axios.post(`${API_BASE_URL}/push/send`)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'https://localhost:5173'],
  credentials: true
}));
app.use(express.json());


// Gerar chaves VAPID uma única vez (em produção, use variáveis de ambiente)
// Gere estas chaves uma vez e salve em variáveis de ambiente
// Você pode gerar usando: npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};


Webpush.setVapidDetails('mailto: contact@my-site.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.get('/push/public-key', (req, res) => {
  res.send(vapidKeys.publicKey);
});

let subscriptions = [];
console.log(subscriptions)
// Rota para salvar uma subscription
app.post('/push/register', (req, res) => {
  const subscription = req.body;
  console.log('SERVICE WORKER: Subscription recebida', subscription);

  subscriptions.push(subscription);

  res.status(201).send();
});

app.post('/push/send', (req, res) => {
  // gravar no banco usuarios logados no subscription
  subscriptions.forEach(subscription => {
    Webpush.sendNotification(subscription, 'Você tem uma nova notificação! vinda do backend');
  });
  return res.status(201).send();
})

// Rota principal
app.get('/', (req, res) => {
  res.json({
    message: 'Hello world!',
    timestamp: new Date().toISOString(),
    status: 200
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
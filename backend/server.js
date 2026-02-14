require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Webpush = require('web-push');
const path = require('path');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// ========== FIX: Proxy Configuration para Web Push ==========
// Remove variaveis de proxy que podem estar apontando para 0.0.0.0:443
const proxyEnvKeys = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy'];
const removedProxies = [];
proxyEnvKeys.forEach(key => {
  if (process.env[key]) {
    removedProxies.push(`${key}=${process.env[key]}`);
    delete process.env[key];
  }
});

if (removedProxies.length > 0) {
  console.warn('⚠ Proxy(s) removido(s) para evitar ECONNREFUSED 0.0.0.0:443:', removedProxies.join(', '));
}

// Force global HTTPS/HTTP agents sem proxy
https.globalAgent = new https.Agent({
  keepAlive: true,
  rejectUnauthorized: true
});

http.globalAgent = new http.Agent({
  keepAlive: true
});
// ========== FIM FIX ==========

// Configurar EJS como view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// Validar se as chaves VAPID estão configuradas
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.error('ERRO: Chaves VAPID não configuradas! Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY no arquivo .env');
  process.exit(1);
}

Webpush.setVapidDetails(
  'mailto:contact@my-site.com', 
  vapidKeys.publicKey, 
  vapidKeys.privateKey
);

console.log('✓ Chaves VAPID configuradas corretamente');

app.get('/push/public-key', (req, res) => {
  res.send(vapidKeys.publicKey);
});

let subscriptions = [];
let subscriptionIdCounter = 1;

function getWebPushErrorDetails(error) {
  const statusCode = error && error.statusCode ? error.statusCode : 500;
  const message = error && error.message ? error.message : 'Erro ao enviar notificacao';
  const body = error && error.body ? error.body : undefined;
  const code = error && error.code ? error.code : undefined;
  const syscall = error && error.syscall ? error.syscall : undefined;
  const address = error && error.address ? error.address : undefined;
  const port = error && error.port ? error.port : undefined;

  return { statusCode, message, body, code, syscall, address, port };
}

// Rota para salvar uma subscription
app.post('/push/register', (req, res) => {
  const subscription = req.body;
  console.log('SERVICE WORKER: Subscription recebida', subscription);

  // Verificar se a subscription já existe (evitar duplicatas)
  const existingIndex = subscriptions.findIndex(
    sub => sub.endpoint === subscription.endpoint
  );

  if (existingIndex === -1) {
    // Adicionar ID único à subscription
    const subscriptionWithId = {
      id: subscriptionIdCounter++,
      ...subscription
    };
    subscriptions.push(subscriptionWithId);
    console.log(`✓ Nova subscription registrada com ID #${subscriptionWithId.id}. Total: ${subscriptions.length}`);
  } else {
    console.log(`⚠ Subscription já existe com ID #${subscriptions[existingIndex].id}. Total mantido: ${subscriptions.length}`);
  }

  res.status(201).json({ 
    message: 'Subscription registrada com sucesso',
    total: subscriptions.length
  });
});

app.post('/push/send', async (req, res) => {
  try {
    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'Nenhuma subscription registrada' });
    }

    console.log(`Enviando notificação para ${subscriptions.length} subscription(s)`);
    
    // Enviar notificações e capturar erros individuais
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription, index) => {
        try {
          await Webpush.sendNotification(
            subscription, 
            'Você tem uma nova notificação! vinda do backend'
          );
          console.log(`✓ Notificação enviada para subscription ${index + 1}`);
          return { success: true, index };
        } catch (error) {
          console.error(`✗ Erro ao enviar para subscription ${index + 1}:`, error.message);
          
          // Se a subscription expirou ou é inválida (410 Gone), remove da lista
          if (error.statusCode === 410) {
            console.log(`Removendo subscription ${index + 1} (expirada)`);
            return { success: false, index, remove: true };
          }
          
          return { success: false, index, error: error.message };
        }
      })
    );

    // Remover subscriptions inválidas
    const indicesToRemove = results
      .filter(result => result.value?.remove)
      .map(result => result.value.index)
      .sort((a, b) => b - a); // Ordenar em ordem decrescente para remover corretamente
    
    indicesToRemove.forEach(index => subscriptions.splice(index, 1));

    const successful = results.filter(r => r.value?.success).length;
    const failed = results.filter(r => !r.value?.success).length;

    console.log(`Resultado: ${successful} enviada(s), ${failed} falha(s)`);
    
    return res.status(200).json({ 
      message: 'Processo concluído',
      successful,
      failed,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Erro ao processar envio de notificações:', error);
    return res.status(500).json({ error: 'Erro ao enviar notificações' });
  }
})

// Rota para enviar notificação para uma subscription específica por ID
app.post('/push/send/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const subscription = subscriptions.find(sub => sub.id === id);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription não encontrada' });
    }

    console.log(`Enviando notificação para subscription #${id}`);
    console.log(`  Endpoint: ${subscription.endpoint.substring(0, 80)}...`);
    console.log(`  User-Agent habitual: ${subscription.endpoint.includes('fcm') ? 'Chrome/Brave (FCM)' : subscription.endpoint.includes('apple') ? 'Safari (APNs)' : 'Firefox/Outro'}`);

    try {
      await Webpush.sendNotification(
        subscription,
        'Você tem uma nova notificação! 🔔'
      );
      console.log(`✓ Notificação enviada para subscription #${id}`);
      return res.status(200).json({ 
        message: 'Notificação enviada com sucesso',
        id
      });
    } catch (error) {
      const errorDetails = getWebPushErrorDetails(error);
      console.error(`✗ Erro ao enviar para subscription #${id}:`, errorDetails.message);
      if (errorDetails.code) console.error(`  Code: ${errorDetails.code}`);
      if (errorDetails.syscall) console.error(`  Syscall: ${errorDetails.syscall}`);
      if (errorDetails.address) console.error(`  Address: ${errorDetails.address}:${errorDetails.port || '?'}`);
      if (errorDetails.body) console.error(`  Body: ${errorDetails.body}`);
      
      // Se a subscription expirou, remove da lista
      if (error.statusCode === 410) {
        const index = subscriptions.findIndex(sub => sub.id === id);
        if (index !== -1) {
          subscriptions.splice(index, 1);
          console.log(`Subscription #${id} removida (expirada)`);
        }
        return res.status(410).json({ 
          error: 'Subscription expirada e foi removida',
          removed: true
        });
      }
      
      return res.status(errorDetails.statusCode).json({ 
        error: errorDetails.message,
        statusCode: errorDetails.statusCode
      });
    }
  } catch (error) {
    console.error('Erro ao processar envio:', error);
    return res.status(500).json({ error: 'Erro ao processar envio' });
  }
});

app.get('/push/send/:id', (req, res) => {
  return res.status(405).json({
    error: 'Metodo nao permitido. Use POST em /push/send/:id'
  });
});

// Rota para enviar notificação de teste para uma subscription específica
app.post('/push/test/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const subscription = subscriptions.find(sub => sub.id === id);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription não encontrada' });
    }

    console.log(`Enviando notificação de teste para subscription #${id}`);

    try {
      await Webpush.sendNotification(
        subscription,
        JSON.stringify({
          title: '🧪 Teste de Notificação',
          body: `Esta é uma notificação de teste para subscription #${id}`,
          icon: '🔔',
          timestamp: new Date().toISOString()
        })
      );
      console.log(`✓ Notificação de teste enviada para subscription #${id}`);
      return res.status(200).json({ 
        message: 'Notificação de teste enviada',
        id
      });
    } catch (error) {
      console.error(`✗ Erro ao enviar teste para subscription #${id}:`, error.message);
      
      if (error.statusCode === 410) {
        const index = subscriptions.findIndex(sub => sub.id === id);
        if (index !== -1) {
          subscriptions.splice(index, 1);
          console.log(`Subscription #${id} removida (expirada)`);
        }
        return res.status(410).json({ 
          error: 'Subscription expirada e foi removida',
          removed: true
        });
      }
      
      return res.status(500).json({ error: error.message });
    }
  } catch (error) {
    console.error('Erro ao processar teste:', error);
    return res.status(500).json({ error: 'Erro ao processar teste' });
  }
});

// Rota para remover uma subscription específica
app.delete('/push/subscription/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const index = subscriptions.findIndex(sub => sub.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Subscription não encontrada' });
    }

    subscriptions.splice(index, 1);
    console.log(`✓ Subscription #${id} removida. Total: ${subscriptions.length}`);

    return res.status(200).json({ 
      message: 'Subscription removida com sucesso',
      id,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Erro ao remover subscription:', error);
    return res.status(500).json({ error: 'Erro ao remover subscription' });
  }
});

// Rota para limpar todas as subscriptions
app.delete('/push/subscriptions', (req, res) => {
  try {
    const count = subscriptions.length;
    subscriptions = [];
    subscriptionIdCounter = 1;
    console.log(`✓ Todas as ${count} subscription(s) foram removidas`);

    return res.status(200).json({ 
      message: 'Todas as subscriptions foram removidas',
      removed: count
    });
  } catch (error) {
    console.error('Erro ao limpar subscriptions:', error);
    return res.status(500).json({ error: 'Erro ao limpar subscriptions' });
  }
});

// Rota da dashboard
app.get('/dashboard', (req, res) => {
  res.render('dashboard', { subscriptions });
});

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
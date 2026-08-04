// servidor-asaas.js — COMPLETO E ATUALIZADO
const http = require('http');
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';
const ASAAS_TOKEN = process.env.ASAAS_API_TOKEN;

// Validação inicial
if (!ASAAS_TOKEN) {
  console.error('❌ ERRO: Configure ASAAS_API_TOKEN nas variáveis do Render!');
  process.exit(1);
}
console.log('✅ Servidor Asaas carregado com sucesso!');

const servidor = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ==============================================
  // ROTA 1: Consultar dados da chave Pix
  // ==============================================
  if (req.method === 'POST' && req.url === '/consultar-chave') {
    let corpo = '';
    req.on('data', p => corpo += p);
    req.on('end', async () => {
      try {
        const { chave } = JSON.parse(corpo);
        if (!chave) throw new Error('Chave Pix não informada');

        const resposta = await fetch(`${ASAAS_BASE_URL}/pix/addressKeys/external?key=${encodeURIComponent(chave)}`, {
          headers: { 'access_token': ASAAS_TOKEN }
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          return res.end(JSON.stringify({
            sucesso: false,
            erro: dados.errors?.[0]?.description || 'Chave Pix não encontrada'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          dados: {
            nome: dados.ownerName || 'Não informado',
            cpfCnpj: dados.cpfCnpj || 'Não informado',
            instituicao: dados.institutionName || 'Não informado',
            tipo: dados.type || 'Não informado'
          }
        }));

      } catch (erro) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: false, erro: erro.message }));
      }
    });
    return;
  }

  // ==============================================
  // ROTA 2: Enviar Pix
  // ==============================================
  if (req.method === 'POST' && req.url === '/enviar-pix') {
    let corpo = '';
    req.on('data', p => corpo += p);
    req.on('end', async () => {
      try {
        const { valor, chavePix } = JSON.parse(corpo);
        if (!valor || !chavePix) throw new Error('Valor e chave são obrigatórios');

        const resposta = await fetch(`${ASAAS_BASE_URL}/transfers`, {
          method: 'POST',
          headers: {
            'access_token': ASAAS_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: Number(valor),
            pixAddressKey: chavePix,
            operationType: 'PIX'
          })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
          return res.end(JSON.stringify({
            sucesso: false,
            erro: dados.errors?.[0]?.description || 'Erro ao processar envio'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: true, dados }));

      } catch (erro) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: false, erro: erro.message }));
      }
    });
    return;
  }

  // ==============================================
  // ROTA 3: Consultar saldo
  // ==============================================
  if (req.method === 'GET' && req.url === '/saldo-asaas') {
    (async () => {
      try {
        const resposta = await fetch(`${ASAAS_BASE_URL}/balance`, {
          headers: { 'access_token': ASAAS_TOKEN }
        });
        const dados = await resposta.json();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(dados));
      } catch (erro) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ erro: erro.message }));
      }
    })();
    return;
  }

  // Rota não encontrada
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ erro: 'Rota não existe' }));
});

const PORTA = process.env.PORT || 3001;
servidor.listen(PORTA, () => console.log(`🚀 Servidor rodando na porta ${PORTA}`));

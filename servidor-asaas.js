// servidor-asaas.js — CORRIGIDO E TESTADO
const http = require('http');
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';
const ASAAS_TOKEN = process.env.ASAAS_API_TOKEN;

if (!ASAAS_TOKEN) {
  console.error('❌ ERRO: Configure ASAAS_API_TOKEN nas variáveis do Render!');
  process.exit(1);
}
console.log('✅ Servidor Asaas carregado!');

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
  // ROTA 1: Identifica tipo da chave Pix (sem consulta externa)
  // ==============================================
  if (req.method === 'POST' && req.url === '/consultar-chave') {
    let corpo = '';
    req.on('data', p => corpo += p);
    req.on('end', async () => {
      try {
        const { chave } = JSON.parse(corpo);
        if (!chave) throw new Error('Informe a chave Pix');

        let tipo = 'Não identificado';
        const limpa = chave.replace(/\D/g, '');

        if (/^[0-9]{11}$/.test(limpa)) tipo = 'CPF';
        else if (/^[0-9]{14}$/.test(limpa)) tipo = 'CNPJ';
        else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)) tipo = 'E-mail';
        else if (/^\+?[0-9]{10,15}$/.test(limpa)) tipo = 'Telefone';
        else if (chave.length === 36 && chave.includes('-')) tipo = 'Chave Aleatória (EVP)';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          dados: {
            tipo,
            chaveInformada: chave,
            aviso: 'Dados do titular só aparecem no comprovante após envio'
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
  // ROTA 2: Enviar Pix (funcionando 100%)
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
            erro: dados.errors?.[0]?.description || 'Erro ao enviar'
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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ erro: 'Rota não existe' }));
});

const PORTA = process.env.PORT || 3001;
servidor.listen(PORTA, () => console.log(`🚀 Servidor Asaas na porta ${PORTA}`));

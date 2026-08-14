// servidor-asaas.js — COMPLETO COM VALIDAÇÃO AUTOMÁTICA
const http = require('http');
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';
const ASAAS_TOKEN = process.env.ASAAS_API_TOKEN;

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

  // =================================================
  // ✅ ROTA 1: VALIDAÇÃO AUTOMÁTICA DE SAQUE (WEBHOOK)
  // =================================================
  if (req.method === 'POST' && req.url === '/validar-saque') {
    let corpo = '';
    req.on('data', p => corpo += p);
    req.on('end', async () => {
      try {
        const dados = JSON.parse(corpo);
        console.log('📩 Asaas pediu autorização — ID:', dados.id || dados.transfer?.id);

        // ✅ SEMPRE AUTORIZA O ENVIO!
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          authorization: true,
          observation: 'Aprovado automaticamente pelo sistema'
        }));

        console.log('✅ AUTORIZADO! Pix liberado.');
      } catch (erro) {
        console.log('❌ Erro na validação:', erro.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authorization: false }));
      }
    });
    return;
  }

  // =================================================
  // ✅ ROTA 2: ENVIAR PIX
  // =================================================
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

        const dadosCompletos = await resposta.json();

        if (!resposta.ok) {
          return res.end(JSON.stringify({
            sucesso: false,
            erro: dadosCompletos.errors?.[0]?.description || 'Erro ao processar'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: true, dados: dadosCompletos }));

      } catch (erro) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: false, erro: erro.message }));
      }
    });
    return;
  }

  // =================================================
  // ✅ ROTA 3: CONSULTAR SALDO
  // =================================================
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
  res.end(JSON.stringify({ erro: 'Rota não encontrada' }));
});

const PORTA = process.env.PORT || 3001;
servidor.listen(PORTA, () => console.log(`🚀 Servidor rodando na porta ${PORTA}`));

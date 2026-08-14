// servidor-asaas.js — VERSÃO FINAL DEFINITIVA ✅
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
  // ✅ ROTA DE CONSULTAR CHAVE PIX (ANTES DE ENVIAR)
  // =================================================
  if (req.method === 'GET' && req.url.startsWith('/consultar-chave')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const chave = url.searchParams.get('chave');

    if (!chave) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sucesso: false, erro: 'Chave é obrigatória' }));
      return;
    }

    function tiposCandidatos(c) {
      const limpa = c.replace(/[\s.-]/g, '');
      if (limpa.includes('@')) return ['EMAIL'];
      const digitos = limpa.replace(/\D/g, '');
      if (/^[0-9]+$/.test(limpa)) {
        if (digitos.length === 11) return ['CPF'];
        if (digitos.length === 14) return ['CNPJ'];
        return ['PHONE'];
      }
      return ['EVP'];
    }

    (async () => {
      try {
        let resposta = null;
        let dados = null;

        for (const tipo of tiposCandidatos(chave)) {
          resposta = await fetch(
            `${ASAAS_BASE_URL}/pix/addressKeys/external?type=${tipo}&key=${encodeURIComponent(chave)}`,
            { headers: { 'access_token': ASAAS_TOKEN } }
          );
          dados = await resposta.json();

          if (resposta.ok) {
            dados.tipoDetectado = tipo;
            break;
          }
        }

        if (!resposta.ok) {
          return res.end(JSON.stringify({
            sucesso: false,
            erro: dados.errors?.[0]?.description || 'Chave não encontrada ou inválida'
          }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sucesso: true,
          key: dados.key,
          tipoDetectado: dados.tipoDetectado,
          owner: dados.owner,
          financialInstitution: dados.financialInstitution,
          ispbName: dados.ispbName
        }));

      } catch (erro) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: false, erro: erro.message }));
      }
    })();
    return;
  }

  // =================================================
  // ✅ ROTA DE VALIDAÇÃO — RESPOSTA EXATA DO ASAAS
  // =================================================
  if (req.method === 'POST' && req.url === '/validar-saque') {
    let corpo = '';
    req.on('data', p => corpo += p);
    req.on('end', async () => {
      try {
        const dados = JSON.parse(corpo);
        console.log('📩 Asaas pediu autorização — ID:', dados.transfer?.id);

        // ✅ RESPOSTA OFICIAL DA DOCUMENTAÇÃO: {"status":"APPROVED"}
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"status":"APPROVED"}');

        console.log('✅ APROVADO! Resposta enviada corretamente.');
      } catch (erro) {
        console.log('❌ Erro:', erro.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"status":"REFUSED"}');
      }
    });
    return;
  }

  // =================================================
  // ✅ ROTA DE ENVIAR PIX
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
  // ✅ ROTA DE CONSULTAR SALDO
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

  res.writeHead(404);
  res.end(JSON.stringify({ erro: 'Rota não encontrada' }));
});

const PORTA = process.env.PORT || 10000;
servidor.listen(PORTA, () => console.log(`🚀 Servidor rodando na porta ${PORTA}`));

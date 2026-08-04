const http = require('http');
const { enviarPix, verSaldo } = require('./asaas.js');

const servidor = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Rota: Enviar Pix
  if (req.method === 'POST' && req.url === '/enviar-pix') {
    let corpo = '';
    req.on('data', pedaco => corpo += pedaco);
    req.on('end', async () => {
      try {
        const { valor, chavePix } = JSON.parse(corpo);
        const resultado = await enviarPix(valor, chavePix);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(resultado));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sucesso: false, erro: 'Dados inválidos' }));
      }
    });
    return;
  }

  // Rota: Ver saldo (CORRIGIDO com async)
  if (req.method === 'GET' && req.url === '/saldo-asaas') {
    (async () => {
      const saldo = await verSaldo();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(saldo));
    })();
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ erro: 'Rota não existe' }));
});

const PORTA = process.env.PORT || 3001;
servidor.listen(PORTA, () => console.log(`🚀 Servidor Asaas rodando na porta ${PORTA}`));

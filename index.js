const http = require('http');

// 🔑 COLE SEU TOKEN DO MERCADO PAGO AQUI:
const MERCADO_PAGO_TOKEN = 'APP_USR-2461833704045856-062814-633b78c8147ff3a18f71ca6e785f49fa-3502536472';

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Use POST' }));
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { nome, valor } = JSON.parse(body);

            if (!nome || !valor) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Nome e valor são obrigatórios' }));
                return;
            }

            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: [{
                        title: `Mensalidade - ${nome}`,
                        quantity: 1,
                        currency_id: 'BRL',
                        unit_price: parseFloat(valor)
                    }],
                    external_reference: nome
                })
            });

            const data = await response.json();

            if (data.init_point) {
                res.writeHead(200);
                res.end(JSON.stringify({ link: data.init_point }));
            } else {
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Erro ao gerar link' }));
            }
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Erro interno' }));
        }
    });
});

server.listen(10000, () => {
    console.log('✅ Servidor rodando na porta 10000');
});

const http = require('http');

// 🔑 SEU TOKEN DO MERCADO PAGO
const MERCADO_PAGO_TOKEN = 'APP_USR-2461833704045856-062814-633b78c8147ff3a18f71ca6e785f49fa-3502536472';

const server = http.createServer(async (req, res) => {
    // CORS
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

            console.log(`🔄 Gerando link PIX para: ${nome} - R$ ${valor}`);

            // ===== CRIA PREFERÊNCIA COM PIX =====
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
                    // 🔥 CONFIGURAÇÃO CORRETA PARA PIX
                    payment_methods: {
                        excluded_payment_methods: [
                            { id: 'master' },
                            { id: 'visa' },
                            { id: 'amex' },
                            { id: 'hipercard' },
                            { id: 'elo' },
                            { id: 'diners' }
                            // ⚠️ NÃO REMOVA O TICKET (BOLETO) SE QUISER MANTER
                            // MAS SE QUISER SÓ PIX, REMOVA TUDO E DEIXE ASSIM:
                        ],
                        excluded_payment_types: [
                            { id: 'credit_card' },
                            { id: 'debit_card' },
                            { id: 'ticket' }  // Remove boleto
                            // ⚠️ NÃO REMOVA O 'pix' DA LISTA!
                        ],
                        installments: 1
                    },
                    // 🔑 CONFIGURAÇÃO ESPECÍFICA DO PIX
                    payer: {
                        email: 'teste@teste.com'
                    },
                    external_reference: nome,
                    statement_descriptor: 'CUP EDITION'
                })
            });

            const data = await response.json();

            if (data.init_point) {
                console.log(`✅ Link PIX gerado para ${nome}`);
                res.writeHead(200);
                res.end(JSON.stringify({ 
                    link: data.init_point,
                    metodo: 'PIX',
                    message: 'Link de pagamento via PIX gerado com sucesso!'
                }));
            } else {
                console.log('❌ Erro MP:', JSON.stringify(data));
                res.writeHead(500);
                res.end(JSON.stringify({ 
                    error: 'Erro ao gerar link PIX',
                    details: data 
                }));
            }
        } catch (error) {
            console.log('❌ Erro interno:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
        }
    });
});

server.listen(10000, '0.0.0.0', () => {
    console.log('✅ Servidor PIX rodando na porta 10000');
});

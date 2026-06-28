const http = require('http');

// 🔑 PEGA O TOKEN DA VARIÁVEL DE AMBIENTE
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;

if (!MERCADO_PAGO_TOKEN) {
    console.error('❌ ERRO: Token do Mercado Pago não configurado!');
    process.exit(1);
}

console.log('✅ Token do Mercado Pago carregado!');

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // ===== ROTA PARA CONSULTAR STATUS DO PAGAMENTO =====
    if (req.method === 'GET' && req.url.startsWith('/status/')) {
        const paymentId = req.url.split('/status/')[1];
        
        try {
            const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            res.writeHead(200);
            res.end(JSON.stringify({
                id: data.id,
                status: data.status,
                status_detail: data.status_detail,
                transaction_amount: data.transaction_amount,
                payment_method_id: data.payment_method_id
            }));
        } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Erro ao consultar status' }));
        }
        return;
    }

    // ===== ROTA PARA CRIAR PAGAMENTO PIX =====
    if (req.method !== 'POST') {
        res.writeHead(405);
        res.end(JSON.stringify({ error: 'Use POST' }));
        return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const { nome, valor, email, cpf } = JSON.parse(body);

            if (!nome || !valor) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Nome e valor são obrigatórios' }));
                return;
            }

            const valorNumerico = parseFloat(valor);
            const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '12345678909';
            
            console.log(`🔄 Gerando PIX para: ${nome} - R$ ${valorNumerico}`);

            // ===== CRIA PAGAMENTO PIX VIA CHECKOUT TRANSPARENTE =====
            const response = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_amount: valorNumerico,
                    description: `Mensalidade Cup Edition - ${nome}`,
                    payment_method_id: 'pix',
                    payer: {
                        email: email || 'cliente@cupedition.com',
                        first_name: nome,
                        identification: {
                            type: 'CPF',
                            number: cpfLimpo
                        }
                    },
                    // 🔔 URL para receber notificações automáticas
                    notification_url: 'https://cup-edition-api.onrender.com/webhook'
                })
            });

            const data = await response.json();

            if (data.point_of_interaction && data.point_of_interaction.transaction_data) {
                const qrCodeBase64 = data.point_of_interaction.transaction_data.qr_code_base64;
                const qrCode = data.point_of_interaction.transaction_data.qr_code;
                
                console.log(`✅ PIX gerado para ${nome} - ID: ${data.id}`);
                
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    id: data.id,
                    status: data.status,
                    qr_code: qrCode,
                    qr_code_base64: qrCodeBase64,
                    valor: valorNumerico,
                    nome: nome,
                    link: `https://cup-edition-api.onrender.com/status/${data.id}`,
                    message: 'PIX gerado com sucesso! Escaneie o QR Code.'
                }));
            } else {
                console.log('❌ Erro MP:', JSON.stringify(data));
                res.writeHead(500);
                res.end(JSON.stringify({ 
                    success: false,
                    error: data.message || 'Erro ao gerar PIX',
                    details: data
                }));
            }
        } catch (error) {
            console.log('❌ Erro interno:', error.message);
            res.writeHead(500);
            res.end(JSON.stringify({ 
                success: false,
                error: 'Erro interno do servidor'
            }));
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor Checkout Transparente PIX rodando na porta ${PORT}`);
    console.log(`🔗 URL: https://cup-edition-api.onrender.com`);
    console.log(`📌 Use POST / para gerar PIX`);
    console.log(`📌 Use GET /status/{id} para consultar pagamento`);
});

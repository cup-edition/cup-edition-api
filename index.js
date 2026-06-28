const http = require('http');

// 🔑 PEGA O TOKEN DA VARIÁVEL DE AMBIENTE
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;

if (!MERCADO_PAGO_TOKEN) {
    console.error('❌ ERRO: Token não configurado!');
    process.exit(1);
}

console.log('✅ Token carregado!');

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

            // 🔑 GERA UM ID ÚNICO PARA O CABEÇALHO IDEMPOTENCY
            const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
            
            const emailPagador = email || 'cliente@cupedition.com';
            const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '12345678909';
            
            console.log(`🔄 Gerando PIX para: ${nome} - R$ ${valor} - Key: ${idempotencyKey}`);

            // ===== CRIA PAGAMENTO PIX =====
            const response = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey  // ← ADICIONADO!
                },
                body: JSON.stringify({
                    transaction_amount: parseFloat(valor),
                    description: `Cup Edition - ${nome}`,
                    payment_method_id: 'pix',
                    payer: {
                        email: emailPagador,
                        first_name: nome,
                        identification: {
                            type: 'CPF',
                            number: cpfLimpo
                        }
                    }
                })
            });

            const data = await response.json();

            if (data.point_of_interaction && data.point_of_interaction.transaction_data) {
                console.log(`✅ PIX gerado para ${nome} - ID: ${data.id}`);
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    id: data.id,
                    status: data.status,
                    qr_code: data.point_of_interaction.transaction_data.qr_code,
                    qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
                    valor: parseFloat(valor),
                    nome: nome
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
                error: 'Erro interno do servidor',
                details: error.message
            }));
        }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor PIX rodando na porta ${PORT}`);
    console.log(`🔗 URL: https://cup-edition-api.onrender.com`);
});

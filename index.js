const http = require('http');

// 🔑 PEGA O TOKEN DA VARIÁVEL DE AMBIENTE
const MERCADO_PAGO_TOKEN = process.env.MERCADO_PAGO_TOKEN;

if (!MERCADO_PAGO_TOKEN) {
    console.error('❌ ERRO: Token do Mercado Pago não configurado!');
    console.error('📌 Adicione a variável de ambiente MERCADO_PAGO_TOKEN no Render');
    process.exit(1);
}

console.log('✅ Token do Mercado Pago carregado com sucesso!');

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
            const { nome, valor, email, cpf } = JSON.parse(body);

            if (!nome || !valor) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Nome e valor são obrigatórios' }));
                return;
            }

            // Valida CPF (opcional)
            const cpfLimpo = cpf ? cpf.replace(/\D/g, '') : '12345678909';
            
            console.log(`🔄 Gerando PIX para: ${nome} - R$ ${valor}`);

            // ===== CRIA PAGAMENTO PIX =====
            const response = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transaction_amount: parseFloat(valor),
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
                    notification_url: 'https://cup-edition-api.onrender.com/webhook'
                })
            });

            const data = await response.json();

            // Verifica se o PIX foi gerado com sucesso
            if (data.point_of_interaction && data.point_of_interaction.transaction_data) {
                const qrCodeBase64 = data.point_of_interaction.transaction_data.qr_code_base64;
                const qrCode = data.point_of_interaction.transaction_data.qr_code;
                const id = data.id;
                const status = data.status;
                
                console.log(`✅ PIX gerado para ${nome} - ID: ${id}`);
                
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    id: id,
                    status: status,
                    qr_code: qrCode,
                    qr_code_base64: qrCodeBase64,
                    valor: parseFloat(valor),
                    nome: nome,
                    message: 'PIX gerado com sucesso! Escaneie o QR Code ou copie o código.'
                }));
            } else {
                console.log('❌ Erro ao gerar PIX:', JSON.stringify(data));
                res.writeHead(500);
                res.end(JSON.stringify({ 
                    success: false,
                    error: 'Erro ao gerar PIX',
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

// asaas.js - Exclusivo para integração com o Asaas
const ASAAS_BASE_URL = 'https://api.asaas.com/v3';
const ASAAS_TOKEN = process.env.ASAAS_API_TOKEN;

// Validação inicial
if (!ASAAS_TOKEN) {
  console.error('❌ ERRO: Configure a chave ASAAS_API_TOKEN no arquivo .env!');
  process.exit(1);
}
console.log('✅ Módulo Asaas carregado com sucesso!');

// Envia Pix para terceiros
async function enviarPix(valor, chavePix) {
  try {
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
    return { sucesso: resposta.ok, dados };
  } catch (erro) {
    return { sucesso: false, erro: erro.message };
  }
}

// Consulta saldo disponível
async function verSaldo() {
  try {
    const resposta = await fetch(`${ASAAS_BASE_URL}/balance`, {
      headers: { 'access_token': ASAAS_TOKEN }
    });
    return await resposta.json();
  } catch (erro) {
    return { erro: erro.message };
  }
}

module.exports = { enviarPix, verSaldo };

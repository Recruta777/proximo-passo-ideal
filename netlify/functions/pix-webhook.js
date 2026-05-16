const API_BASE = 'https://api.mercadopago.com';

function getToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MP_ACCESS_TOKEN não configurado.');
  }
  return token;
}

async function mpRequest(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return res.json();
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const paymentId = body?.data?.id;

      if (!paymentId) {
        return { statusCode: 200, headers, body: JSON.stringify({ status: 'ignored' }) };
      }

      const payment = await mpRequest(`/v1/payments/${paymentId}`);

      if (payment.status === 'approved') {
        try {
          const { getStore } = require('@netlify/blobs');
          const store = getStore('pix-pagamentos');
          const existing = JSON.parse(await store.get('confirmados') || '[]');
          if (!existing.find(p => String(p.payment_id) === String(paymentId))) {
            existing.push({
              payment_id: String(paymentId),
              prestador_id: payment.metadata?.prestador_id || null,
              status: 'approved',
              confirmed_at: new Date().toISOString(),
            });
            await store.set('confirmados', JSON.stringify(existing));
          }
        } catch (e) {
          console.error('Erro ao salvar no blob:', e.message);
        }
      }

      return { statusCode: 200, headers, body: JSON.stringify({ status: 'received' }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ erro: 'method not allowed' }) };
  } catch (err) {
    console.error('Webhook error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'error', message: err.message }) };
  }
};

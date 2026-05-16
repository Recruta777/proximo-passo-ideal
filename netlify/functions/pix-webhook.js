const { getStore } = require('@netlify/blobs');

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-3845023863916739-051604-0e1b98a3c164e637660bda6175efd33a-1913458460';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const paymentId = body.data?.id;

    if (!paymentId) {
      return { statusCode: 200, body: JSON.stringify({ status: 'ignored' }) };
    }

    // Consulta status do pagamento no Mercado Pago
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
    });
    const payment = await res.json();

    if (payment.status === 'approved') {
      const store = getStore('pix-pagamentos');
      const pagamentos = JSON.parse(await store.get('pagamentos', { type: 'json' }) || '[]');
      const idx = pagamentos.findIndex(p => p.payment_id == paymentId);

      if (idx !== -1) {
        pagamentos[idx].status = 'approved';
        await store.setJSON('pagamentos', pagamentos);
      }
    }

    return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
  } catch (err) {
    console.error('Webhook error:', err);
    return { statusCode: 200, body: JSON.stringify({ status: 'ok' }) };
  }
};

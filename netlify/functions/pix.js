const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-3845023863916739-051604-0e1b98a3c164e637660bda6175efd33a-1913458460';
const API_BASE = 'https://api.mercadopago.com';

async function mpRequest(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${MP_TOKEN}`,
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
    opts.headers['X-Idempotency-Key'] = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const res = await fetch(`${API_BASE}${path}`, opts);
  return { status: res.status, data: await res.json() };
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { action, prestador_id, nome, email, payment_id } = body;

    // GERAR PIX
    if (event.httpMethod === 'POST' && action === 'gerar_pix') {
      const { status, data } = await mpRequest('/v1/payments', 'POST', {
        transaction_amount: 10.00,
        description: 'Taxa de Cadastro - Próximo Passo Ideal',
        payment_method_id: 'pix',
        payer: { email: email || 'pagamento@email.com', first_name: nome?.split(' ')[0] || 'Prestador' },
        metadata: { prestador_id },
      });

      if (status !== 201 || data.error) {
        return { statusCode: 400, headers, body: JSON.stringify({ erro: data.message || 'Erro ao gerar PIX' }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          qr_code: data.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
          payment_id: data.id,
          status: data.status,
        }),
      };
    }

    // CONSULTAR
    if (event.httpMethod === 'POST' && action === 'consultar') {
      if (!payment_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ erro: 'payment_id é obrigatório' }) };
      }
      const { data } = await mpRequest(`/v1/payments/${payment_id}`);
      return { statusCode: 200, headers, body: JSON.stringify({ status: data.status, status_detail: data.status_detail }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ erro: 'rota não encontrada' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ erro: err.message }) };
  }
};

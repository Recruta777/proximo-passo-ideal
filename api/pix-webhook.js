const MP_API = 'https://api.mercadopago.com';

function getToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN nao configurado');
  return token;
}

async function mpRequest(path) {
  const res = await fetch(`${MP_API}${path}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` },
  });
  return res.json();
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

async function salvarConfirmado(payment_id, prestador_id) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  try {
    const res = await fetch(`${UPSTASH_URL}/get/pix_confirmados`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const data = await res.json();
    const existing = data.result ? JSON.parse(data.result) : [];
    if (!existing.find(p => String(p.payment_id) === String(payment_id))) {
      existing.push({
        payment_id: String(payment_id),
        prestador_id: prestador_id || null,
        status: 'approved',
        confirmed_at: new Date().toISOString(),
      });
      await fetch(`${UPSTASH_URL}/set/pix_confirmados`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.stringify(existing)),
      });
    }
  } catch {}
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const paymentId = req.body?.data?.id;
      if (!paymentId) return res.json({ status: 'ignored' });

      const payment = await mpRequest(`/v1/payments/${paymentId}`);

      if (payment.status === 'approved') {
        await salvarConfirmado(paymentId, payment.metadata?.prestador_id);
      }

      return res.json({ status: 'received' });
    }

    return res.status(404).json({ erro: 'method not allowed' });
  } catch (err) {
    return res.status(200).json({ status: 'error', message: err.message });
  }
};

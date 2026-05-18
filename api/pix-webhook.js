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

const GIT_REPO = 'Recruta777/proximo-passo-ideal';
const GIT_PATH = '_data';

function ghHeaders() {
  const t = process.env.GH_TOKEN;
  return t ? { Authorization: `token ${t}`, Accept: 'application/vnd.github.v3+json' } : {};
}

async function lerDados(key) {
  const token = process.env.GH_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${GIT_REPO}/contents/${GIT_PATH}/${key}.json`, {
      headers: ghHeaders(),
    });
    if (res.status === 404) return [];
    const data = await res.json();
    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
  } catch { return []; }
}

async function salvarDados(key, dados) {
  const token = process.env.GH_TOKEN;
  if (!token) return;
  try {
    const content = Buffer.from(JSON.stringify(dados, null, 2)).toString('base64');
    const getRes = await fetch(`https://api.github.com/repos/${GIT_REPO}/contents/${GIT_PATH}/${key}.json`, {
      headers: ghHeaders(),
    });
    let sha = null;
    if (getRes.status !== 404) {
      const existing = await getRes.json();
      sha = existing.sha;
    }
    await fetch(`https://api.github.com/repos/${GIT_REPO}/contents/${GIT_PATH}/${key}.json`, {
      method: 'PUT',
      headers: ghHeaders(),
      body: JSON.stringify({
        message: `Atualizar dados: ${key}`,
        content,
        sha,
      }),
    });
  } catch {}
}

async function salvarConfirmado(payment_id, prestador_id) {
  const token = process.env.GH_TOKEN;
  if (!token) return;
  try {
    const existing = await lerDados('pix_confirmados');
    if (!existing.find(p => String(p.payment_id) === String(payment_id))) {
      existing.push({
        payment_id: String(payment_id),
        prestador_id: prestador_id || null,
        status: 'approved',
        confirmed_at: new Date().toISOString(),
      });
      await salvarDados('pix_confirmados', existing);
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

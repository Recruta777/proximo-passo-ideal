const MP_API = 'https://api.mercadopago.com';

function getToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN nao configurado');
  return token;
}

async function mpRequest(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  };
  if (body) {
    opts.body = JSON.stringify(body);
    opts.headers['X-Idempotency-Key'] = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const res = await fetch(`${MP_API}${path}`, opts);
  return { status: res.status, data: await res.json() };
}

const GIT_REPO = 'Recruta777/proximo-passo-ideal';
const GIT_PATH = '_data';

function ghHeaders() {
  const t = process.env.GH_TOKEN;
  return t ? { Authorization: `token ${t}`, Accept: 'application/vnd.github.v3+json' } : {};
}

async function listarConfirmados() {
  const token = process.env.GH_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${GIT_REPO}/contents/${GIT_PATH}/pix_confirmados.json`, {
      headers: ghHeaders(),
    });
    if (res.status === 404) return [];
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch { return []; }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const body = await parseBody(req);
    const { action, prestador_id, nome, email, payment_id } = body;

    if (req.method === 'POST' && action === 'gerar_pix') {
      const { status, data } = await mpRequest('/v1/payments', 'POST', {
        transaction_amount: 10.00,
        description: 'Taxa de Cadastro - Proximo Passo Ideal',
        payment_method_id: 'pix',
        payer: { email: email || 'pagamento@email.com', first_name: nome?.split(' ')[0] || 'Prestador' },
        metadata: { prestador_id },
      });

      if (status !== 201 || data.error) {
        return res.status(400).json({ erro: data.message || 'Erro ao gerar PIX' });
      }

      return res.json({
        qr_code: data.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
        payment_id: data.id,
        status: data.status,
      });
    }

    if (req.method === 'POST' && action === 'consultar') {
      if (!payment_id) return res.status(400).json({ erro: 'payment_id obrigatorio' });
      const { data } = await mpRequest(`/v1/payments/${payment_id}`);
      return res.json({ status: data.status, status_detail: data.status_detail });
    }

    if (req.method === 'POST' && action === 'listar_confirmados') {
      const dados = await listarConfirmados();
      return res.json(dados);
    }

    return res.status(404).json({ erro: 'rota nao encontrada' });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

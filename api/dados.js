const UPSTASH_URL = process.env.UPSTASH_REDIS_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_TOKEN;

async function getData(key) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return [];
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : [];
  } catch { return []; }
}

async function setData(key, data) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  await fetch(`${UPSTASH_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(data)),
  });
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { tipo } = req.query;
      if (!tipo || !['prestadores', 'clientes', 'avaliacoes'].includes(tipo)) {
        return res.status(400).json({ erro: 'tipo invalido' });
      }
      const dados = await getData(tipo);
      return res.json({ dados });
    }

    if (req.method === 'POST') {
      const { action, tipo, dados, id } = req.body;

      if (action === 'salvar' && tipo) {
        const lista = await getData(tipo);
        const item = { ...dados, criado_em: new Date().toLocaleString('pt-BR'), timestamp: new Date().toISOString() };
        lista.push(item);
        await setData(tipo, lista);
        return res.json({ ok: true, item });
      }

      if (action === 'substituir' && tipo && Array.isArray(dados)) {
        await setData(tipo, dados);
        return res.json({ ok: true, total: dados.length });
      }

      if (action === 'excluir' && tipo && id) {
        const lista = await getData(tipo);
        await setData(tipo, lista.filter(x => x.id !== id));
        return res.json({ ok: true });
      }

      return res.status(400).json({ erro: 'acao invalida' });
    }

    return res.status(405).json({ erro: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

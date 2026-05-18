const GIT_REPO = 'Recruta777/proximo-passo-ideal';
const GIT_PATH = '_data';

function getToken() {
  return process.env.GH_TOKEN;
}

const GH_HEADERS = () => {
  const t = getToken();
  return t ? { Authorization: `token ${t}`, Accept: 'application/vnd.github.v3+json' } : {};
};

async function getData(key) {
  const token = getToken();
  if (!token) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${GIT_REPO}/contents/${GIT_PATH}/${key}.json`, {
      headers: GH_HEADERS(),
    });
    if (res.status === 404) return [];
    const data = await res.json();
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function setData(key, data) {
  const token = getToken();
  if (!token) return;
  try {
    const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const getRes = await fetch(`https://api.github.com/repos/${GIT_REPO}/contents/${GIT_PATH}/${key}.json`, {
      headers: GH_HEADERS(),
    });
    let sha = null;
    if (getRes.status !== 404) {
      const existing = await getRes.json();
      sha = existing.sha;
    }
    await fetch(`https://api.github.com/repos/${GIT_REPO}/contents/${GIT_PATH}/${key}.json`, {
      method: 'PUT',
      headers: GH_HEADERS(),
      body: JSON.stringify({
        message: `Atualizar dados: ${key}`,
        content,
        sha,
      }),
    });
  } catch {}
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

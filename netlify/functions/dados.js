const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'proximo-passo-dados';
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function getData(key) {
  try {
    const store = getStore(STORE_NAME);
    return JSON.parse(await store.get(key) || '[]');
  } catch (e) {
    return [];
  }
}

async function setData(key, data) {
  const store = getStore(STORE_NAME);
  await store.set(key, JSON.stringify(data));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // GET - Listar dados
    if (event.httpMethod === 'GET') {
      const url = new URL(event.rawUrl || `http://localhost${event.path}`);
      const tipo = url.searchParams.get('tipo') || event.queryStringParameters?.tipo;
      if (!tipo || !['prestadores', 'clientes', 'avaliacoes'].includes(tipo)) {
        return { statusCode: 400, headers, body: JSON.stringify({ erro: 'tipo invalido' }) };
      }
      const dados = await getData(tipo);
      return { statusCode: 200, headers, body: JSON.stringify({ dados }) };
    }

    // POST - Escrever dados
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, tipo, dados, id } = body;

      if (action === 'salvar' && tipo) {
        const lista = await getData(tipo);
        const item = {
          id: Date.now().toString(),
          ...dados,
          criado_em: new Date().toLocaleString('pt-BR'),
          timestamp: new Date().toISOString(),
        };
        lista.push(item);
        await setData(tipo, lista);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, item }) };
      }

      if (action === 'substituir' && tipo && Array.isArray(dados)) {
        await setData(tipo, dados);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true, total: dados.length }) };
      }

      if (action === 'excluir' && tipo && id) {
        const lista = await getData(tipo);
        const nova = lista.filter(x => x.id !== id);
        await setData(tipo, nova);
        return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
      }

      return { statusCode: 400, headers, body: JSON.stringify({ erro: 'acao invalida' }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ erro: 'method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ erro: err.message }) };
  }
};

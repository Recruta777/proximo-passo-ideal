exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Erro de configuracao do servidor' }) };
    }

    if (body.password === adminPassword) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Senha incorreta' }) };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Requisicao invalida' }) };
  }
};

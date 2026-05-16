exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
  }

  const body = JSON.parse(event.body || '{}');
  const adminPassword = process.env.ADMIN_PASSWORD || 'idealserv777';

  if (body.password === adminPassword) {
    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: 'Senha incorreta' }) };
};

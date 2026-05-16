module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ success: false, message: 'Erro de configuracao do servidor' });
    }
    if (req.body.password === adminPassword) {
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Senha incorreta' });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Requisicao invalida' });
  }
};

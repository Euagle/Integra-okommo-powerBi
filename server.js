require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

const KOMMO_INTEGRATION_ID = process.env.KOMMO_INTEGRATION_ID;
const KOMMO_LONG_TOKEN = process.env.KOMMO_LONG_TOKEN;
const BASE_URL = 'https://api-g.kommo.com/v4';

function getHeaders() {
  return {
    'Authorization': `Bearer ${KOMMO_LONG_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Kommo → Render → Power BI',
    integration_id: KOMMO_INTEGRATION_ID || null
  });
});

app.get('/leads', async (req, res) => {
  try {
    const url = `${BASE_URL}/leads`;
    const response = await axios.get(url, { headers: getHeaders(), params: { limit: 50 } });

    const leads = (response.data._embedded?.leads || []).map(l => ({
      id: l.id,
      name: l.name,
      price: l.price,
      pipeline_id: l.pipeline_id,
      status_id: l.status_id,
      responsible_user_id: l.responsible_user_id,
      created_at: l.created_at
    }));

    res.json(leads);
  } catch (err) {
    console.error('Erro Kommo:', err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json({
      error: true,
      status,
      details: err.response?.data || err.message
    });
  }
});

// 🔥 NOVOS ENDPOINTS ADICIONADOS
app.get('/debug', async (req, res) => {
  try {
    const token = process.env.KOMMO_LONG_TOKEN;
    const tokenPresent = !!token;
    
    let accountInfo = null;
    let tokenValid = false;
    
    if (tokenPresent) {
      try {
        const response = await axios.get(`${BASE_URL}/account`, {
          headers: getHeaders()
        });
        accountInfo = response.data;
        tokenValid = true;
      } catch (authError) {
        tokenValid = false;
        accountInfo = {
          error: authError.response?.data || authError.message
        };
      }
    }
    
    res.json({
      service: 'Kommo Power BI Integration',
      status: 'running',
      kommo: {
        token_configured: tokenPresent,
        token_valid: tokenValid,
        token_preview: tokenPresent ? `${token.substring(0, 15)}...` : 'MISSING',
        base_url: BASE_URL,
        account_info: accountInfo
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Debug failed' });
  }
});

app.get('/powerbi/leads', async (req, res) => {
  try {
    const url = `${BASE_URL}/leads`;
    const response = await axios.get(url, { 
      headers: getHeaders(), 
      params: { 
        limit: 500,
        with: 'contacts'
      }
    });

    const leads = response.data._embedded?.leads || [];
    res.json(leads);
    
  } catch (err) {
    console.error('Erro PowerBI endpoint:', err.message);
    res.json([]);
  }
});

app.get('/test-simple', (req, res) => {
  const testData = [
    {
      "id": 1,
      "name": "Lead Teste 1",
      "price": 1500.00,
      "pipeline_id": 123,
      "status_id": 142,
      "responsible_user_id": 456,
      "created_at": 1701509400
    },
    {
      "id": 2,
      "name": "Lead Teste 2", 
      "price": 3000.00,
      "pipeline_id": 123,
      "status_id": 143,
      "responsible_user_id": 457,
      "created_at": 1701595800
    }
  ];
  res.json(testData);
});
// 🔥 FIM DOS NOVOS ENDPOINTS

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});
require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

const KOMMO_INTEGRATION_ID = process.env.KOMMO_INTEGRATION_ID; // seu id de integração
const KOMMO_LONG_TOKEN = process.env.KOMMO_LONG_TOKEN; // setada como variável de ambiente no Render

// Base URL recomendado para token longo (ajuste se sua conta usar outro domínio)
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

    // Mapear para um JSON limpo que o Power BI consome fácil
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

app.listen(PORT, () => {
  console.log(`Server rodando na porta ${PORT}`);
});

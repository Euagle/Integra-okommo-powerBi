require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// 🔥 MODE MOCK - Funciona SEM token
const USE_MOCK_DATA = true;

app.get('/', (req, res) => {
  res.json({
    status: 'Kommo Power BI Integration',
    mode: USE_MOCK_DATA ? 'MOCK (sem token necessário)' : 'PRODUÇÃO (precisa de token)',
    instructions: USE_MOCK_DATA ? 
      '✅ Funcionando com dados de teste. Para dados reais:' : 
      '✅ Conectado ao Kommo',
    steps: [
      '1. Acesse: https://convertemais.kommo.com/settings/widgets',
      '2. Procure por "API" ou "Chaves da API"',
      '3. Clique em "Adicionar chave da API"',
      '4. Copie a chave gerada',
      '5. Adicione como KOMMO_API_KEY no Render'
    ],
    endpoints: {
      root: '/',
      leads: '/leads (dados mock)',
      powerbi: '/powerbi (melhor para Power BI)',
      estatisticas: '/estatisticas'
    }
  });
});

// Gerar leads mock realistas
function generateMockLeads(count = 100) {
  const statuses = [
    { id: 142, name: 'Novo', tipo: 'entrada' },
    { id: 143, name: 'Em contato', tipo: 'andamento' },
    { id: 144, name: 'Negociação', tipo: 'andamento' },
    { id: 145, name: 'Convertido', tipo: 'convertido' },
    { id: 146, name: 'Perdido', tipo: 'perdido' }
  ];
  
  const leads = [];
  const today = new Date();
  
  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const daysAgo = Math.floor(Math.random() * 90); // últimos 90 dias
    const createdDate = new Date(today);
    createdDate.setDate(createdDate.getDate() - daysAgo);
    
    leads.push({
      id: i,
      name: `Lead ${i} - ${['Empresa A', 'Empresa B', 'Empresa C'][i % 3]}`,
      price: Math.floor(Math.random() * 15000) + 1000,
      pipeline_id: [1, 2, 3][i % 3],
      pipeline_name: ['Vendas', 'Marketing', 'Parceiros'][i % 3],
      status_id: status.id,
      status_name: status.name,
      status_tipo: status.tipo,
      responsible_user_id: [101, 102, 103][i % 3],
      responsible_user_name: ['João', 'Maria', 'Carlos'][i % 3],
      created_at: Math.floor(createdDate.getTime() / 1000),
      created_date: createdDate.toISOString().split('T')[0],
      updated_at: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400)
    });
  }
  
  return leads;
}

// Endpoint principal para Power BI
app.get('/leads', (req, res) => {
  const leads = generateMockLeads(150);
  res.json({
    success: true,
    count: leads.length,
    data: leads,
    mode: 'mock',
    timestamp: new Date().toISOString()
  });
});

// Endpoint ideal para Power BI (array direto)
app.get('/powerbi', (req, res) => {
  const leads = generateMockLeads(200);
  res.json(leads); // Array direto funciona melhor no Power BI
});

// Estatísticas para dashboard
app.get('/estatisticas', (req, res) => {
  const leads = generateMockLeads(150);
  
  const estatisticas = {
    total: leads.length,
    valor_total: leads.reduce((sum, l) => sum + l.price, 0),
    por_status: {},
    por_tipo: {
      entrada: 0,
      andamento: 0,
      convertido: 0,
      perdido: 0
    },
    ultimos_30_dias: leads.filter(l => {
      const leadDate = new Date(l.created_at * 1000);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return leadDate > thirtyDaysAgo;
    }).length,
    valor_medio: Math.round(leads.reduce((sum, l) => sum + l.price, 0) / leads.length)
  };
  
  leads.forEach(lead => {
    // Contagem por status
    estatisticas.por_status[lead.status_name] = (estatisticas.por_status[lead.status_name] || 0) + 1;
    
    // Contagem por tipo
    estatisticas.por_tipo[lead.status_tipo]++;
  });
  
  res.json(estatisticas);
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando: http://localhost:${PORT}`);
  console.log(`📊 Modo: ${USE_MOCK_DATA ? 'MOCK' : 'PRODUÇÃO'}`);
  console.log(`🔗 Power BI URL: http://localhost:${PORT}/powerbi`);
});
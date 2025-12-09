require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// Configurações do Kommo
const KOMMO_INTEGRATION_ID = process.env.KOMMO_INTEGRATION_ID;
const KOMMO_LONG_TOKEN = process.env.KOMMO_LONG_TOKEN;
const KOMMO_SUBDOMAIN = 'convertemais'; // SEU subdomínio
const BASE_URL = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4`;

// 🔥 MODO REAL: true para tentar API real, false para usar mock
const MODO_REAL = true;

// Headers para API do Kommo
function getHeaders() {
  if (!KOMMO_LONG_TOKEN) {
    throw new Error('Token do Kommo não configurado');
  }
  return {
    'Authorization': `Bearer ${KOMMO_LONG_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// 🔥 FUNÇÃO PRINCIPAL: Busca leads REAIS do Kommo
async function buscarLeadsReaisKommo(limite = 100) {
  try {
    console.log('🔍 Tentando conectar com Kommo API...');
    console.log('Token presente:', !!KOMMO_LONG_TOKEN);
    console.log('Base URL:', BASE_URL);
    
    // Primeiro, testa se a API está acessível
    const testeUrl = `${BASE_URL}/account`;
    console.log('Testando URL:', testeUrl);
    
    const respostaTeste = await axios.get(testeUrl, {
      headers: getHeaders(),
      timeout: 10000
    });
    
    console.log('✅ Conexão com Kommo estabelecida!');
    
    // Agora busca os leads
    const url = `${BASE_URL}/leads`;
    const params = {
      limit: limite,
      with: 'contacts,statuses,pipelines',
      page: 1
    };
    
    console.log('📡 Buscando leads...');
    const response = await axios.get(url, {
      headers: getHeaders(),
      params: params,
      timeout: 15000
    });
    
    const leadsData = response.data;
    const leads = leadsData._embedded?.leads || [];
    
    console.log(`✅ ${leads.length} leads encontrados no Kommo`);
    
    // Processa os leads para formato Power BI
    const leadsProcessados = leads.map(lead => ({
      // IDs e nomes
      lead_id: lead.id,
      nome: lead.name || `Lead ${lead.id}`,
      
      // Valores
      valor: lead.price || 0,
      valor_orcamento: lead.price || 0,
      
      // Status e pipeline
      status_id: lead.status_id,
      pipeline_id: lead.pipeline_id,
      responsavel_id: lead.responsible_user_id,
      
      // Datas (convertendo timestamps Unix)
      data_criacao: lead.created_at ? new Date(lead.created_at * 1000).toISOString().split('T')[0] : null,
      data_criacao_timestamp: lead.created_at,
      data_modificacao: lead.updated_at ? new Date(lead.updated_at * 1000).toISOString().split('T')[0] : null,
      data_modificacao_timestamp: lead.updated_at,
      data_fechamento: lead.closed_at ? new Date(lead.closed_at * 1000).toISOString().split('T')[0] : null,
      data_fechamento_timestamp: lead.closed_at,
      
      // Status calculado
      status_fechado: !!lead.closed_at,
      status_perdido: !!lead.loss_reason_id,
      
      // Campos adicionais do Kommo
      motivo_perda_id: lead.loss_reason_id,
      empresa_id: lead.company?.id || null,
      contato_id: lead.contacts?._embedded?.contacts[0]?.id || null,
      contato_nome: lead.contacts?._embedded?.contacts[0]?.name || null,
      tags: lead.tags || [],
      custom_fields: lead.custom_fields_values || []
    }));
    
    return {
      sucesso: true,
      modo: 'REAL',
      total_leads: leadsData._total_items || leads.length,
      pagina_atual: leadsData._page || 1,
      total_paginas: leadsData._total_pages || 1,
      leads: leadsProcessados
    };
    
  } catch (erro) {
    console.error('❌ ERRO ao buscar leads do Kommo:');
    console.error('Mensagem:', erro.message);
    console.error('Status:', erro.response?.status);
    console.error('Dados erro:', erro.response?.data);
    console.error('URL:', erro.config?.url);
    
    // Se for erro de autenticação, sugere solução
    if (erro.response?.status === 401) {
      console.error('\n⚠️  ERRO DE AUTENTICAÇÃO!');
      console.error('Solução:');
      console.error('1. Acesse: https://convertemais.kommo.com/settings/widgets/api');
      console.error('2. Clique em "Adicionar chave da API"');
      console.error('3. Copie a chave e adicione no Render como KOMMO_LONG_TOKEN');
    }
    
    throw erro;
  }
}

// 🔥 Endpoint para leads REAIS do Kommo
app.get('/leads-reais', async (req, res) => {
  try {
    if (!MODO_REAL) {
      return res.json({
        sucesso: false,
        modo: 'MOCK',
        mensagem: 'Modo real desativado. Use /leads-mock para dados de teste'
      });
    }
    
    const limite = parseInt(req.query.limit) || 100;
    const dados = await buscarLeadsReaisKommo(limite);
    
    res.json(dados);
    
  } catch (erro) {
    console.error('Falha no endpoint /leads-reais:', erro.message);
    
    // Retorna erro detalhado
    res.status(500).json({
      sucesso: false,
      modo: 'ERRO',
      mensagem: 'Falha ao conectar com Kommo',
      erro: erro.message,
      detalhes: erro.response?.data,
      status: erro.response?.status,
      solucao: 'Configure o token do Kommo no Render (variável KOMMO_LONG_TOKEN)',
      url_configuracao: 'https://convertemais.kommo.com/settings/widgets/api'
    });
  }
});

// 🔥 Endpoint MOCK (se API real falhar)
app.get('/leads-mock', (req, res) => {
  const leads = gerarLeadsMock(100);
  res.json({
    sucesso: true,
    modo: 'MOCK',
    total_leads: leads.length,
    leads: leads
  });
});

// 🔥 Endpoint AUTOMÁTICO: Tenta real, se falhar usa mock
app.get('/leads-auto', async (req, res) => {
  try {
    if (MODO_REAL && KOMMO_LONG_TOKEN) {
      const dadosReais = await buscarLeadsReaisKommo(100);
      return res.json(dadosReais);
    } else {
      throw new Error('Modo real desativado ou token não configurado');
    }
  } catch (erro) {
    console.log('Usando dados mock devido a erro:', erro.message);
    const leads = gerarLeadsMock(100);
    res.json({
      sucesso: true,
      modo: 'MOCK (automático)',
      motivo: erro.message,
      total_leads: leads.length,
      leads: leads
    });
  }
});

// 🔥 SEU ENDPOINT PRINCIPAL para Power BI
app.get('/powerbi-kpis', async (req, res) => {
  try {
    let dados;
    
    if (MODO_REAL && KOMMO_LONG_TOKEN) {
      try {
        dados = await buscarLeadsReaisKommo(200);
      } catch (erroApi) {
        console.log('API real falhou, usando mock:', erroApi.message);
        dados = {
          sucesso: true,
          modo: 'MOCK (fallback)',
          leads: gerarLeadsMock(200)
        };
      }
    } else {
      dados = {
        sucesso: true,
        modo: 'MOCK',
        leads: gerarLeadsMock(200)
      };
    }
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json(dados.leads);
    
  } catch (erro) {
    console.error('Erro em /powerbi-kpis:', erro);
    res.status(500).json({ erro: erro.message });
  }
});

// 🔥 Função de geração de dados MOCK (para fallback)
function gerarLeadsMock(quantidade = 100) {
  const leads = [];
  const hoje = new Date();
  
  for (let i = 1; i <= quantidade; i++) {
    const diasAtras = Math.floor(Math.random() * 180);
    const dataCriacao = new Date(hoje);
    dataCriacao.setDate(dataCriacao.getDate() - diasAtras);
    
    const statusRand = Math.random();
    let statusId;
    let statusNome;
    
    if (statusRand < 0.25) { statusId = 142; statusNome = 'Novo'; }
    else if (statusRand < 0.45) { statusId = 143; statusNome = 'Em contato'; }
    else if (statusRand < 0.60) { statusId = 144; statusNome = 'Negociação'; }
    else if (statusRand < 0.75) { statusId = 145; statusNome = 'Convertido'; }
    else if (statusRand < 0.90) { statusId = 146; statusNome = 'Perdido'; }
    else { statusId = 147; statusNome = 'Frio'; }
    
    const timestamp = Math.floor(dataCriacao.getTime() / 1000);
    const valor = statusId === 145 ? Math.floor(Math.random() * 50000) + 5000 : 
                 statusId === 144 ? Math.floor(Math.random() * 40000) + 3000 : 
                 Math.floor(Math.random() * 20000) + 1000;
    
    leads.push({
      lead_id: i,
      nome: `Lead ${i} - ${['TechCorp', 'GlobalBiz', 'StartUpX'][i % 3]}`,
      valor: valor,
      valor_fechado: statusId === 145 ? valor : 0,
      status_id: statusId,
      status_nome: statusNome,
      status_fechado: statusId === 145 || statusId === 146,
      status_convertido: statusId === 145,
      data_criacao: dataCriacao.toISOString().split('T')[0],
      data_criacao_timestamp: timestamp,
      is_novo: statusId === 142 ? 1 : 0,
      is_convertido: statusId === 145 ? 1 : 0,
      is_perdido: statusId === 146 ? 1 : 0,
      is_frio: statusId === 147 ? 1 : 0
    });
  }
  
  return leads;
}

// 🔥 Endpoint de DEBUG completo
app.get('/debug', async (req, res) => {
  const token = KOMMO_LONG_TOKEN;
  const tokenPresent = !!token;
  
  let testeApi = { sucesso: false, erro: 'Não testado' };
  
  if (tokenPresent && MODO_REAL) {
    try {
      const response = await axios.get(`${BASE_URL}/account`, {
        headers: getHeaders(),
        timeout: 5000
      });
      testeApi = { sucesso: true, dados: response.data };
    } catch (erro) {
      testeApi = { 
        sucesso: false, 
        erro: erro.message,
        status: erro.response?.status,
        detalhes: erro.response?.data
      };
    }
  }
  
  res.json({
    servidor: 'Kommo Power BI API',
    status: 'online',
    porta: PORT,
    modo_operacao: MODO_REAL ? 'REAL' : 'MOCK',
    
    configuracao_kommo: {
      token_configurado: tokenPresent,
      token_preview: tokenPresent ? `${token.substring(0, 20)}...` : 'NÃO CONFIGURADO',
      subdominio: KOMMO_SUBDOMAIN,
      base_url: BASE_URL,
      teste_api: testeApi
    },
    
    endpoints: {
      leads_reais: '/leads-reais (tenta API real)',
      leads_mock: '/leads-mock (dados de teste)',
      leads_auto: '/leads-auto (tenta real, fallback mock)',
      powerbi: '/powerbi-kpis (principal para Power BI)',
      debug: '/debug (esta página)'
    },
    
    instrucoes: tokenPresent && !testeApi.sucesso ? 
      '⚠️ Token configurado mas API falhou. Verifique:' +
      '\n1. Token é válido?' +
      '\n2. URL correta? ' + BASE_URL +
      '\n3. Permissões no Kommo?' :
      '✅ Configure KOMMO_LONG_TOKEN no Render para dados reais',
    
    timestamp: new Date().toISOString()
  });
});

// Endpoint raiz
app.get('/', (req, res) => {
  res.json({
    projeto: 'Kommo → Power BI API',
    status: '✅ Online',
    modo: MODO_REAL ? 'REAL (tentando conectar ao Kommo)' : 'MOCK (dados de teste)',
    instrucoes: MODO_REAL ? 
      'Para dados reais: Configure KOMMO_LONG_TOKEN no Render' :
      'Usando dados de teste. Ative MODO_REAL para dados reais',
    endpoints: {
      principal: '/powerbi-kpis (use no Power BI)',
      debug: '/debug (verifique configuração)',
      docs: 'https://github.com/Euagle/Integra-okommo-powerBi'
    }
  });
});

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 K O M M O   A P I   →   P O W E R   B I');
  console.log('='.repeat(60));
  console.log(`✅ Servidor rodando na porta: ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔗 Render URL: https://integra-okommo-powerbi.onrender.com`);
  console.log('='.repeat(60));
  console.log('📊 ENDPOINTS DISPONÍVEIS:');
  console.log(`  /powerbi-kpis    → Principal para Power BI`);
  console.log(`  /leads-reais     → Tenta API real do Kommo`);
  console.log(`  /leads-auto      → Tenta real, fallback mock`);
  console.log(`  /debug           → Verifica configuração`);
  console.log('='.repeat(60));
  console.log('⚙️  CONFIGURAÇÃO ATUAL:');
  console.log(`  Modo: ${MODO_REAL ? 'REAL' : 'MOCK'}`);
  console.log(`  Token configurado: ${!!KOMMO_LONG_TOKEN ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`  Subdomínio: ${KOMMO_SUBDOMAIN}`);
  console.log('='.repeat(60));
  console.log('💡 INSTRUÇÕES PARA DADOS REAIS:');
  console.log('1. Acesse: https://convertemais.kommo.com/settings/widgets/api');
  console.log('2. Clique em "Adicionar chave da API"');
  console.log('3. Copie a chave gerada');
  console.log('4. No Render → Environment → Adicione: KOMMO_LONG_TOKEN=sua_chave');
  console.log('='.repeat(60));
});
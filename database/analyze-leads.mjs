import { createClient } from '@supabase/supabase-js';

// Execute na raiz: node --env-file=.env database/analyze-leads.mjs
const client = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const leads = [];
let total;
do {
  const { data, error, count } = await client.from('leads')
    .select('ori_lead,status_lead', { count: 'exact' })
    .order('id', { ascending: true })
    .range(leads.length, leads.length + 999);
  if (error) throw new Error(`Consulta falhou: ${error.message}`);
  total = count;
  if (!data.length) break;
  leads.push(...data);
} while (leads.length < total);
if (leads.length !== total) throw new Error('Leitura incompleta; execute novamente.');

const percent = (part, whole) => whole ? Number((100 * part / whole).toFixed(2)) : 0;
const origins = [...new Set(leads.map(lead => lead.ori_lead))].map(origin => {
  const rows = leads.filter(lead => lead.ori_lead === origin);
  const qualified = rows.filter(lead => ['Qualificado', 'Em contato', 'Convertido'].includes(lead.status_lead)).length;
  const converted = rows.filter(lead => lead.status_lead === 'Convertido').length;
  return {
    origem: origin, total: rows.length,
    qualificados: qualified, percentual_qualificados: percent(qualified, rows.length),
    convertidos: converted, percentual_convertidos: percent(converted, rows.length),
  };
}).sort((a, b) => b.total - a.total);
const statuses = {};
for (const lead of leads) statuses[lead.status_lead] = (statuses[lead.status_lead] || 0) + 1;
console.log(JSON.stringify({ consultado_em: new Date().toISOString(), total, origens: origins, status: statuses }, null, 2));

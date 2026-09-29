import { supabase } from './supabase.js';
import { STATUSES, validateLead } from './lead-utils.js';

function table() {
  if (!supabase) throw new Error('Configure a URL e a chave pública do Supabase no arquivo .env.');
  return supabase.from('leads');
}
export async function getLeads() {
  const leads = [];
  const size = 1000;
  let count;
  do {
    const { data, error, count: total } = await table().select('*', { count: 'exact' })
      .order('criado_em', { ascending: false }).order('id', { ascending: false })
      .range(leads.length, leads.length + size - 1);
    if (error) throw error;
    count = total;
    if (!data.length) break;
    leads.push(...data);
  } while (leads.length < count);
  return leads;
}
export async function createLead(input) {
  const payload = Object.fromEntries(['nome_lead', 'fone_lead', 'imovel_lead', 'ori_lead', 'status_lead'].map((key) => [key, String(input[key] ?? '').trim()]));
  if (Object.keys(validateLead(payload)).length) throw new Error('Revise os campos do formulário.');
  const { data, error } = await table().insert(payload).select().single();
  if (error) throw error;
  return data;
}
export async function updateLeadStatus(id, status_lead) {
  if (!STATUSES.includes(status_lead)) throw new Error('Status inválido.');
  const { data, error } = await table().update({ status_lead }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function getLeadById(id) {
  const { data, error } = await table().select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

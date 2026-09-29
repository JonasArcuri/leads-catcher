export const STATUSES = ['Novo', 'Qualificado', 'Em contato', 'Convertido', 'Perdido'];
export const ORIGINS = ['Site', 'WhatsApp', 'Indicacao'];
export const originLabel = (value) => value === 'Indicacao' ? 'Indicação' : (value || 'Não informada');
export const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function filterLeads(leads, search, status) {
  const query = normalize(search.trim());
  const digits = query.replace(/\D/g, '');
  return leads.filter((lead) => (!status || lead.status_lead === status) && (
    ['nome_lead', 'fone_lead', 'imovel_lead', 'ori_lead'].some((key) => normalize(lead[key]).includes(query)) ||
    (digits.length >= 3 && /^[\d\s()+.-]+$/.test(query) && String(lead.fone_lead ?? '').replace(/\D/g, '').includes(digits))
  ));
}
export function validateLead(input) {
  const errors = {};
  for (const key of ['nome_lead', 'fone_lead', 'imovel_lead', 'ori_lead', 'status_lead']) {
    if (!String(input[key] ?? '').trim()) errors[key] = 'Preencha este campo.';
  }
  const phone = String(input.fone_lead ?? '').trim();
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15)) {
    errors.fone_lead = 'Informe de 7 a 15 dígitos, com DDI quando necessário.';
  }
  if (!ORIGINS.includes(input.ori_lead)) errors.ori_lead = 'Selecione uma origem válida.';
  if (!STATUSES.includes(input.status_lead)) errors.status_lead = 'Selecione um status válido.';
  return errors;
}
export function summarize(leads) {
  return { total: leads.length, ...Object.fromEntries(STATUSES.map((status) => [status, leads.filter((lead) => lead.status_lead === status).length])) };
}

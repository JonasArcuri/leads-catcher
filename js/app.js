import { isConfigured } from './config.js';
import { generateFirstMessage } from './message-agent.js';
import { generateAIMessage } from './ai-client.js';
import { whatsappUrl } from './whatsapp.js';
import { getLeads, createLead, updateLeadStatus, getLeadById } from './leads.js';
import { STATUSES, ORIGINS, originLabel, filterLeads, validateLead, summarize } from './lead-utils.js';

const $ = (selector) => document.querySelector(selector);
const state = { leads: [], loaded: false, loading: false, error: '', page: 1, saving: false, updating: false, detailId: null };
const pageSize = 10;
const messageDrafts = new Map();
let messageController = null;
const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' });
const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, style: 'percent' });
const numberFormat = new Intl.NumberFormat('pt-BR');
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const dateLabel = (value) => {
  if (!value) return 'Não informada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data inválida' : dateFormat.format(date);
};
const statusBadge = (value) => `<span class="badge status-${STATUSES.indexOf(value)}">${escape(value || 'Não informado')}</span>`;
const options = (values, selected, label = (value) => value) => values.map((value) => `<option value="${escape(value)}" ${value === selected ? 'selected' : ''}>${escape(label(value))}</option>`).join('');

function toast(message, error = false) {
  const element = document.createElement('div');
  element.className = `toast${error ? ' error' : ''}`;
  element.textContent = message;
  $('#toasts').append(element);
  setTimeout(() => element.remove(), 6000);
}
function errorMessage(error) {
  if (error?.code === '42501') return 'Acesso negado. Verifique as permissões e policies RLS no Supabase.';
  if (error?.code === 'PGRST116') return 'O registro não está disponível ou a operação foi bloqueada pelas policies.';
  return 'Não foi possível concluir a operação. Verifique a conexão, as credenciais e as policies do Supabase.';
}
function renderMetrics() {
  const summary = summarize(state.leads);
  const cards = [['Total de leads', 'total', 'Oportunidades na base'], ['Novos', 'Novo', 'Aguardando atendimento'], ['Qualificados', 'Qualificado', 'Potencial identificado'], ['Em contato', 'Em contato', 'Relacionamento em curso'], ['Convertidos', 'Convertido', 'Negócios concretizados']];
  $('#metrics').innerHTML = cards.map(([label, key, caption]) => `<article class="metric"><div class="metric-top"><span>${label}</span><span class="metric-dot" aria-hidden="true"></span></div><div class="metric-number ${state.loading ? 'loading' : ''}">${state.loaded ? numberFormat.format(summary[key]) : '—'}</div><p class="metric-caption">${caption}</p></article>`).join('');
}
function renderTable() {
  const filtered = filterLeads(state.leads, $('#search').value, $('#status-filter').value);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * pageSize;
  $('#lead-count').textContent = state.loaded ? numberFormat.format(state.leads.length) : '—';
  $('#clear-filters').hidden = !($('#search').value || $('#status-filter').value);
  $('#lead-rows').innerHTML = state.loaded ? filtered.slice(start, start + pageSize).map((lead) => `<tr><td>${escape(lead.nome_lead || 'Sem nome')}</td><td>${escape(lead.fone_lead || '—')}</td><td><span class="badge">${escape(originLabel(lead.ori_lead))}</span></td><td><span class="property-text" title="${escape(lead.imovel_lead)}">${escape(lead.imovel_lead || '—')}</span></td><td>${statusBadge(lead.status_lead)}</td><td>${dateLabel(lead.criado_em)}</td><td><button class="view-button" data-detail="${escape(lead.id)}" aria-label="Visualizar ${escape(lead.nome_lead)}">Visualizar</button></td></tr>`).join('') : '';
  const empty = $('#table-state');
  empty.hidden = false;
  if (state.loading) empty.innerHTML = '<p class="loading">Carregando leads...</p>';
  else if (!isConfigured) empty.innerHTML = '<svg class="state-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V7l9-4 9 4v14M8 21v-5h8v5M7 9h2m6 0h2M7 12h2m6 0h2"/></svg><h3>Sua próxima oportunidade começa aqui</h3><p>Conecte o Supabase para acompanhar seus leads, do primeiro contato à conversão.</p>';
  else if (state.error) empty.innerHTML = `<h3>Erro ao carregar os leads</h3><p>${escape(state.error)}</p><button class="button subtle" data-retry>Tentar novamente</button>`;
  else if (!state.leads.length) empty.innerHTML = '<h3>Nenhum lead cadastrado ainda.</h3><p>Registre o primeiro contato e comece a construir novas oportunidades.</p><button class="button primary" data-new>Cadastrar primeiro lead</button>';
  else if (!filtered.length) empty.innerHTML = '<h3>Nenhum lead encontrado para os filtros selecionados.</h3><p>Tente outro termo ou limpe os filtros.</p>';
  else empty.hidden = true;
  $('#result-count').textContent = state.loaded ? `${filtered.length ? start + 1 : 0}–${Math.min(start + pageSize, filtered.length)} de ${numberFormat.format(filtered.length)} leads${state.error ? ' · Dados da última consulta' : ''}` : 'Aguardando dados';
  $('#page-number').textContent = state.loaded ? `${state.page} / ${pages}` : '—';
  $('#previous-page').disabled = state.loading || state.page <= 1;
  $('#next-page').disabled = state.loading || state.page >= pages;
}
function chart(target, entries) {
  if (!state.loaded || !state.leads.length) {
    $(target).innerHTML = `<p class="analytics-empty">${state.loaded ? 'As análises aparecerão após o primeiro cadastro.' : 'Aguardando dados do Supabase.'}</p>`;
    return;
  }
  $(target).innerHTML = entries.map(([label, total]) => `<div class="chart-row"><div class="chart-label"><span>${escape(label)}</span><span>${total} · ${percentFormat.format(total / state.leads.length)}</span></div><progress max="${state.leads.length}" value="${total}" aria-label="${escape(label)}: ${total} leads"></progress></div>`).join('');
}
function renderStatusPie() {
  const target = $('#status-chart');
  const total = state.leads.length;
  if (!state.loaded || !total) {
    target.innerHTML = `<p class="analytics-empty">${state.loaded ? 'As análises aparecerão após o primeiro cadastro.' : 'Aguardando dados do Supabase.'}</p>`;
    return;
  }
  const statuses = [...new Set([...STATUSES, ...state.leads.map((lead) => lead.status_lead)])];
  let angle = -Math.PI / 2;
  const entries = statuses.map((status) => {
    const count = state.leads.filter((lead) => lead.status_lead === status).length;
    const fraction = count / total;
    const label = status || 'Não informado';
    const colorClass = `pie-color-${STATUSES.indexOf(status)}`;
    const description = `${label}: ${count} ${count === 1 ? 'lead' : 'leads'} (${percentFormat.format(fraction)})`;
    const start = angle;
    angle += fraction * Math.PI * 2;
    const point = (value) => `${100 + 90 * Math.cos(value)} ${100 + 90 * Math.sin(value)}`;
    let slice = '';
    if (count === total) slice = `<circle class="${colorClass}" cx="100" cy="100" r="90"><title>${escape(description)}</title></circle>`;
    else if (count) slice = `<path class="${colorClass}" d="M100 100 L${point(start)} A90 90 0 ${fraction > 0.5 ? 1 : 0} 1 ${point(angle)} Z"><title>${escape(description)}</title></path>`;
    return { label, count, fraction, colorClass, slice };
  });
  target.innerHTML = `<div class="status-pie-layout"><svg class="status-pie" viewBox="0 0 200 200" role="img" aria-labelledby="status-pie-title status-pie-description"><title id="status-pie-title">Porcentagem de leads por status</title><desc id="status-pie-description">${escape(entries.map(({ label, count, fraction }) => `${label}: ${count} leads, ${percentFormat.format(fraction)}`).join('; '))}</desc>${entries.map(({ slice }) => slice).join('')}</svg><ul class="pie-legend">${entries.map(({ label, count, fraction, colorClass }) => `<li><span class="pie-legend-label"><svg class="pie-swatch" viewBox="0 0 12 12" aria-hidden="true"><circle class="${colorClass}" cx="6" cy="6" r="5"/></svg>${escape(label)}</span><span class="pie-legend-value"><strong>${percentFormat.format(fraction)}</strong><span>${numberFormat.format(count)} ${count === 1 ? 'lead' : 'leads'}</span></span></li>`).join('')}</ul></div>`;
}
function renderAnalytics() {
  const origins = [...new Set([...ORIGINS, ...state.leads.map((lead) => lead.ori_lead)])];
  chart('#origin-chart', origins.map((origin) => [originLabel(origin), state.leads.filter((lead) => lead.ori_lead === origin).length]));
  renderStatusPie();
  $('#quality-rows').innerHTML = state.loaded ? origins.map((origin) => {
    const leads = state.leads.filter((lead) => lead.ori_lead === origin);
    const qualified = leads.filter((lead) => ['Qualificado', 'Em contato', 'Convertido'].includes(lead.status_lead)).length;
    const converted = leads.filter((lead) => lead.status_lead === 'Convertido').length;
    return `<tr><td>${escape(originLabel(origin))}</td><td>${leads.length}</td><td>${qualified}</td><td>${percentFormat.format(leads.length ? qualified / leads.length : 0)}</td><td>${converted}</td><td>${percentFormat.format(leads.length ? converted / leads.length : 0)}</td></tr>`;
  }).join('') : '<tr><td colspan="6">Aguardando dados do Supabase.</td></tr>';
}
function render() { renderMetrics(); renderTable(); renderAnalytics(); }
let pendingLoad = null;
function loadLeads() {
  if (pendingLoad) return pendingLoad;
  pendingLoad = fetchLeads().finally(() => { pendingLoad = null; });
  return pendingLoad;
}
async function fetchLeads() {
  if (state.loading || !isConfigured) return;
  state.loading = true;
  state.error = '';
  $('#refresh').disabled = true;
  $('#leads-section').setAttribute('aria-busy', 'true');
  render();
  try { state.leads = await getLeads(); state.loaded = true; }
  catch (error) { state.error = errorMessage(error); toast('Erro ao carregar os leads. ' + state.error, true); }
  finally { state.loading = false; $('#refresh').disabled = false; $('#leads-section').setAttribute('aria-busy', 'false'); render(); }
}
function navigate() {
  const view = location.hash.slice(1);
  const current = ['dashboard', 'leads', 'analises'].includes(view) ? view : 'dashboard';
  const titles = { dashboard: ['Dashboard', 'Visão geral dos leads e oportunidades da CRI.'], leads: ['Leads', 'Cada contato, uma nova possibilidade.'], analises: ['Análises', 'Transforme seus dados em melhores decisões.'] };
  $('#page-title').textContent = titles[current][0];
  $('#page-subtitle').textContent = titles[current][1];
  document.title = `${titles[current][0]} | CRI Leads`;
  document.querySelectorAll('[data-view]').forEach((link) => {
    if (link.dataset.view === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    link.setAttribute('aria-label', link.textContent.trim());
  });
  $('#metrics').hidden = current === 'leads';
  $('#leads-section').hidden = current === 'analises';
  $('#analytics-section').hidden = current !== 'analises';
}
function clearErrors() {
  document.querySelectorAll('.field-error').forEach((element) => { element.textContent = ''; });
  $('#lead-form').querySelectorAll('[aria-invalid]').forEach((element) => element.removeAttribute('aria-invalid'));
}
function openNew() {
  if (!isConfigured) { toast('Preencha as credenciais públicas no arquivo .env para cadastrar leads.', true); return; }
  $('#lead-form').reset();
  clearErrors();
  $('#lead-dialog').showModal();
}
async function submitLead(event) {
  event.preventDefault();
  if (state.saving) return;
  clearErrors();
  const input = Object.fromEntries(new FormData(event.currentTarget));
  const errors = validateLead(input);
  for (const [key, message] of Object.entries(errors)) { $(`#error-${key}`).textContent = message; $(`#${key}`).setAttribute('aria-invalid', 'true'); }
  if (Object.keys(errors).length) { $(`#${Object.keys(errors)[0]}`).focus(); return; }
  state.saving = true;
  $('#lead-form').querySelectorAll('button,input,select,textarea').forEach((element) => { element.disabled = true; });
  $('#submit-lead').textContent = 'Cadastrando...';
  try {
    await pendingLoad;
    const created = await createLead(input);
    state.leads = [created, ...state.leads];
    state.loaded = true;
    $('#lead-dialog').close();
    $('#lead-form').reset();
    toast('Lead cadastrado com sucesso.');
    render();
    state.detailId = String(created.id);
    renderDetails(created);
    $('#detail-dialog').showModal();
    await loadLeads();
  } catch (error) { $('#form-error').textContent = errorMessage(error); toast('Não foi possível cadastrar o lead.', true); }
  finally {
    state.saving = false;
    $('#lead-form').querySelectorAll('button,input,select,textarea').forEach((element) => { element.disabled = false; });
    $('#submit-lead').textContent = 'Cadastrar lead';
  }
}
function renderDetails(lead) {
  messageController?.abort();
  const fields = [['Nome', lead.nome_lead], ['Telefone', lead.fone_lead], ['Origem', originLabel(lead.ori_lead)], ['Data de entrada', dateLabel(lead.criado_em)], ['Status', lead.status_lead], ['Imóvel de interesse', lead.imovel_lead]];
  $('#detail-content').innerHTML = `<dl class="detail-list">${fields.map(([label, value]) => `<div${label === 'Imóvel de interesse' ? ' class="full"' : ''}><dt>${label}</dt><dd>${escape(value || 'Não informado')}</dd></div>`).join('')}</dl><form id="status-form" class="detail-status"><label for="detail-status">Editar status</label><select id="detail-status">${!STATUSES.includes(lead.status_lead) ? '<option value="" disabled selected>Selecione um status</option>' : ''}${options(STATUSES, lead.status_lead)}</select><p id="status-error" class="field-error" role="alert"></p><button class="button primary" type="submit">Salvar status</button></form>`;
  $('#status-form').addEventListener('submit', saveStatus);
  renderMessageAgent(lead);
}
function openWhatsApp(lead, message) {
  try {
    const draft = message ?? messageDrafts.get(String(lead.id)) ?? generateFirstMessage(lead);
    window.open(whatsappUrl(lead.fone_lead, draft), '_blank', 'noopener,noreferrer');
  } catch (error) { toast(error.message, true); }
}
function renderMessageAgent(lead) {
  const id = String(lead.id);
  const section = document.createElement('section');
  section.className = 'message-agent';
  section.setAttribute('aria-labelledby', 'message-title');
  section.innerHTML = `<h3 id="message-title">Sugestão de primeira mensagem</h3><p class="muted">Gerada por regras locais, sem IA externa. Revise antes de usar; nada é enviado automaticamente.</p><label for="message-draft">Mensagem para o lead</label><textarea id="message-draft" rows="8" placeholder="A sugestão aparecerá aqui."></textarea><p class="field-error" id="message-error" role="status"></p><div class="message-actions"><button type="button" class="button subtle" id="generate-message">Gerar novamente</button><button type="button" class="button primary" id="copy-message">Copiar mensagem</button></div><p class="message-note muted">Edições ficam disponíveis nesta sessão e não são salvas no banco.</p>`;
  $('#detail-content').append(section);
  const draft = section.querySelector('textarea');
  const whatsapp = document.createElement('button');
  whatsapp.type = 'button';
  whatsapp.className = 'button subtle whatsapp-button';
  whatsapp.textContent = 'Abrir WhatsApp';
  whatsapp.addEventListener('click', () => openWhatsApp(lead, draft.value));
  section.querySelector('.message-actions').append(whatsapp);
  const copy = section.querySelector('#copy-message');
  const feedback = section.querySelector('#message-error');
  const generateButton = section.querySelector('#generate-message');
  section.querySelector('.muted').textContent = 'Sugestão gerada por IA via Groq. Revise antes de usar; nada é enviado automaticamente.';
  async function generate() {
    messageController?.abort();
    const controller = new AbortController();
    messageController = controller;
    generateButton.disabled = true;
    generateButton.textContent = 'Gerando com IA...';
    draft.disabled = true;
    copy.disabled = true;
    whatsapp.disabled = true;
    section.setAttribute('aria-busy', 'true');
    feedback.textContent = '';
    try {
      const message = await generateAIMessage(lead, controller.signal);
      if (controller.signal.aborted || !section.isConnected) return;
      draft.value = message;
      messageDrafts.set(id, draft.value);
    } catch (error) {
      if (!controller.signal.aborted && section.isConnected) feedback.textContent = error.message || 'Erro de conexão com a IA. Tente novamente.';
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = 'Gerar com IA';
      draft.disabled = false;
      copy.disabled = !draft.value.trim();
      whatsapp.disabled = !draft.value.trim();
      section.setAttribute('aria-busy', 'false');
    }
  }
  if (messageDrafts.has(id)) draft.value = messageDrafts.get(id);
  else generate();
  copy.disabled = draft.disabled || !draft.value.trim();
  whatsapp.disabled = draft.disabled || !draft.value.trim();
  draft.addEventListener('input', () => {
    messageDrafts.set(id, draft.value);
    copy.disabled = !draft.value.trim();
    whatsapp.disabled = !draft.value.trim();
  });
  section.querySelector('#generate-message').addEventListener('click', generate);
  copy.addEventListener('click', async () => {
    copy.disabled = true;
    try {
      await navigator.clipboard.writeText(draft.value);
      toast('Mensagem copiada.');
    } catch {
      draft.focus();
      draft.select();
      feedback.textContent = 'Cópia automática indisponível. O texto está selecionado para você copiar manualmente.';
    } finally { copy.disabled = !draft.value.trim(); }
  });
}
async function openDetails(id) {
  state.detailId = id;
  $('#detail-content').innerHTML = '<p class="loading">Carregando detalhes...</p>';
  $('#detail-dialog').showModal();
  try {
    const lead = await getLeadById(id);
    if (state.detailId === id && $('#detail-dialog').open) renderDetails(lead);
  } catch (error) { if (state.detailId === id && $('#detail-dialog').open) $('#detail-content').textContent = errorMessage(error); }
}
async function saveStatus(event) {
  event.preventDefault();
  if (state.updating) return;
  const status = $('#detail-status').value;
  if (!STATUSES.includes(status)) { $('#status-error').textContent = 'Selecione um status válido.'; return; }
  state.updating = true;
  const form = event.currentTarget;
  const button = form.querySelector('button');
  form.querySelectorAll('button,select').forEach((element) => { element.disabled = true; });
  button.textContent = 'Salvando...';
  try {
    await pendingLoad;
    const updated = await updateLeadStatus(state.detailId, status);
    state.leads = state.leads.map((lead) => String(lead.id) === String(updated.id) ? updated : lead);
    render();
    renderDetails(updated);
    toast('Status atualizado com sucesso.');
  } catch (error) { $('#status-error').textContent = errorMessage(error); toast('Não foi possível atualizar o status.', true); }
  finally { state.updating = false; form.querySelectorAll('button,select').forEach((element) => { element.disabled = false; }); button.textContent = 'Salvar status'; }
}

$('#status-filter').insertAdjacentHTML('beforeend', options(STATUSES));
$('#ori_lead').insertAdjacentHTML('beforeend', options(ORIGINS, '', originLabel));
$('#status_lead').innerHTML = options(STATUSES, 'Novo');
$('#connection-notice').hidden = isConfigured;
$('#refresh').disabled = !isConfigured;
$('#lead-form').addEventListener('submit', submitLead);
$('#refresh').addEventListener('click', loadLeads);
for (const selector of ['#search', '#status-filter']) $(selector).addEventListener('input', () => { state.page = 1; renderTable(); });
$('#clear-filters').addEventListener('click', () => { $('#search').value = ''; $('#status-filter').value = ''; state.page = 1; renderTable(); });
$('#previous-page').addEventListener('click', () => { state.page--; renderTable(); });
$('#next-page').addEventListener('click', () => { state.page++; renderTable(); });
document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-new')) openNew();
  if (target.hasAttribute('data-retry')) loadLeads();
  if (target.hasAttribute('data-detail')) openDetails(target.dataset.detail);
  if (target.hasAttribute('data-close') && !state.saving && !state.updating) target.closest('dialog').close();
});
document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('cancel', (event) => { if (state.saving || state.updating) event.preventDefault(); });
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) && !state.saving && !state.updating) dialog.close();
  });
});
$('#detail-dialog').addEventListener('close', () => { state.detailId = null; messageController?.abort(); });
window.addEventListener('hashchange', navigate);
navigate();
render();
loadLeads();

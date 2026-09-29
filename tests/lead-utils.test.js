import test from 'node:test';
import assert from 'node:assert/strict';
import { filterLeads, validateLead, summarize } from '../js/lead-utils.js';

// Fixtures exclusivas dos testes; nunca importadas pela aplicação.
const lead = { nome_lead: 'João', fone_lead: '00123456789', imovel_lead: 'Apartamento', ori_lead: 'Indicacao', status_lead: 'Qualificado' };
test('busca ignora caixa e acentos e combina com status', () => {
  assert.equal(filterLeads([lead], 'JOAO', 'Qualificado').length, 1);
  assert.equal(filterLeads([lead], 'apartamento', 'Novo').length, 0);
  assert.equal(filterLeads([lead], 'Indicação', '').length, 1);
  assert.equal(filterLeads([lead], '  ', '').length, 1);
});
test('busca por telefone normaliza pontuação sem perder zeros', () => {
  assert.equal(filterLeads([lead], '00123', '').length, 1);
  assert.equal(filterLeads([{ ...lead, fone_lead: '+44 (20) 7946-0958' }], '442079460958', '').length, 1);
});
test('validação aceita números internacionais e rejeita campos vazios e enums desconhecidos', () => {
  assert.deepEqual(validateLead(lead), {});
  assert.deepEqual(validateLead({ ...lead, fone_lead: '+44 20 7946 0958' }), {});
  const errors = validateLead({ nome_lead: '  ', fone_lead: 'abc123', imovel_lead: '', ori_lead: 'Outro', status_lead: 'Inválido' });
  assert.equal(Object.keys(errors).length, 5);
  assert.ok(validateLead({ ...lead, fone_lead: '1234567890123456' }).fone_lead);
  assert.equal(lead.fone_lead, '00123456789');
});
test('indicadores incluem perdidos no total e acompanham mudanças de status', () => {
  const leads = [lead, { ...lead, status_lead: 'Perdido' }];
  assert.equal(summarize(leads).total, 2);
  assert.equal(summarize(leads).Qualificado, 1);
  leads[0] = { ...lead, status_lead: 'Convertido' };
  assert.equal(summarize(leads).Qualificado, 0);
  assert.equal(summarize(leads).Convertido, 1);
  assert.equal(summarize([]).total, 0);
});

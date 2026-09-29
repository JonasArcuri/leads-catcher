import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMessage } from '../api/generate-message.js';
const lead = { nome_lead: 'Ana Teste', imovel_lead: 'Apartamento com 2 quartos', fone_lead: 'não enviar' };
test('envia apenas nome e interesse e extrai resposta completa', async () => {
  const result = await generateMessage(lead, { key: 'test-only', fetcher: async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(body.messages[1].content), { nome_lead: lead.nome_lead, imovel_lead: lead.imovel_lead });
    assert.ok(body.messages[0].content.includes('Não invente'));
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'Olá, Ana!' } }] }) };
  } });
  assert.equal(result.message, 'Olá, Ana!');
});
test('valida entrada e configuração antes de chamar o provedor', async () => {
  await assert.rejects(generateMessage({}, { key: 'test' }), { status: 400 });
  await assert.rejects(generateMessage(lead, { key: '' }), { status: 503 });
});
test('trata limite de uso e não expõe resposta do provedor', async () => {
  await assert.rejects(generateMessage(lead, { key: 'test', fetcher: async () => ({ ok: false, status: 429 }) }), { status: 429 });
  await assert.rejects(generateMessage(lead, { key: 'test', fetcher: async () => ({ ok: true, json: async () => ({ choices: [{ finish_reason: 'length', message: { content: 'incompleta' } }] }) }) }), { status: 502 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { whatsappUrl } from '../js/whatsapp.js';

test('adiciona DDI brasileiro e preserva texto, acentos e quebras de linha', () => {
  const message = 'Olá, João!\nApartamento & casa?';
  const url = new URL(whatsappUrl('(47) 99999-1234', message));
  assert.equal(url.pathname, '/5547999991234');
  assert.equal(url.searchParams.get('text'), message);
});
test('preserva DDI explícito e normaliza prefixo internacional', () => {
  assert.ok(whatsappUrl('+1 202 555 0123', 'Oi').includes('/12025550123?'));
  assert.ok(whatsappUrl('0044 20 7946 0958', 'Oi').includes('/442079460958?'));
  assert.ok(whatsappUrl('5547999991234', 'Oi').includes('/5547999991234?'));
});
test('bloqueia telefone inválido e mensagem vazia', () => {
  for (const phone of ['', 'abc', '123', '0000000000']) assert.throws(() => whatsappUrl(phone, 'Oi'));
  assert.throws(() => whatsappUrl('47999991234', '  '));
});

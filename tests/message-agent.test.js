import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFirstMessage } from '../js/message-agent.js';

test('usa primeiro nome e preserva o interesse e os valores informados', () => {
  const message = generateFirstMessage({ nome_lead: ' Ana Silva ', imovel_lead: 'Apartamento com 3 suítes até R$ 2 milhões.' });
  assert.ok(message.includes('Olá, Ana!'));
  assert.ok(message.includes('Apartamento com 3 suítes até R$ 2 milhões.'));
  assert.ok(message.includes('CRI Soluções Imobiliárias'));
  assert.ok(message.includes('para morar ou investir?'));
});
test('exige dados reais e normaliza espaços', () => {
  assert.throws(() => generateFirstMessage(), /Informe o nome/);
  assert.throws(() => generateFirstMessage({ nome_lead: 'Ana', imovel_lead: ' ' }), /Informe o nome/);
  const message = generateFirstMessage({ nome_lead: 'Ana\nSilva', imovel_lead: 'Casa   na praia' });
  assert.ok(message.includes('Olá, Ana!'));
  assert.ok(message.includes('Casa na praia'));
});

test('adapta a pergunta ao objetivo sem acrescentar fatos sobre o imóvel', () => {
  const examples = [
    ['Apartamento para investimento', 'renda com aluguel ou valorização'],
    ['Casa para morar com a família', 'previsão de mudança'],
    ['Apartamento para locação', 'longo prazo ou para uma temporada'],
    ['Casa para férias', 'qual período'],
  ];
  for (const [interest, question] of examples) {
    const message = generateFirstMessage({ nome_lead: 'João Souza', imovel_lead: interest });
    assert.ok(message.includes(question));
    assert.ok(message.includes(interest));
    assert.ok(!message.includes('disponível'));
  }
});

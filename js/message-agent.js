// Gerador determinístico local: simula o fluxo do agente, sem utilizar um LLM.
export function generateFirstMessage({ nome_lead, imovel_lead } = {}) {
  const clean = (value) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const name = clean(nome_lead);
  const interest = clean(imovel_lead);
  if (!name || !interest) throw new Error('Informe o nome e o imóvel de interesse para gerar a sugestão.');
  const firstName = name.split(' ')[0];
  const context = interest.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  let question = 'Você procura esse imóvel para morar ou investir?';
  if (/\b(investimento|investir|rentabilidade|renda)\b/.test(context)) {
    question = 'Pensando no investimento, o que faz mais sentido para você: renda com aluguel ou valorização para uma venda futura?';
  } else if (/\b(morar|moradia|residir|mudanca)\b/.test(context)) {
    question = 'Você tem uma previsão de mudança ou está começando a conhecer as opções?';
  } else if (/\b(alugar|aluguel|locacao)\b/.test(context)) {
    question = 'Você busca uma locação de longo prazo ou para uma temporada?';
  } else if (/\b(temporada|ferias)\b/.test(context)) {
    question = 'Para qual período você procura o imóvel e quantas pessoas vão se hospedar?';
  }
  return `Olá, ${firstName}! Tudo bem? Sou da equipe da CRI Soluções Imobiliárias. Obrigado pelo contato!\n\nVi o que você está buscando: “${interest}”. Posso ajudar a avaliar opções que façam sentido para você.\n\n${question}\n\nPodemos conversar por aqui, no seu ritmo.`;
}

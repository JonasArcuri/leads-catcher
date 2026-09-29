export async function generateAIMessage(lead, signal) {
  const response = await fetch('/api/generate-message', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome_lead: lead.nome_lead, imovel_lead: lead.imovel_lead }),
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('API indisponível. Reinicie com npm run dev.'); }
  if (!response.ok) throw new Error(data.error || 'Erro ao gerar mensagem.');
  if (typeof data.message !== 'string' || !data.message.trim()) throw new Error('A IA retornou uma resposta vazia.');
  return data.message;
}
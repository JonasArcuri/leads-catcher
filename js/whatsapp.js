export function whatsappUrl(phone, message) {
  const raw = String(phone ?? '').trim();
  if (!/^\+?[\d\s().-]+$/.test(raw)) throw new Error('Telefone inválido. Informe DDD e número, ou +DDI para números internacionais.');
  let digits = raw.replace(/\D/g, '');
  const international = raw.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Números brasileiros com DDD, sem DDI explícito.
  if (!international && [10, 11].includes(digits.length)) digits = `55${digits}`;
  if (!/^[1-9]\d{6,14}$/.test(digits)) throw new Error('Telefone inválido. Confira o DDD e o DDI do lead.');
  if (typeof message !== 'string' || !message.trim()) throw new Error('Preencha a mensagem antes de abrir o WhatsApp.');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

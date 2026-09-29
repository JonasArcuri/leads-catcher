-- Consultas somente leitura sobre a tabela existente public.leads.

-- 1. Origem com maior volume (primeira linha; observar empates).
SELECT ori_lead AS origem, COUNT(*) AS total_leads
FROM public.leads
GROUP BY ori_lead
ORDER BY total_leads DESC, origem;

-- 2. Qualificação por origem: comparar percentual E tamanho da amostra.

SELECT ori_lead AS origem,
       COUNT(*) AS total_leads,
       COUNT(*) FILTER (WHERE status_lead IN ('Qualificado', 'Em contato', 'Convertido')) AS leads_qualificados,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status_lead IN ('Qualificado', 'Em contato', 'Convertido'))
             / NULLIF(COUNT(*), 0), 2) AS percentual_qualificados
FROM public.leads
GROUP BY ori_lead
ORDER BY percentual_qualificados DESC, total_leads DESC, origem;

-- 3. Status predominante: primeira linha; inclui eventuais valores legados.

SELECT status_lead, COUNT(*) AS quantidade
FROM public.leads
GROUP BY status_lead
ORDER BY quantidade DESC, status_lead;

-- 4. Conversão por origem: Convertido / todos os leads daquela origem.

SELECT ori_lead AS origem,
       COUNT(*) AS total_leads,
       COUNT(*) FILTER (WHERE status_lead = 'Convertido') AS convertidos,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status_lead = 'Convertido')
             / NULLIF(COUNT(*), 0), 2) AS taxa_conversao
FROM public.leads
GROUP BY ori_lead
ORDER BY taxa_conversao DESC, total_leads DESC, origem;

-- Não inferir qualidade apenas pelo volume: compare as consultas 1, 2 e 4.
-- Percentuais de origens com poucas observações podem variar muito.
-- As consultas descrevem o status atual, não um histórico de transições.
-- Sem registros, as consultas agrupadas retornam zero linhas, não conclusões.

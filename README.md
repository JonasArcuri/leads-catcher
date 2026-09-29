# CRI Leads

## Sobre o projeto
Desafio proposto pela empresa CRI Soluções Imobiliárias para criação de um Mini Sistema Automatizado, indagando captação, processamento e entrada de leads.

## Problema
Contatos recebidos por Site, WhatsApp e Indicação precisam de registro centralizado e acompanhamento e endereçamento, dados vindo da base de Dados Supabase. 

## Solução
Aplicação web que consulta a tabela existente `public.leads`, cadastra contatos e atualiza seu status. Todas as informações do dashboard vêm do Supabase. Sem credenciais, a aplicação exibe um estado de configuração pendente, sem inventar registros ou indicadores.

## Funcionalidades
- Dashboard com total, novos, qualificados, em contato e convertidos.
- Busca instantânea por nome, telefone, imóvel e origem, sem distinção de caixa/acentos; filtro de status combinado.
- Paginação visual de dez registros e carregamento completo em lotes, respeitando o limite de resposta do banco.
- Cadastro validado, detalhes consultados no banco e edição de status.
- Indicadores atualizados após gravação; feedback, erros próximos aos campos, loading, vazio e tentativas de recuperação.
- Análises por origem/status, qualificação e conversão, sem bibliotecas de gráficos.
- Navegação por hash, layout responsivo, tabela com rolagem, labels, foco visível e modais nativos com teclado/Escape e retorno de foco.

## Tecnologias
HTML5, CSS3, JavaScript puro (ES Modules), `@supabase/supabase-js`, PostgreSQL e Vercel. Vite é usado somente como servidor de desenvolvimento e ferramenta de build; não é framework de interface. Testes com o executor nativo do Node.js.
A escolha foi bem simples, algo responsivo e feito para web, perfeito para sistemas pequenos e de demonstração, utilizando HTML, CSS3 e Javascript.

## Arquitetura
Navegador → `app.js` (DOM/eventos) → `leads.js` (dados) → cliente Supabase → PostgreSQL.

`config.js` lê configuração pública; `supabase.js` apenas inicializa/exporta o cliente. `lead-utils.js` concentra validação, filtros e indicadores sem DOM. Não há backend próprio, autenticação, exclusão ou IA nesta etapa.

## Estrutura do projeto
```text
index.html
css/style.css
js/config.js
js/supabase.js
js/leads.js
js/lead-utils.js
js/app.js
database/analytics.sql
tests/lead-utils.test.js
.env.example
.gitignore
package.json
package-lock.json
vercel.json
README.md
```

## Banco de dados
Não é necessário criar nenhum banco, pois o sistema já faz acesso a base de dados Supabase.


Algumas indagações sobre a tabela leads, feita exclusivamente para os leads.

| Coluna | Uso |
| --- | --- |
| `id` | Chave primária, gerada pelo banco |
| `criado_em` | Timestamp, default `now()` |
| `nome_lead` | VARCHAR, nome |
| `fone_lead` | VARCHAR, tamanho(11) telefone preservado como texto |
| `imovel_lead` | VARCHAR, interesse |
| `ori_lead` | `Site`, `WhatsApp`, `Indicacao` |
| `status_lead` | `Novo`, `Qualificado`, `Em contato`, `Convertido`, `Perdido` |

O INSERT envia somente as cinco colunas de negócio. `id` e `criado_em` dependem dos defaults existentes. Datas são apresentadas em `pt-BR`, fuso `America/Sao_Paulo`. Se `criado_em` for timestamp sem fuso, confirme a convenção usada pelo banco; prefira respostas ISO com offset para evitar ambiguidades, sem alterar o schema nesta entrega.

### Interpretação de dados

Análise realizada em **29/09/2026**, por consulta real à tabela `public.leads` pela API do Supabase, usando a configuração pública da aplicação. Foram lidos **32 registros**, sem alterar o banco e sem extrair nomes ou telefones para esta análise.

**Consulta utilizada e reprodução**

Execute as consultas abaixo no SQL Editor do Supabase. Todas são somente leitura e também estão disponíveis em [database/analytics.sql](database/analytics.sql).

**1. Quantidade de leads por origem**

```sql
SELECT ori_lead AS origem, COUNT(*) AS total_leads
FROM public.leads
GROUP BY ori_lead
ORDER BY total_leads DESC, origem;
```

A primeira linha mostra a origem com mais leads; observe possíveis empates.

**2. Percentual de qualificados por origem**

```sql
SELECT ori_lead AS origem,
       COUNT(*) AS total_leads,
       COUNT(*) FILTER (
         WHERE status_lead IN ('Qualificado', 'Em contato', 'Convertido')
       ) AS leads_qualificados,
       ROUND(
         100.0 * COUNT(*) FILTER (
           WHERE status_lead IN ('Qualificado', 'Em contato', 'Convertido')
         ) / NULLIF(COUNT(*), 0), 2
       ) AS percentual_qualificados
FROM public.leads
GROUP BY ori_lead
ORDER BY percentual_qualificados DESC, total_leads DESC, origem;
```

**3. Distribuição de status**

```sql
SELECT status_lead, COUNT(*) AS quantidade
FROM public.leads
GROUP BY status_lead
ORDER BY quantidade DESC, status_lead;
```

**4. Conversão por origem**

```sql
SELECT ori_lead AS origem,
       COUNT(*) AS total_leads,
       COUNT(*) FILTER (WHERE status_lead = 'Convertido') AS convertidos,
       ROUND(
         100.0 * COUNT(*) FILTER (WHERE status_lead = 'Convertido')
         / NULLIF(COUNT(*), 0), 2
       ) AS taxa_conversao
FROM public.leads
GROUP BY ori_lead
ORDER BY taxa_conversao DESC, total_leads DESC, origem;
```

As consultas 3 e 4 permitem comparar o status predominante e a conversão de cada canal com seu volume de leads. Os resultados registrados abaixo foram obtidos pelo script [database/analyze-leads.mjs](database/analyze-leads.mjs), que consulta a API do Supabase e calcula as mesmas agregações em JavaScript; estas consultas SQL são a alternativa para reproduzir a análise no SQL Editor.

**Critério de qualificação:** seguindo a convenção analítica do projeto, contam como qualificados os status `Qualificado`, `Em contato` e `Convertido`. Essa convenção pressupõe que os dois últimos representam leads que passaram pela qualificação; não há histórico de transições para confirmar isso. Portanto, o indicador não representa apenas os registros cujo status atual é literalmente `Qualificado`.

Percentual de qualificados = quantidade de qualificados da origem ÷ total de leads da mesma origem × 100. Conversão usa a mesma fórmula, contando apenas `Convertido`.

| Origem | Total de leads | Qualificados (critério acima) | Qualificação | Convertidos | Conversão |
| --- | ---: | ---: | ---: | ---: | ---: |
| WhatsApp | 14 | 10 | 71,43% | 2 | 14,29% |
| Site | 10 | 5 | 50,00% | 1 | 10,00% |
| Indicação | 8 | 8 | 100,00% | 3 | 37,50% |
| **Total** | **32** | **23** | **71,88%** | **6** | **18,75%** |

**Qual origem gerou mais leads?** WhatsApp, com **14 dos 32 leads (43,75%)**, seguido de Site, com 10 (31,25%), e Indicação, com 8 (25,00%). A comparação usa a origem registrada em cada lead.

**Qual o percentual de leads qualificados em cada origem?** WhatsApp: **71,43% (10/14)**; Site: **50,00% (5/10)**; Indicação: **100,00% (8/8)**, conforme o critério declarado acima.

**Outro padrão relevante:** volume e conversão não têm a mesma liderança. Apesar de ter o menor volume, Indicação concentra **3 das 6 conversões (50%)** e apresenta a maior taxa de conversão (**37,50%**). WhatsApp lidera em captação, mas converteu 2 de 14 leads; Site tem as menores taxas de qualificação e conversão nesta amostra. Isso sugere investigar as características dos contatos e o atendimento por canal antes de decidir onde concentrar esforços. Sem dados de custo, tempo de atendimento e perfil dos leads, não é possível atribuir essas diferenças somente à origem nem concluir qual canal tem melhor retorno financeiro.

Na distribuição geral, há **10 Qualificados, 7 Em contato, 6 Novos, 6 Convertidos e 3 Perdidos**. Os 6 Novos representam **18,75% da base** e constituem um grupo a revisar no acompanhamento; o status, isoladamente, não comprova atraso no atendimento.

**Limites da análise:** trata-se de uma amostra pequena e de um retrato dos status atuais, sem filtro de período. Em Indicação, um único lead corresponde a 12,5 pontos percentuais, por isso os 100% de qualificação não garantem desempenho futuro. A leitura abrange os registros acessíveis à chave pública pelas regras de RLS; novos cadastros e alterações de status podem mudar os resultados. Leituras em múltiplos lotes não constituem um snapshot transacional. A tabela não identifica o autor do cadastro, portanto a consulta não distingue registros por quem os cadastrou.

Lembrando que foram dados ficticios e a análise pode mudar a qualquer momento a partir de geração de dados/alteração.
## Como executar
Use Node.js 22.12+ ou 24 LTS e npm.
```sh
npm install
npm run dev
```
Abra o endereço exibido pelo Vite (normalmente `http://127.0.0.1:5173`). Não abra `index.html` via `file://`. Em PowerShell com scripts bloqueados, use `npm.cmd` no lugar de `npm`.

```sh
npm test
npm run build
npm run preview
```
## Consultas SQL
Abra `database/analytics.sql` no SQL Editor do Supabase e execute uma consulta por vez ou o arquivo completo. São apenas SELECTs: volume por origem, qualificação por origem, distribuição de status e conversão por origem. Nenhuma consulta altera dados.

Qualificados = `Qualificado`, `Em contato` ou `Convertido`. Conversão = `Convertido`. As consultas ordenam os resultados para facilitar a identificação de maior volume, maior qualificação, maior conversão e status predominante. Considere empates e tamanho das amostras; não há conclusões pré-fabricadas. O SQL Editor pode usar um papel mais privilegiado que o navegador: diferenças de resultados exigem revisar RLS.

## Segurança
**Este protótipo não possui autenticação.** Permissões públicas de SELECT/INSERT/UPDATE permitem que qualquer pessoa com acesso à API leia contatos e grave dados. Use somente uma base de demonstração controlada e dados apropriados para esse contexto. Produção requer autenticação, autorização e policies restritivas antes de receber contatos pessoais reais.

```sql
-- SOMENTE protótipo público deliberadamente autorizado.
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON TABLE public.leads TO anon;
GRANT UPDATE (status_lead) ON TABLE public.leads TO anon;

CREATE POLICY "cri_prototype_select" ON public.leads
  FOR SELECT TO anon USING (true);
CREATE POLICY "cri_prototype_insert" ON public.leads
  FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cri_prototype_update" ON public.leads
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
```

Se `id` usa uma sequence e ocorrer `permission denied for sequence`, identifique a sequence real com `SELECT pg_get_serial_sequence('public.leads', 'id');` e conceda `USAGE` somente nela ao papel `anon`. Não invente o nome nem altere a coluna. Grants acima não revogam permissões mais amplas preexistentes; revise-as no painel. RLS desabilitado torna policies ineficazes. Nunca contorne RLS usando uma chave administrativa no navegador.

Valores do banco são escapados antes da renderização HTML. O formulário valida a experiência do usuário, mas validação no cliente não impede chamadas diretas à API. Limites e regras de integridade do banco permanecem sob a configuração existente.

### Possíveis erros de configuração
- Estado “Conecte sua base”: URL/chave ausente, placeholder, formato inválido ou chave não pública.
- `401` / invalid API key: chave incorreta ou de outro projeto.
- `42501` / permission denied: grants, RLS ou permissão de sequence.
- Tabela vazia inesperada: policy SELECT ausente/restritiva ou projeto errado.
- `PGRST116`: registro indisponível, UPDATE bloqueado ou retorno de linha bloqueado por RLS.
- Coluna/tabela não encontrada: confira exatamente o schema fornecido e a exposição na Data API.
- Falha de rede: confirme URL, conectividade e disponibilidade do projeto Supabase.
- Cadastro rejeitado: confira restrições/tamanhos reais dos VARCHARs e defaults de `id`/`criado_em`.

## Decisões técnicas
- HTML/CSS/JS bastam para três visualizações e modais; evitam complexidade de framework.
- Supabase oferece SDK e Data API para PostgreSQL, sem backend redundante.
- PostgreSQL suporta modelo relacional e agregações com `FILTER`, úteis para análise.
- Telefone é VARCHAR: preserva zeros, DDI e formatação; não sofre conversão numérica.
- Sem mocks em runtime: erros/configuração pendente são explícitos. Fixtures existem somente nos testes isolados.
- Indicadores são derivados dos registros reais e recalculados após escrita.
- Separação entre DOM, dados e funções puras facilita manutenção e futura API serverless.
- A paginação de leitura evita truncar os totais no limite padrão da API. Como são várias consultas, não representa snapshot transacional diante de alterações simultâneas; Atualizar reconcilia os dados. Para bases grandes, a evolução é agregação/paginação no servidor.
- `service_role` não aparece no frontend porque contorna RLS. Apenas credencial pública apropriada é aceita.
- Fonte usa Inter quando disponível, com fallback local Segoe UI/Arial, sem depender de carregamento externo.

## Agente de automação local e LLM em Cloud Gerenciada por GROQ

O Sistema utiliza uma LLM de baixo custo, proporcionando uma mensagem mais humanizada e atrativa para os leads, sua resposta é com base na descrição do item desejado do Lead.

Implementado em `api/generate-message.js`, modelo configurado openai/gpt-oss-120b.

Também foi Implementado um caso em que haja algum tipo de falha da chamada da API do Agente, o sistema irá gerar uma mensagem padronizada da CRI, Sendo alocado em `js/message-agent.js`: função `generateFirstMessage({ nome_lead, imovel_lead })` que gera uma primeira mensagem personalizada com saudação, identificação da CRI, interesse informado e pergunta para iniciar o atendimento.

Após cadastrar um lead, os detalhes abrem com a sugestão pronta. Para leads existentes, clique em **Visualizar**. A sugestão pode ser editada, regenerada e copiada; não é enviada ao WhatsApp porém, há um botão para enviar diretamente. As edições ficam somente na memória da página e são perdidas ao recarregar. “Gerar novamente” restaura o texto original, substituindo as edições. Sem permissão de clipboard, o texto é selecionado para cópia manual.


## Conclusões

Foi um projeto bem interessante, por mais que eu já tenha trabalhado em algo parecido nos meus projetos pessoais, eu usaria uma arquitetura diferente e um Backend mais robusto para larga escala. Utilização de um Front-end mais forte Como React, Tailwind, Material UI ou Shadcn/ui, Talvez Mocks para geração de Dados fictícios em um ambiente de testes.
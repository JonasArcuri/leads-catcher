# CRI Leads

## Sobre o projeto
Desafio proposto pela empresa CRI Soluções Imobiliárias para captação, processamento e entrada de leads em um Mini Sistema CRM.

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

## Etapa 4 — Agente de automação local e LLM em Cloud Gerenciada por GROQ

O Sistema utiliza uma LLM de baixo custo, proporcionando uma mensagem mais humanizada e atrativa para os leads, sua resposta é com base na descrição do item desejado do Lead.

Implementado em api/generate-message.js, modelo configurado openai/gpt-oss-120b.

Também foi Implementado um caso em que haja algum tipo de falha da chamada da API do Agente, o sistema irá gerar uma mensagem padronizada da CRI, Sendo alocado em `js/message-agent.js`: função `generateFirstMessage({ nome_lead, imovel_lead })` que gera uma primeira mensagem personalizada com saudação, identificação da CRI, interesse informado e pergunta para iniciar o atendimento.

Após cadastrar um lead, os detalhes abrem com a sugestão pronta. Para leads existentes, clique em **Visualizar**. A sugestão pode ser editada, regenerada e copiada; não é enviada ao WhatsApp porém, há um botão para enviar diretamente. As edições ficam somente na memória da página e são perdidas ao recarregar. “Gerar novamente” restaura o texto original, substituindo as edições. Sem permissão de clipboard, o texto é selecionado para cópia manual.


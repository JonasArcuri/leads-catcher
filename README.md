# CRI Leads

## Sobre o projeto
Mini CRM da CRI Soluções Imobiliárias para acompanhar oportunidades imobiliárias. Interface em português, navy e dourado, com referência institucional em https://www.imobiliariacri.com.br/. Implementação independente, sem copiar HTML/CSS do site.

## Problema
Contatos recebidos por Site, WhatsApp e Indicação precisam de registro centralizado e acompanhamento, substituindo anotações manuais.

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
A tabela **já deve existir**. Este projeto não cria tabela nem altera schema.

| Coluna | Uso |
| --- | --- |
| `id` | Chave primária, gerada pelo banco |
| `criado_em` | Timestamp, default `now()` |
| `nome_lead` | VARCHAR, nome |
| `fone_lead` | VARCHAR, telefone preservado como texto |
| `imovel_lead` | VARCHAR, interesse |
| `ori_lead` | `Site`, `WhatsApp`, `Indicacao` |
| `status_lead` | `Novo`, `Qualificado`, `Em contato`, `Convertido`, `Perdido` |

O INSERT envia somente as cinco colunas de negócio. `id` e `criado_em` dependem dos defaults existentes. Datas são apresentadas em `pt-BR`, fuso `America/Sao_Paulo`. Se `criado_em` for timestamp sem fuso, confirme a convenção usada pelo banco; prefira respostas ISO com offset para evitar ambiguidades, sem alterar o schema nesta entrega.

## Configuração Supabase
No painel do seu projeto, copie a Project URL e uma chave **publishable** (`sb_publishable_...`) ou a chave legada pública **anon**. Não utilize `service_role`, `sb_secret_...` ou credenciais administrativas.

Confirme que `public.leads` está exposta pela Data API, que as permissões SQL e as policies existentes permitem as três operações previstas. `UPDATE ... SELECT` e `INSERT ... SELECT` precisam também de acesso de leitura. O cliente confirma que uma linha foi retornada para não apresentar sucesso em atualizações silenciosamente bloqueadas.

## Variáveis/configuração
Copie `.env.example` para `.env`, na raiz:
```dotenv
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
```
As variáveis `VITE_` são públicas e incorporadas ao bundle. `.env` está ignorado pelo Git, mas isso não torna uma chave usada no navegador secreta. O código rejeita chaves secretas conhecidas e JWTs cujo papel não seja `anon`; essa verificação é preventiva, não substitui RLS. Reinicie o servidor ao modificar `.env`; na Vercel, faça novo build/deploy.

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

### Validação com a base real
As credenciais não acompanham o projeto. Os testes automatizados verificam lógica local; não provam conectividade nem persistência no seu Supabase.

1. **SELECT:** configure `.env`, inicie o app e clique em Atualizar. Compare a listagem/total com o Table Editor do Supabase. Com RLS, uma resposta vazia pode significar ausência de permissão, e não tabela vazia. Confira as policies.
2. **INSERT:** clique em Novo Lead, preencha os campos com um contato de teste autorizado e salve. Verifique o toast, a linha no dashboard e a linha no Table Editor, com `id` e `criado_em` gerados pelo banco. Atualize a página para confirmar persistência.
3. **UPDATE:** abra Visualizar, altere o status e salve. Confira o badge, os indicadores e `status_lead` no Table Editor. Atualize a página e confirme novamente.
4. Busque pelo nome/telefone/imóvel/origem e combine com status. Teste filtro sem resultados, acentos e telefone com/sem pontuação.
5. Teste campos em branco, telefone inválido/internacional, Escape, Tab, mobile, falha de conexão e nova tentativa. Durante envio, os controles ficam bloqueados para evitar duplo clique.
6. Análises e indicadores usam toda a base visível, independentemente dos filtros da listagem. Perdidos entram no total e no denominador das taxas.

Cadastros reais de teste permanecem no banco: a interface não oferece exclusão. Se a requisição de escrita perder a resposta por falha de rede, consulte a base antes de reenviar, pois a escrita pode ter sido concluída.

## Consultas SQL
Abra `database/analytics.sql` no SQL Editor do Supabase e execute uma consulta por vez ou o arquivo completo. São apenas SELECTs: volume por origem, qualificação por origem, distribuição de status e conversão por origem. Nenhuma consulta altera dados.

Qualificados = `Qualificado`, `Em contato` ou `Convertido`. Conversão = `Convertido`. As consultas ordenam os resultados para facilitar a identificação de maior volume, maior qualificação, maior conversão e status predominante. Considere empates e tamanho das amostras; não há conclusões pré-fabricadas. O SQL Editor pode usar um papel mais privilegiado que o navegador: diferenças de resultados exigem revisar RLS.

## Segurança
**Este protótipo não possui autenticação.** Permissões públicas de SELECT/INSERT/UPDATE permitem que qualquer pessoa com acesso à API leia contatos e grave dados. Use somente uma base de demonstração controlada e dados apropriados para esse contexto. Produção requer autenticação, autorização e policies restritivas antes de receber contatos pessoais reais.

As policies abaixo são documentação para o responsável pelo banco; **não são aplicadas automaticamente** e não recriam a tabela. Revise policies existentes para não duplicá-las. O exemplo pressupõe RLS habilitado; confirme em Table Editor → RLS antes de configurar:

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

## Deploy Vercel
1. Envie o repositório ao GitHub sem `.env` ou `node_modules`.
2. Importe na Vercel e use o preset Vite, comando `npm run build`, saída `dist` (já declarados em `vercel.json`).
3. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nos ambientes desejados.
4. Publique e repita os testes de SELECT/INSERT/UPDATE. As rotas usam hash e não exigem rewrites.

O projeto está preparado para deploy; esta implementação não cria projeto remoto nem publica automaticamente.

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

## Etapa 4 — Agente de automação local
Implementado em `js/message-agent.js`: função `generateFirstMessage({ nome_lead, imovel_lead })` que gera uma primeira mensagem personalizada com saudação, identificação da CRI, interesse informado e pergunta para iniciar o atendimento.

Conforme o escopo desta etapa, é uma **simulação determinística por regras**, não uma IA real. Não usa API, chave, serviços externos nem altera o banco. O texto do interesse é citado como informação recebida; o gerador não consulta estoque ou inventa preços, disponibilidade e características.

Após cadastrar um lead, os detalhes abrem com a sugestão pronta. Para leads existentes, clique em **Visualizar**. A sugestão pode ser editada, regenerada e copiada; não é enviada ao WhatsApp. As edições ficam somente na memória da página e são perdidas ao recarregar. “Gerar novamente” restaura o texto original, substituindo as edições. Sem permissão de clipboard, o texto é selecionado para cópia manual.

Para validar: cadastre um lead com nome e interesse, confira os dois na mensagem, edite e copie. Abra outro lead e confira a personalização. Execute `npm test` para verificar também os casos de dados ausentes e normalização de espaços. Nenhuma configuração adicional no `.env` é necessária.

## Melhorias futuras
Substituir o gerador local por um LLM, quando solicitado. Fluxo previsto: interface → API Serverless Vercel → LLM → mensagem. Segredos permanecerão no servidor; não há chamada de IA ou chave de LLM nesta entrega.

Também ficam para evolução: histórico de contatos, responsável pelo lead, login, perfis, funil/Kanban, agendamento de visitas, notas, integração WhatsApp, dashboard avançado e relatórios.

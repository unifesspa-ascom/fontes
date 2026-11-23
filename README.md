# Banco de Fontes — Unifesspa

Protótipo da ASCOM para que jornalistas encontrem docentes disponíveis para entrevistas por temas e áreas de atuação. A participação é voluntária, mediante confirmação de e-mail e aprovação pela ASCOM.

## Componentes

- `index.html`: catálogo público. Lê exclusivamente `dados/docentes-cadastrados.json`.
- `cadastro/index.html`: formulário de participação e recusa.
- `ascom/index.html`: painel de moderação, protegido por senha no Apps Script.
- `apps-script.js`: backend Google Apps Script conectado a uma planilha institucional com abas `SIGAA`, `Cadastros` e `Buscas`.
- `demo/` e `scripts/gerar_demo.py`: demonstração com perfis fictícios.
- `scripts/scrape_sigaa.py`: coletor experimental; **não usar para publicar dados identificadores**.

## Privacidade

A planilha SIGAA, números SIAPE, e-mails, telefones, tokens de confirmação, fotos privadas e credenciais não devem ser enviados ao repositório público. O JSON público deve conter somente informações autorizadas dos perfis aprovados. A exclusão de fotos do branch não elimina cópias existentes no histórico Git; evitar publicar fotos antes da aprovação e definir política de retenção.

## Implantação

1. Configurar as propriedades `GITHUB_TOKEN`, `SENHA_ASCOM` e, quando necessário, `PLANILHA_ID` e `PASTA_FOTOS_ID` no Apps Script. Nunca colocá-las no código.
2. Conferir as abas privadas e a execução de `configuracaoInicial` em ambiente controlado.
3. Implantar o Apps Script como aplicativo Web, atualizar a URL nos frontends quando a implantação mudar e verificar as permissões de acesso.
4. Validar o fluxo completo antes de convidar professores: SIAPE → cadastro → e-mail → confirmação → moderação → JSON público → busca.

**Estado (22/11/2026):** correções e testes em andamento no PR #1, ainda **não mesclado**. O ambiente institucional de produção permanece separado e não foi alterado pelos testes descritos abaixo. A confirmação do domínio de e-mail não comprova que o endereço pertence ao SIAPE informado; a ASCOM precisa verificar a identidade por canal institucional independente antes de aprovar docentes reais.

## Acompanhamento do piloto — 22/11/2026

### Ambientes e isolamento

- **Produção:** repositório `unifesspa-ascom/fontes`, branch `main`, site https://unifesspa-ascom.github.io/fontes/; Apps Script e planilha institucionais preservados. **Não mesclar PR #1 nem publicar cadastros reais sem autorização.**
- **Desenvolvimento:** branch `fix/fluxo-cadastro-confirmacao-20261121`, PR #1; arquivos de teste em `docs/teste/`.
- **Teste privado:** repositório `unifesspa-ascom/fontes-teste` (branch `main`), arquivo `dados/docentes-cadastrados.json`. Apps Script e planilha pessoais separados, com aba `SIGAA` contendo apenas a **Professora Teste**, SIAPE fictício `9999999`. O teste usa um e-mail institucional real para receber confirmações, mas **não é prova de identidade**.
- O token fine-grained fica somente nas propriedades do Apps Script pessoal, restrito ao repositório `fontes-teste`, com permissão Contents de leitura e escrita. **Nunca inserir tokens, senhas ou dados privados no GitHub.** A senha de moderação está em `SENHA_ASCOM`; a planilha é apontada por `PLANILHA_ID`.
- No Apps Script pessoal, conferir `GITHUB_REPO = 'fontes-teste'` e `EMAIL_ASCOM` apontando para um destinatário de teste antes de novos envios; não notificar a ASCOM institucional em simulações.

### Resultados verificados

| Etapa | Resultado |
| --- | --- |
| Identificação pelo SIAPE fictício | Funcionou com a base SIGAA privada |
| Cadastro via função de backend | Linha criada na planilha e e-mail enviado |
| Confirmação de e-mail | Cadastro passou para `aguardando_ascom` |
| Login e consulta no painel administrativo | Funcionaram com a senha de teste |
| GitHub: leitura autenticada | HTTP 200 |
| GitHub: escrita isolada | Arquivo `dados/teste-conexao.json` criado no repositório privado |
| Publicação simulada | Perfil fictício gravado no JSON privado, sem SIAPE, e-mail ou WhatsApp |
| Aprovação integrada via backend | `status: ok`; planilha e JSON sincronizados |
| Cadastro pela interface visual | Envio e confirmação por e-mail funcionaram |
| Atualização e substituição | Cadastro anterior `substituido`, novo `aprovado`; apenas um perfil no JSON |
| Retirada | Novo cadastro `retirado`; JSON com zero perfis; histórico preservado |
| Rejeição | Terceiro cadastro `rejeitado`; JSON permaneceu com zero perfis |

**Estado final confirmado da planilha de teste (22/11/2026):** três registros da Professora Teste, com status `substituido`, `retirado` e `rejeitado`. **Estado final confirmado do JSON privado:** `docentes: []`. Nenhuma publicação de docente real foi realizada.

As aprovações integradas usaram **conferência de identidade simulada** somente para o SIAPE fictício; isso não valida a conferência de identidade de pessoas reais. As ações de moderação foram exercitadas por funções executadas no editor do Apps Script, **não pelos botões do painel visual**.

### Arquivos de teste

- `docs/teste/Codigo.gs`: referência do backend de teste; manter sincronizada com a versão efetivamente implantada no Apps Script pessoal.
- `docs/teste/cadastro.html`: formulário visual ligado ao backend de teste, aberto localmente a partir de Raw.
- `docs/teste/painel-ascom.html`: painel de consulta; botões de aprovação/rejeição desativados deliberadamente.
- `docs/teste/demo-preview.html` e `docs/teste/docentes-aprovados-preview.json`: demonstração fictícia estática, distinta do JSON efetivamente publicado.
- `docs/teste/simular-publicacao.gs`, `testar-aprovacao-integrada.gs`, `testar-substituicao-ficticia.gs`, `testar-retirada-ficticia.gs` e `testar-rejeicao-ficticia.gs`: testes manuais isolados; **não copiar para produção**.

### Próximos passos antes de liberar o piloto

1. Criar uma **segunda docente inteiramente fictícia** na planilha SIGAA pessoal e testar cadastro/confirmação sem ultrapassar os limites por SIAPE/e-mail.
2. Preparar um **painel visual de moderação exclusivamente de teste**, com proteções no servidor e distinção explícita entre identidade simulada e identidade realmente conferida; testar aprovação, rejeição e retirada pelos botões.
3. Testar falhas de GitHub, envio de e-mail, reenvio, duplicações, rollback e recuperação, sem alterar produção.
4. Revisar convite restrito, confirmação de identidade, proteção do painel, quotas do Apps Script/MailApp, LGPD, dados publicados e política de fotos.
5. Reavaliar UX de correção de cadastros pendentes (evitar novos registros a cada ajuste), documentar operação/transferência institucional e só então avaliar a liberação do PR #1.

**Limites de envio atualmente implementados:** até 3 cadastros por SIAPE em 24 horas e até 5 por e-mail em 24 horas; não existe limite global de 24 docentes/dia no código. A capacidade efetiva depende das quotas do Google Apps Script e do envio de e-mails.


## Operação e continuidade

O projeto deve ser mantido por contas e recursos institucionais, com documentação de transferência para a ASCOM/CTIC. Não depender de licenças ou contas pessoais.

Consulte `docs/plano-recuperacao-cadastro.md` para a auditoria e os critérios de liberação do piloto.

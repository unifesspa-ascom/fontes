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

**Estado (21/11/2026):** há correções em desenvolvimento no PR #1; não considerar a versão do PR pronta para produção. A verificação do domínio de e-mail não comprova, isoladamente, que o endereço pertence ao SIAPE informado. É necessário controle adicional de identidade e moderação.

## Operação e continuidade

O projeto deve ser mantido por contas e recursos institucionais, com documentação de transferência para a ASCOM/CTIC. Não depender de licenças ou contas pessoais.

Consulte `docs/plano-recuperacao-cadastro.md` para a auditoria e os critérios de liberação do piloto.

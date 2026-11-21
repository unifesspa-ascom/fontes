# Banco de Fontes — plano de recuperação do fluxo de cadastro

## Fontes auditadas (21/11/2026)
- Frontends versionados: `cadastro/index.html`, `ascom/index.html`, `index.html`.
- Backend do GitHub: `apps-script.js` (versão antiga).
- Backend mais recente: código Apps Script fornecido pela equipe, ainda **não sincronizado** com o repositório.
- Planilha vinculada: abas `SIGAA`, `Cadastros` e `Buscas`; não copiar dados privados para o repositório.

## Constatações
1. O Apps Script mais recente já implementa as ações `verificar`, `cadastro`, `recusa`, `painel`, `moderar`, `buscar`, `metricas` e `confirmar`. Não reimplementar a partir do backend antigo.
2. A validação de domínio `@unifesspa.edu.br` e o link de confirmação de 48 horas já existem.
3. A recusa é gravada com base apenas no SIAPE, sem confirmação de e-mail; corrigir antes de convidar docentes.
4. A confirmação prova controle do endereço informado, mas não o vínculo desse endereço ao SIAPE. Tratar como limitação explícita do protótipo, com moderação humana; não prometer autenticação institucional.
5. Na moderação, o status da planilha pode mudar antes da conclusão das operações no GitHub. Projetar recuperação/reconciliação de falhas.
6. O cadastro é gravado antes do envio de e-mail; se MailApp falhar, o registro pode ficar pendente sem mensagem entregue. Implementar reenvio controlado e tratamento de falhas.
7. A limitação de requisições usa cache global por ação, podendo bloquear usuários distintos.
8. Não publicar SIAPE, e-mail, telefone, tokens, fotos privadas ou planilha de docentes no GitHub.

## Etapas propostas
- [ ] Sincronizar o backend atual com o repositório, removendo segredos e mantendo propriedades do script.
- [ ] Revisar compatibilidade de payloads entre HTML e Apps Script.
- [ ] Exigir confirmação do e-mail institucional também para a recusa.
- [ ] Tratar falhas de e-mail e reenvio de confirmação sem criar duplicidades.
- [ ] Tornar moderação/publicação recuperáveis quando GitHub ou Drive falharem.
- [ ] Criar testes de regressão para estados: novo, aguardando_email, aguardando_ascom, aprovado, recusou, rejeitado, retirado e substituido.
- [ ] Testar ponta a ponta com registro de teste controlado; nunca com identidade real de docente sem autorização.
- [ ] Documentar implantação manual do Apps Script e configurações necessárias.

## Critérios para liberar convite coletivo
- Cadastro, confirmação, recusa e moderação demonstrados em implantação de teste.
- JSON público conferido sem dados privados.
- Repositório e Apps Script em versões sincronizadas.
- Nenhum teste altera os dados de docentes reais ou publica perfis sem consentimento.

> Este documento é um plano de correção; não significa que as mudanças de código já foram aplicadas ou implantadas.

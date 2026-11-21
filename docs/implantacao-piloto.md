# Implantação controlada — Banco de Fontes

## Antes de publicar
1. Confirmar que os testes do PR passaram e revisar o diff, especialmente `apps-script.js`, `cadastro/index.html` e `ascom/index.html`.
2. Conferir que o repositório não contém planilhas privadas, SIAPEs, e-mails, tokens, credenciais ou fotografias sem autorização.
3. Verificar se o Apps Script em produção está vinculado à planilha institucional correta e se os segredos estão em **Propriedades do script**, nunca no código.
4. Garantir que o token GitHub tem escopo mínimo para o repositório e que a senha administrativa é forte. A senha compartilhada é solução provisória para o protótipo.
5. Confirmar que a ASCOM possui um procedimento independente para verificar se SIAPE e e-mail pertencem ao mesmo docente. A caixa de confirmação no painel é uma declaração humana, não verificação automática.

## Implantar (após aprovação)
1. Fazer backup do Apps Script atual e registrar o identificador da implantação em uso.
2. Atualizar o código do projeto Apps Script com a versão aprovada de `apps-script.js`.
3. Revisar permissões solicitadas e criar uma **nova versão** da implantação web existente; preservar a URL se possível.
4. Se a URL mudar, atualizar `APPS_SCRIPT_URL` nas páginas públicas e administrativas.
5. Testar primeiro com dados controlados, sem enviar convites em massa.

## Critérios de aceite
- Consulta de SIAPE, cadastro e recusa respondem corretamente.
- Link recebido no e-mail institucional; confirmação altera estado uma única vez.
- Reenvio funciona e não revela existência de cadastro.
- ASCOM não consegue aprovar sem atestar conferência de identidade.
- Aprovação publica somente campos consentidos; SIAPE, e-mail e WhatsApp não aparecem no JSON público.
- Retirada remove o perfil do catálogo; falhas de publicação não deixam estados divergentes.
- Fotos novas são publicadas antes de aparecerem no JSON; fotos antigas só são removidas após atualização.
- Testes automatizados e verificação manual em navegador concluídos.

## Limitações conhecidas / bloqueadores
- O Apps Script público não oferece IP confiável: limites por identificador não substituem proteção contra ataques distribuídos ou enumeração de SIAPEs.
- O bloqueio global de senha foi removido para evitar indisponibilidade causada por terceiros, mas a limitação por tentativa incorreta é insuficiente contra força bruta distribuída. A senha compartilhada deve ser substituída por autenticação institucional quando viável.
- A confirmação agora exige clique explícito em uma página intermediária; verificar seu funcionamento no Apps Script real, inclusive em clientes de e-mail institucionais.
- O backend não prova automaticamente a correspondência SIAPE/e-mail.
- Publicação GitHub + planilha não é transação atômica. Recuperação e reconciliação manual permanecem necessárias em falhas excepcionais.
- Fotos removidas do branch podem permanecer no histórico Git e caches externos.

**Não realizar o piloto real antes de resolver ou aceitar formalmente esses riscos e executar os testes de ponta a ponta.**

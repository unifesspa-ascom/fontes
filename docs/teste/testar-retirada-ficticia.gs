/**
 * TESTE ISOLADO: retirada do único perfil fictício publicado.
 * Executar manualmente UMA VEZ apenas no Apps Script pessoal.
 * Não comprova identidade e não altera o sistema institucional.
 */
function testarRetiradaFicticia() {
  if (GITHUB_OWNER !== 'unifesspa-ascom' ||
      GITHUB_REPO !== 'fontes-teste' ||
      GITHUB_PATH !== 'dados/docentes-cadastrados.json' ||
      GITHUB_BRANCH !== 'main') {
    throw new Error('Bloqueado: repositório diferente do ambiente de teste.');
  }
  if (PropertiesService.getScriptProperties().getProperty('PLANILHA_ID') !==
      '1fwpmgqLSRYs99jtDaLsnZcJ4zpEQ5NiXYkktpZPRP_8') {
    throw new Error('Bloqueado: planilha diferente da planilha pessoal de teste.');
  }
  const rows = lerCadastros(abaCadastros());
  const aprovados = rows.filter(function(r) { return r.status === 'aprovado'; });
  if (rows.length !== 2 || aprovados.length !== 1 ||
      rows.filter(function(r) { return r.status === 'substituido'; }).length !== 1 ||
      rows.some(function(r) {
        return String(r.siape) !== '9999999' ||
          String(r.nome) !== 'Professora Teste' ||
          String(r.unidade) !== 'Instituto de Testes';
      })) {
    throw new Error('Bloqueado: esperado um único cadastro fictício aprovado e um substituído.');
  }
  const senha = PropertiesService.getScriptProperties().getProperty('SENHA_ASCOM');
  if (!senha) throw new Error('SENHA_ASCOM ausente.');
  const resultado = moderar({
    senha: senha, id: aprovados[0].id, decisao: 'retirar'
  });
  console.log('Resultado da retirada: ' + JSON.stringify(resultado));
  if (!resultado || resultado.status !== 'ok') {
    throw new Error('Retirada falhou: ' + (resultado && resultado.msg || 'erro desconhecido'));
  }
  const depois = lerCadastros(abaCadastros());
  const retirado = depois.filter(function(r) { return r.id === aprovados[0].id; })[0];
  if (!retirado || retirado.status !== 'retirado') {
    throw new Error('Status não confirmado na planilha. Verifique manualmente.');
  }
  console.log('SUCESSO: perfil fictício retirado; histórico preservado na planilha.');
  console.log('Confira no GitHub se docentes está vazio.');
}

/** TESTE PRIVADO: rejeita apenas o terceiro cadastro fictício, sem publicação. */
function testarRejeicaoFicticia() {
  if (GITHUB_OWNER !== 'unifesspa-ascom' ||
      GITHUB_REPO !== 'fontes-teste' ||
      GITHUB_PATH !== 'dados/docentes-cadastrados.json' ||
      GITHUB_BRANCH !== 'main') {
    throw new Error('Bloqueado: repositório não é o de teste.');
  }
  if (PropertiesService.getScriptProperties().getProperty('PLANILHA_ID') !==
      '1fwpmgqLSRYs99jtDaLsnZcJ4zpEQ5NiXYkktpZPRP_8') {
    throw new Error('Bloqueado: planilha diferente da pessoal de teste.');
  }
  const rows = lerCadastros(abaCadastros());
  const fake = rows.filter(function(r) {
    return String(r.siape) === '9999999' &&
      String(r.nome) === 'Professora Teste' &&
      String(r.unidade) === 'Instituto de Testes';
  });
  const pendentes = fake.filter(function(r) { return r.status === 'aguardando_ascom'; });
  if (rows.length !== 3 || fake.length !== 3 || pendentes.length !== 1 ||
      fake.filter(function(r) { return r.status === 'substituido'; }).length !== 1 ||
      fake.filter(function(r) { return r.status === 'retirado'; }).length !== 1) {
    throw new Error('Bloqueado: esperado apenas três registros fictícios com estados conhecidos.');
  }
  const senha = PropertiesService.getScriptProperties().getProperty('SENHA_ASCOM');
  if (!senha) throw new Error('SENHA_ASCOM ausente.');
  const resultado = moderar({ senha: senha, id: pendentes[0].id, decisao: 'rejeitar' });
  console.log('Resultado da rejeição: ' + JSON.stringify(resultado));
  if (!resultado || resultado.status !== 'ok') {
    throw new Error('Rejeição falhou: ' + (resultado && resultado.msg || 'erro desconhecido'));
  }
  const depois = lerCadastros(abaCadastros());
  const alvo = depois.filter(function(r) { return r.id === pendentes[0].id; })[0];
  if (!alvo || alvo.status !== 'rejeitado') {
    throw new Error('Status inesperado após rejeição. Confira a planilha.');
  }
  console.log('SUCESSO: cadastro fictício rejeitado e histórico preservado.');
}

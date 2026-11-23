/**
 * TESTE EXCLUSIVO: substituição de cadastro fictício no ambiente privado.
 * Identidade simulada; jamais copiar para o projeto institucional.
 * Executar uma única vez no Apps Script pessoal.
 */
function testarSubstituicaoFicticia() {
  if (GITHUB_OWNER !== 'unifesspa-ascom' ||
      GITHUB_REPO !== 'fontes-teste' ||
      GITHUB_PATH !== 'dados/docentes-cadastrados.json' ||
      GITHUB_BRANCH !== 'main') {
    throw new Error('Bloqueado: destino GitHub inesperado.');
  }
  if (PropertiesService.getScriptProperties().getProperty('PLANILHA_ID') !==
      '1fwpmgqLSRYs99jtDaLsnZcJ4zpEQ5NiXYkktpZPRP_8') {
    throw new Error('Bloqueado: planilha não é a planilha pessoal de teste.');
  }
  const rows = lerCadastros(abaCadastros());
  const fake = rows.filter(function (r) {
    return String(r.siape) === '9999999' &&
      String(r.nome) === 'Professora Teste' &&
      String(r.unidade) === 'Instituto de Testes';
  });
  const anteriores = fake.filter(function (r) { return r.status === 'aprovado'; });
  const novos = fake.filter(function (r) { return r.status === 'aguardando_ascom'; });
  if (rows.length !== 2 || fake.length !== 2 ||
      anteriores.length !== 1 || novos.length !== 1) {
    throw new Error('Bloqueado: esperados exatamente dois registros fictícios, um aprovado e outro aguardando ASCOM.');
  }
  const senha = PropertiesService.getScriptProperties().getProperty('SENHA_ASCOM');
  if (!senha) throw new Error('SENHA_ASCOM não configurada.');
  // Identidade conferida = true SOMENTE nesta simulação controlada com dados fictícios.
  const resultado = moderar({
    senha: senha,
    id: novos[0].id,
    decisao: 'aprovar',
    identidade_conferida: true
  });
  console.log('Resultado da substituição simulada: ' + JSON.stringify(resultado));
  if (!resultado || resultado.status !== 'ok') {
    throw new Error('Moderação não concluída: ' + (resultado && resultado.msg || 'erro desconhecido'));
  }
  const depois = lerCadastros(abaCadastros());
  const antigo = depois.filter(function (r) { return r.id === anteriores[0].id; })[0];
  const novo = depois.filter(function (r) { return r.id === novos[0].id; })[0];
  if (!antigo || antigo.status !== 'substituido' || !novo || novo.status !== 'aprovado') {
    throw new Error('Status inesperados após moderação. Conferir planilha e JSON manualmente.');
  }
  console.log('SUCESSO: cadastro anterior substituído e novo cadastro aprovado.');
  console.log('Conferência de identidade SIMULADA, não realizada.');
}

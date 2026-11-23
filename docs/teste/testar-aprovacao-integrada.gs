/**
 * Teste de integração da moderação, EXCLUSIVO do ambiente pessoal.
 * A confirmação de identidade é SIMULADA para o registro fictício 9999999.
 * NUNCA usar para cadastros reais ou copiar para o Apps Script institucional.
 *
 * Pré-requisito: o JSON de teste já contém a publicação simulada.
 */
function testarAprovacaoIntegradaFicticia() {
  if (GITHUB_OWNER !== 'unifesspa-ascom' ||
      GITHUB_REPO !== 'fontes-teste' ||
      GITHUB_PATH !== 'dados/docentes-cadastrados.json' ||
      GITHUB_BRANCH !== 'main') {
    throw new Error('Bloqueado: destino GitHub não é o repositório isolado.');
  }
  const esperado = '1fwpmgqLSRYs99jtDaLsnZcJ4zpEQ5NiXYkktpZPRP_8';
  if (PropertiesService.getScriptProperties().getProperty('PLANILHA_ID') !== esperado) {
    throw new Error('Bloqueado: planilha diferente da planilha pessoal de teste.');
  }
  const rows = lerCadastros(abaCadastros());
  const alvos = rows.filter(function(r) {
    return String(r.siape) === '9999999' &&
      String(r.nome) === 'Professora Teste' &&
      String(r.unidade) === 'Instituto de Testes' &&
      String(r.status) === 'aguardando_ascom';
  });
  if (alvos.length !== 1 || rows.some(function(r) {
    return r.status === 'aprovado' || (r.status === 'aguardando_ascom' && r.id !== alvos[0].id);
  })) {
    throw new Error('Bloqueado: exige um único cadastro fictício pendente e nenhum cadastro já aprovado.');
  }
  const r = alvos[0];
  // No teste, este sinal é explicitamente uma SIMULAÇÃO, não uma verificação de identidade.
  // Exercita o caminho de produção sem alterar o mecanismo de validação para docentes reais.
  const senha = PropertiesService.getScriptProperties().getProperty('SENHA_ASCOM');
  if (!senha) throw new Error('SENHA_ASCOM ausente.');
  const resultado = moderar({
    senha: senha, id: r.id, decisao: 'aprovar', identidade_conferida: true
  });
  console.log('Resultado da moderação simulada: ' + JSON.stringify(resultado));
  if (!resultado || resultado.status !== 'ok') {
    throw new Error('Aprovação simulada não concluída: ' + (resultado && resultado.msg || 'erro desconhecido'));
  }
  const atualizado = lerCadastros(abaCadastros()).filter(function(x) { return x.id === r.id; })[0];
  if (!atualizado || atualizado.status !== 'aprovado') {
    throw new Error('GitHub pode ter sido atualizado, mas o status da planilha não corresponde; verificar manualmente.');
  }
  console.log('SUCESSO: fluxo real de moderação executado sobre docente fictícia no ambiente privado.');
  console.log('A conferência de identidade foi simulada, NÃO realizada.');
}

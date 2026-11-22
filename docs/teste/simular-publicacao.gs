/**
 * TESTE ISOLADO: publica SOMENTE o perfil fictício na base privada fontes-teste.
 * Não altera status, não aprova identidade e não publica em produção.
 * Executar manualmente no Apps Script pessoal, uma única vez.
 */
function simularPublicacaoProfessoraTeste() {
  if (GITHUB_OWNER !== 'unifesspa-ascom' ||
      GITHUB_REPO !== 'fontes-teste' ||
      GITHUB_PATH !== 'dados/docentes-cadastrados.json' ||
      GITHUB_BRANCH !== 'main') {
    throw new Error('Bloqueado: destino GitHub diferente do ambiente de teste.');
  }
  const planilhaEsperada = '1fwpmgqLSRYs99jtDaLsnZcJ4zpEQ5NiXYkktpZPRP_8';
  const idConfigurado = PropertiesService.getScriptProperties().getProperty('PLANILHA_ID');
  if (idConfigurado !== planilhaEsperada) {
    throw new Error('Bloqueado: PLANILHA_ID não é a planilha pessoal de teste.');
  }

  const registros = lerCadastros(abaCadastros()).filter(function (r) {
    return String(r.siape) === '9999999' &&
           String(r.nome) === 'Professora Teste' &&
           String(r.unidade) === 'Instituto de Testes' &&
           String(r.status) === 'aguardando_ascom';
  });
  if (registros.length !== 1) {
    throw new Error('Esperado exatamente um registro fictício aguardando a ASCOM; encontrados: ' + registros.length);
  }
  const r = registros[0];
  let formacoes = [];
  try { formacoes = JSON.parse(r.formacoes || '[]'); }
  catch (e) { throw new Error('Formações fictícias inválidas.'); }
  if (!Array.isArray(formacoes)) throw new Error('Formações não são uma lista.');

  // Lista explícita de campos públicos. Não incluir SIAPE, e-mail, WhatsApp ou token.
  const perfil = {
    id: 'simulacao-professora-teste',
    nome: 'Professora Teste',
    unidade: 'Instituto de Testes',
    campus: String(r.campus || ''),
    resumo: String(r.resumo || '').slice(0, 500),
    temas: listaTexto(r.temas, 12, 60),
    formatos: listaTexto(r.formatos, 4, 30),
    formacoes: formacoes.map(function (f) {
      return {
        nivel: String(f.nivel || ''),
        curso: String(f.curso || ''),
        instituicao: String(f.instituicao || ''),
        ano: String(f.ano || '')
      };
    }),
    lattes: '', // Evita publicar endereço de perfil real no teste.
    foto: '',   // Não publicar imagens da planilha.
    atualizado: new Date().toISOString()
  };
  const documento = {
    ficticio: true,
    aviso: 'Publicação simulada. Não representa docente real da Unifesspa.',
    docentes: [perfil],
    gerado_em: new Date().toISOString()
  };
  const texto = JSON.stringify(documento, null, 2);
  if (/@unifesspa\.edu\.br|whatsapp|siape|token_expira/i.test(texto)) {
    throw new Error('Bloqueado: dado reservado detectado no JSON.');
  }
  commitNoGitHub(texto);
  console.log('SIMULAÇÃO CONCLUÍDA: um perfil fictício enviado a fontes-teste.');
  console.log('Planilha preservada; nenhuma aprovação real foi realizada.');
}

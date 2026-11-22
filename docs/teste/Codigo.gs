/**
 * Banco de fontes da Unifesspa: back-end (Google Apps Script)
 *
 * Projeto vinculado à planilha da ASCOM (Extensões > Apps Script).
 * Implantar como: Aplicativo da Web | Executar como: Eu | Quem tem acesso: Qualquer pessoa.
 *
 * SEGREDOS (não ficam no código). Em Configurações do projeto > Propriedades do script, criar:
 *   GITHUB_TOKEN  = token fino do GitHub (só o repositório fontes, permissão Contents: leitura e escrita)
 *   SENHA_ASCOM   = senha do painel (mínimo 10 caracteres)
 *
 * ABAS DA PLANILHA (criadas por configuracaoInicial):
 *   SIGAA      nome | siape | unidade        lista privada de docentes, nunca é publicada
 *   Cadastros  uma linha por envio, com status
 *
 * FLUXO
 *   1. Docente informa o SIAPE. O servidor confere na aba SIGAA (nome e unidade vêm da planilha, não do navegador).
 *   2. Docente envia o formulário com e-mail @unifesspa.edu.br. Recebe um link de confirmação.
 *   3. O link abre uma página; ao confirmar pelo botão, o cadastro vai para a ASCOM.
 *   4. A ASCOM aprova no painel. Só então o cartão é publicado no GitHub, sem SIAPE, e-mail ou telefone.
 */

const GITHUB_OWNER  = 'unifesspa-ascom';
const GITHUB_REPO   = 'fontes-teste';
const GITHUB_PATH   = 'dados/docentes-cadastrados.json';
const GITHUB_BRANCH = 'main';
const EMAIL_ASCOM   = 'ascom@unifesspa.edu.br';
const DOMINIO_EMAIL = '@unifesspa.edu.br';

const ABA_SIGAA = 'SIGAA';
const ABA_CAD   = 'Cadastros';
const COLUNAS = ['id', 'criado_em', 'siape', 'nome', 'unidade', 'status', 'campus', 'resumo', 'temas',
  'formatos', 'lattes', 'email', 'whatsapp', 'observacao', 'formacoes', 'token', 'token_expira', 'moderado_em', 'autorizacao', 'foto_modo', 'foto_id'];

const CAMPI = ['Marabá (Campus Sede)', 'Canaã dos Carajás', 'Xinguara', 'Rondon do Pará', 'São Félix do Xingu',
  'Santana do Araguaia'];
const FORMATOS = ['Presencial', 'TV ou vídeo', 'Rádio ou áudio', 'E-mail'];
const NIVEIS = ['Graduação', 'Especialização', 'Mestrado', 'Doutorado', 'Pós-Doutorado'];

// ───────────────────────── Entradas ─────────────────────────

function doPost(e) {
  try {
    let d;
    try { d = JSON.parse(e.postData.contents); } catch (x) { return resp({ status: 'erro', msg: 'Requisição inválida.' }); }
    if (!d || typeof d !== 'object') return resp({ status: 'erro', msg: 'Requisição inválida.' });
    switch (d.acao) {
      case 'verificar': return resp(verificar(d));
      case 'cadastro':  return resp(cadastrar(d));
      case 'recusa':    return resp(recusar(d));
      case 'reenviar':  return resp(reenviarConfirmacao(d));
      case 'painel':    return resp(painel(d));
      case 'moderar':   return resp(moderar(d));
      case 'buscar':    return resp(registrarBusca(d));
      case 'metricas':  return resp(metricas(d));
      default:          return resp({ status: 'erro', msg: 'Ação desconhecida.' });
    }
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return resp({ status: 'erro', msg: 'Erro interno. Tente novamente em instantes.' });
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.acao === 'confirmar' && p.t) return paginaConfirmacao(String(p.t));
  return resp({ status: 'ok', msg: 'Banco de fontes Unifesspa.' });
}

function resp(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────── Ações públicas ─────────────────────────

function verificar(d) {
  if (!limitarIdentificador('ver', d.siape, 15, 600)) return { status: 'erro', msg: 'Muitas consultas. Tente novamente em alguns minutos.' };
  const siape = soDigitos(d.siape);
  const doc = siape.length >= 6 && siape.length <= 8 ? buscarSigaa(siape) : null;
  if (!doc) return { status: 'erro', msg: 'SIAPE não encontrado. Confira o número ou fale com a ASCOM.' };
  return { status: 'ok', nome: doc.nome, unidade: doc.unidade, situacao: situacaoDoSiape(siape), foto: fotoSigaaValida(doc.foto) };
}

function cadastrar(d) {
  if (d.site) return { status: 'ok' }; // campo isca preenchido por robôs
  if (!limitarIdentificador('cad', d.siape, 5, 600)) return { status: 'erro', msg: 'Muitos envios. Tente novamente em alguns minutos.' };

  const siape = soDigitos(d.siape);
  const doc = siape ? buscarSigaa(siape) : null;
  if (!doc) return { status: 'erro', msg: 'SIAPE não encontrado.' };

  const email = limpar(d.email, 120).toLowerCase();
  if (!emailInstitucionalValido(email)) {
    return { status: 'erro', msg: 'Use seu e-mail institucional (' + DOMINIO_EMAIL + ').' };
  }
  const campus = CAMPI.indexOf(d.campus) >= 0 ? d.campus : '';
  if (!campus) return { status: 'erro', msg: 'Selecione o campus.' };
  const resumo = limpar(d.resumo, 500);
  if (resumo.length < 20) return { status: 'erro', msg: 'Escreva uma apresentação com pelo menos 20 caracteres.' };
  const temas = listaTexto(d.temas, 12, 60);
  if (!temas.length) return { status: 'erro', msg: 'Informe pelo menos um tema.' };
  const formatos = listaTexto(d.formatos, 4, 30).filter(function (f) { return FORMATOS.indexOf(f) >= 0; });
  const formacoes = (Array.isArray(d.formacoes) ? d.formacoes : []).slice(0, 6).map(function (f) {
    f = f || {};
    return {
      nivel: NIVEIS.indexOf(f.nivel) >= 0 ? f.nivel : '',
      curso: limpar(f.curso, 120), instituicao: limpar(f.instituicao, 120),
      ano: /^\d{4}$/.test(String(f.ano || '')) ? String(f.ano) : ''
    };
  }).filter(function (f) { return f.nivel && f.curso; });
  if (!formacoes.length) return { status: 'erro', msg: 'Informe pelo menos uma formação.' };
  const lattes = lattesValido(limpar(d.lattes, 200));
  if (limpar(d.lattes, 200) && !lattes) return { status: 'erro', msg: 'O link do Lattes deve ser do endereço cnpq.br.' };
  const whatsapp = limpar(d.whatsapp, 25).replace(/[^0-9()+\- ]/g, '');
  const observacao = limpar(d.observacao, 500);
  if (d.autorizo !== true) return { status: 'erro', msg: 'Marque a autorização para publicar os seus dados no Banco de fontes.' };
  const fotoModo = escolherFotoModo(d.foto_modo, doc);
  let fotoBytes = null;
  if (fotoModo === 'enviada') {
    fotoBytes = decodificarFoto(d.foto_dados);
    if (!fotoBytes) return { status: 'erro', msg: 'A foto enviada não é válida. Escolha outra imagem.' };
  }

  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = abaCadastros();
    const agora = new Date();
    const dia = agora.getTime() - 24 * 3600 * 1000;
    const todas = lerCadastros(sh);
    const recentesSiape = todas.filter(function (r) { return r.siape === siape && new Date(r.criado_em).getTime() > dia; }).length;
    const recentesEmail = todas.filter(function (r) { return r.email === email && new Date(r.criado_em).getTime() > dia; }).length;
    if (recentesSiape >= 3 || recentesEmail >= 5) return { status: 'erro', msg: 'Limite diário de envios atingido. Tente amanhã ou fale com a ASCOM.' };

    const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    const linha = {
      id: id, criado_em: agora.toISOString(), siape: siape, nome: doc.nome, unidade: doc.unidade,
      status: 'aguardando_email', campus: campus, resumo: resumo, temas: temas.join(', '),
      formatos: formatos.join(', '), lattes: lattes, email: email, whatsapp: whatsapp,
      observacao: observacao, formacoes: JSON.stringify(formacoes), token: token,
      token_expira: new Date(agora.getTime() + 48 * 3600 * 1000).toISOString(), moderado_em: '',
      autorizacao: agora.toISOString(), foto_modo: fotoModo, foto_id: fotoBytes ? id : ''
    };
    if (fotoBytes) salvarFotoPrivada(id, fotoBytes);
    sh.appendRow(COLUNAS.map(function (c) { return textoSeguro(linha[c]); }));
    try {
      enviarLinkDeConfirmacao(email, doc.nome, token);
    } catch (e) {
      console.error('Falha ao enviar confirmação de cadastro: ' + e);
      return { status: 'erro', msg: 'Não foi possível enviar a confirmação. Entre em contato com a ASCOM para concluir o cadastro.' };
    }
  } finally { lock.releaseLock(); }
  return { status: 'ok' };
}

function recusar(d) {
  if (d.site) return { status: 'ok' };
  if (!limitarIdentificador('rec', d.siape, 5, 600)) return { status: 'erro', msg: 'Muitos envios. Tente novamente em alguns minutos.' };
  const siape = soDigitos(d.siape);
  const doc = siape ? buscarSigaa(siape) : null;
  if (!doc) return { status: 'erro', msg: 'SIAPE não encontrado.' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sit = situacaoDoSiape(siape);
    if (sit === 'cadastrado' || sit === 'pendente') {
      return { status: 'erro', msg: 'Já existe um cadastro seu em andamento ou publicado. Para retirá-lo, escreva para ' + EMAIL_ASCOM + '.' };
    }
    if (sit !== 'recusou') {
      const email = limpar(d.email, 120).toLowerCase();
      if (!emailInstitucionalValido(email)) {
        return { status: 'erro', msg: 'Informe um e-mail institucional válido para confirmar sua resposta.' };
      }
      const sh = abaCadastros();
      const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
      const agora = new Date();
      const linha = { id: Utilities.getUuid().replace(/-/g, '').slice(0, 12), criado_em: agora.toISOString(),
        siape: siape, nome: doc.nome, unidade: doc.unidade, status: 'aguardando_email_recusa', email: email,
        token: token, token_expira: new Date(agora.getTime() + 48 * 3600 * 1000).toISOString() };
      // Persistir antes de enviar: o link nunca deve apontar para um token inexistente.
      sh.appendRow(COLUNAS.map(function (c) { return textoSeguro(linha[c] || ''); }));
      try {
        enviarLinkDeConfirmacao(email, doc.nome, token, true);
      } catch (e) {
        // Mantém registro pendente para diagnóstico, sem afirmar que o e-mail foi enviado.
        console.error('Falha ao enviar confirmação de recusa: ' + e);
        return { status: 'erro', msg: 'Não foi possível enviar a confirmação. Entre em contato com a ASCOM para concluir sua resposta.' };
      }
    }
  } finally { lock.releaseLock(); }
  return { status: 'ok' };
}

/** Confere o domínio exato, sem aceitar subdomínios ou sufixos enganosos. */
function emailInstitucionalValido(valor) {
  return /^[a-z0-9._%+\-]+@unifesspa\.edu\.br$/.test(String(valor || '').toLowerCase());
}

/** Reenvio controlado: nunca revela se um SIAPE/e-mail está cadastrado. */
function reenviarConfirmacao(d) {
  if (d.site) return { status: 'ok', msg: 'Se houver uma confirmação pendente, enviaremos um novo link.' };
  const siape = soDigitos(d.siape);
  const email = limpar(d.email, 120).toLowerCase();
  const neutra = { status: 'ok', msg: 'Se houver uma confirmação pendente para esses dados, enviaremos um novo link.' };
  if (siape.length < 6 || siape.length > 8 || !emailInstitucionalValido(email)) {
    return { status: 'erro', msg: 'Informe SIAPE e e-mail institucional válidos.' };
  }
  if (!limitarIdentificador('reenviar', siape, 3, 600)) return { status: 'erro', msg: 'Muitas solicitações. Tente novamente mais tarde.' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = abaCadastros();
    const rows = lerCadastros(sh).filter(function (r) {
      return r.siape === siape && r.email.toLowerCase() === email &&
        (r.status === 'aguardando_email' || r.status === 'aguardando_email_recusa');
    }).sort(function (a, b) { return b._linha - a._linha; });
    if (!rows.length) return neutra;
    const r = rows[0];
    // Evita reenvios repetidos. Usar cache por registro, nunca por endereço em logs.
    const cache = CacheService.getScriptCache();
    const chave = 'reenviar_' + r.id;
    if (cache.get(chave)) return neutra;
    const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    const anterior = { token: r.token, token_expira: r.token_expira };
    atualizarLinha(sh, r._linha, { token: token, token_expira: new Date(Date.now() + 48 * 3600 * 1000).toISOString() });
    try {
      enviarLinkDeConfirmacao(email, r.nome, token, r.status === 'aguardando_email_recusa');
      cache.put(chave, '1', 300);
    } catch (e) {
      try { atualizarLinha(sh, r._linha, anterior); }
      catch (rollbackError) { console.error('Falha ao restaurar token após erro de envio: ' + rollbackError); }
      console.error('Falha no reenvio da confirmação: ' + e);
      return { status: 'erro', msg: 'Não foi possível enviar a confirmação agora. Tente novamente mais tarde.' };
    }
    return neutra;
  } finally { lock.releaseLock(); }
}

function confirmarEmail(token) {
  if (!limitarIdentificador('conf', token, 5, 600)) return { ok: false, msg: 'Muitas tentativas. Tente novamente em alguns minutos.' };
  if (!/^[a-f0-9]{64}$/i.test(String(token || ''))) return { ok: false, msg: 'Link inválido.' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  let nome = '';
  try {
    const sh = abaCadastros();
    const rows = lerCadastros(sh);
    const r = rows.filter(function (x) { return x.token && x.token === token; })[0];
    if (!r) return { ok: false, msg: 'Link inválido ou já utilizado.' };
    if (r.status !== 'aguardando_email' && r.status !== 'aguardando_email_recusa') return { ok: false, msg: 'Este link já foi utilizado.' };
    if (new Date(r.token_expira).getTime() < Date.now()) return { ok: false, msg: 'O link expirou. Preencha o formulário novamente.' };
    const recusa = r.status === 'aguardando_email_recusa';
    atualizarLinha(sh, r._linha, { status: recusa ? 'recusou' : 'aguardando_ascom', token: '', token_expira: '' });
    nome = recusa ? '' : r.nome;
  } finally { lock.releaseLock(); }
  if (!nome) return { ok: true, msg: 'Sua resposta foi confirmada. Você não será incluído no Banco de fontes.' };
  try {
    MailApp.sendEmail({ to: EMAIL_ASCOM, subject: '[Banco de fontes] Novo cadastro para aprovar',
      body: 'O cadastro de ' + nome + ' confirmou o e-mail e aguarda aprovação no painel da ASCOM.' });
  } catch (e) { console.error('Aviso à ASCOM falhou: ' + e); }
  return { ok: true, msg: 'E-mail confirmado. A ASCOM vai revisar o seu cadastro e publicá-lo no Banco de fontes.' };
}

// ───────────────────────── Painel da ASCOM ─────────────────────────

function painel(d) {
  const falha = autenticar(d.senha); if (falha) return falha;
  const sh = abaCadastros();
  const rows = lerCadastros(sh).filter(function (r) { return r.status !== 'substituido'; });
  const cadastros = rows.map(function (r) {
    let formacoes = []; try { formacoes = JSON.parse(r.formacoes || '[]'); } catch (e) {}
    return { id: r.id, criado_em: r.criado_em, siape: r.siape, nome: r.nome, unidade: r.unidade, status: r.status,
      campus: r.campus, resumo: r.resumo, temas: r.temas, formatos: r.formatos, lattes: r.lattes,
      email: r.email, whatsapp: r.whatsapp, observacao: r.observacao, formacoes: formacoes, moderado_em: r.moderado_em,
      autorizacao: r.autorizacao, foto_modo: r.foto_modo, foto: fotoParaPainel(r) };
  });
  const sigaa = lerSigaa().map(function (x) {
    return { nome: x.nome, siape: x.siape, unidade: x.unidade, situacao: situacaoDeLista(x.siape, rows) };
  });
  return { status: 'ok', cadastros: cadastros, sigaa: sigaa };
}

function moderar(d) {
  const falha = autenticar(d.senha); if (falha) return falha;
  const decisao = String(d.decisao || '');
  if (['aprovar', 'rejeitar', 'retirar'].indexOf(decisao) < 0) return { status: 'erro', msg: 'Decisão inválida.' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = abaCadastros();
    const rows = lerCadastros(sh);
    const r = rows.filter(function (x) { return x.id === String(d.id || ''); })[0];
    if (!r) return { status: 'erro', msg: 'Cadastro não encontrado.' };
    const agora = new Date().toISOString();
    const antigos = rows.filter(function (x) { return x.siape === r.siape && x.status === 'aprovado' && x.id !== r.id; });
    const alteracoes = [];
    if (decisao === 'aprovar') {
      if (r.status !== 'aguardando_ascom') return { status: 'erro', msg: 'Só é possível aprovar cadastros com e-mail confirmado.' };
      if (d.identidade_conferida !== true) return { status: 'erro', msg: 'A ASCOM precisa conferir a identidade e a correspondência entre SIAPE e e-mail antes de publicar.' };
      antigos.forEach(function (x) { alteracoes.push({ registro: x, novo: { status: 'substituido' } }); });
      alteracoes.push({ registro: r, novo: { status: 'aprovado', moderado_em: agora } });
    } else if (decisao === 'rejeitar') {
      if (r.status !== 'aguardando_ascom') return { status: 'erro', msg: 'Só é possível rejeitar cadastros que aguardam a ASCOM.' };
      alteracoes.push({ registro: r, novo: { status: 'rejeitado', moderado_em: agora } });
    } else {
      if (r.status !== 'aprovado') return { status: 'erro', msg: 'Só é possível retirar cadastros publicados.' };
      alteracoes.push({ registro: r, novo: { status: 'retirado', moderado_em: agora } });
    }

    // Fotos novas precisam existir antes de o JSON público apontar para elas.
    // Fotos antigas só são removidas depois da publicação do JSON atualizado.
    if (decisao === 'aprovar') publicarFoto(r);
    const aplicadas = [];
    try {
      alteracoes.forEach(function (a) {
        const anterior = {};
        Object.keys(a.novo).forEach(function (campo) { anterior[campo] = a.registro[campo]; });
        // Guardar o snapshot ANTES de escrever, inclusive para falhas parciais.
        aplicadas.push({ registro: a.registro, anterior: anterior });
        atualizarLinha(sh, a.registro._linha, a.novo);
      });
      if (decisao !== 'rejeitar') publicarNoGitHub();
    } catch (e) {
      // Se o GitHub falhar, restaurar o estado anterior da planilha.
      let falhouRollback = false;
      aplicadas.reverse().forEach(function (a) {
        try { atualizarLinha(sh, a.registro._linha, a.anterior); }
        catch (rollbackError) { falhouRollback = true; console.error('Rollback de cadastro falhou: ' + rollbackError); }
      });
      if (falhouRollback) {
        console.error('ATENÇÃO: moderação exige reconciliação manual com o JSON público. Erro original: ' + e);
        return { status: 'erro', msg: 'Não foi possível concluir a operação e a recuperação automática falhou. Contate o administrador antes de tentar novamente.' };
      }
      console.error('Moderação não publicada, planilha restaurada: ' + e);
      return { status: 'erro', msg: 'Não foi possível concluir a publicação. Nenhuma alteração de status foi mantida; tente novamente mais tarde.' };
    }
    // Limpeza de fotos é secundária: não pode desfazer uma aprovação já publicada.
    if (decisao === 'aprovar') antigos.forEach(removerFotoGitHub);
    if (decisao === 'retirar') removerFotoGitHub(r);
    return { status: 'ok' };
  } finally { lock.releaseLock(); }
}

function autenticar(senha) {
  const certa = PropertiesService.getScriptProperties().getProperty('SENHA_ASCOM') || '';
  if (certa.length < 10) return { status: 'erro', msg: 'Senha do painel ainda não configurada no servidor.' };
  const tentativa = String(senha || '');
  if (iguais(tentativa, certa)) return null;
  // Não bloquear toda a ASCOM por erros de terceiros. Penalizar apenas a
  // mesma tentativa incorreta; não é substituto para SSO ou proteção de borda.
  if (!limitarIdentificador('senha_incorreta', tentativa || '(vazia)', 5, 900)) {
    return { status: 'erro', msg: 'Muitas tentativas com esta senha. Aguarde 15 minutos.' };
  }
  return { status: 'erro', msg: 'Senha incorreta.' };
}

// ───────────────────────── Publicação no GitHub ─────────────────────────

function publicarNoGitHub() {
  const rows = lerCadastros(abaCadastros()).filter(function (r) { return r.status === 'aprovado'; });
  const docentes = rows.map(function (r) {
    let formacoes = []; try { formacoes = JSON.parse(r.formacoes || '[]'); } catch (e) {}
    return {
      id: r.id, nome: r.nome, unidade: r.unidade, campus: r.campus, resumo: r.resumo,
      temas: listaTexto(r.temas, 12, 60), formatos: listaTexto(r.formatos, 4, 30),
      formacoes: formacoes.map(function (f) { return { nivel: f.nivel, curso: f.curso, instituicao: f.instituicao, ano: f.ano }; }),
      lattes: lattesValido(r.lattes), foto: fotoPublica(r), atualizado: r.moderado_em
    };
  }).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  commitNoGitHub(JSON.stringify({ docentes: docentes, gerado_em: new Date().toISOString() }, null, 2));
}

function commitNoGitHub(conteudo) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN não configurado nas propriedades do script.');
  const url = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + GITHUB_PATH;
  const cab = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  let sha;
  const g = UrlFetchApp.fetch(url + '?ref=' + GITHUB_BRANCH, { headers: cab, muteHttpExceptions: true });
  if (g.getResponseCode() === 200) sha = JSON.parse(g.getContentText()).sha;
  else if (g.getResponseCode() !== 404) throw new Error('GitHub (leitura) respondeu ' + g.getResponseCode());
  const corpo = { message: 'Atualiza docentes publicados', branch: GITHUB_BRANCH,
    content: Utilities.base64Encode(Utilities.newBlob(conteudo).getBytes()) };
  if (sha) corpo.sha = sha;
  const p = UrlFetchApp.fetch(url, { method: 'put', headers: cab, contentType: 'application/json',
    payload: JSON.stringify(corpo), muteHttpExceptions: true });
  if (p.getResponseCode() > 299) throw new Error('GitHub (gravação) respondeu ' + p.getResponseCode());
}

// ───────────────────────── Configuração e manutenção ─────────────────────────

/** Rode UMA vez no editor (opcional): cria as abas Cadastros e Buscas. A lista do SIGAA é colada à mão na aba SIGAA (nome, siape, unidade, foto_url). */
function configuracaoInicial() {
  abaCadastros();
  abaBuscas();
}

// ───────────────────────── Utilidades ─────────────────────────

/** Planilha de dados: usa a vinculada ao projeto, ou a guardada em PLANILHA_ID, ou cria uma nova na sua conta. */
function planilha() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PLANILHA_ID');
  if (id) return SpreadsheetApp.openById(id);
  const ativa = SpreadsheetApp.getActiveSpreadsheet();
  if (ativa) return ativa;
  const ss = SpreadsheetApp.create('Banco de fontes Unifesspa (dados privados)');
  props.setProperty('PLANILHA_ID', ss.getId());
  return ss;
}

function abaCadastros() {
  const ss = planilha();
  let sh = ss.getSheetByName(ABA_CAD);
  if (!sh) {
    sh = ss.insertSheet(ABA_CAD);
    sh.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(1, 3, 500, 1).setNumberFormat('@');
  }
  garantirCabecalho(sh);
  return sh;
}

function lerCadastros(sh) {
  const v = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const o = { _linha: i + 1 };
    COLUNAS.forEach(function (c, j) { o[c] = v[i][j] === undefined || v[i][j] === null ? '' : String(v[i][j]); });
    if (o.id) out.push(o);
  }
  return out;
}

function atualizarLinha(sh, linha, campos) {
  Object.keys(campos).forEach(function (c) {
    sh.getRange(linha, COLUNAS.indexOf(c) + 1).setValue(campos[c]);
  });
}

function lerSigaa() {
  const sh = planilha().getSheetByName(ABA_SIGAA);
  if (!sh) return [];
  const v = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const siape = soDigitos(v[i][1]);
    if (siape) out.push({ nome: String(v[i][0]).trim(), siape: siape, unidade: String(v[i][2]).trim(), foto: String(v[i][3] || '').trim() });
  }
  return out;
}

function buscarSigaa(siape) {
  const lista = lerSigaa();
  for (let i = 0; i < lista.length; i++) if (lista[i].siape === siape) return lista[i];
  return null;
}

function situacaoDeLista(siape, rows) {
  const meus = rows.filter(function (r) { return r.siape === siape; });
  if (meus.some(function (r) { return r.status === 'aprovado'; })) return 'cadastrado';
  if (meus.some(function (r) { return r.status === 'aguardando_email' || r.status === 'aguardando_email_recusa' || r.status === 'aguardando_ascom'; })) return 'pendente';
  if (meus.some(function (r) { return r.status === 'recusou'; })) return 'recusou';
  return 'novo';
}

function situacaoDoSiape(siape) {
  return situacaoDeLista(siape, lerCadastros(abaCadastros()).filter(function (r) { return r.siape === siape; }));
}

function enviarLinkDeConfirmacao(email, nome, token, recusa) {
  const link = ScriptApp.getService().getUrl() + '?acao=confirmar&t=' + token;
  MailApp.sendEmail({
    to: email, name: 'Banco de fontes Unifesspa', replyTo: EMAIL_ASCOM,
    subject: recusa ? 'Confirme sua resposta ao Banco de fontes da Unifesspa' : 'Confirme seu cadastro no Banco de fontes da Unifesspa',
    body: 'Olá,\n\nRecebemos ' + (recusa ? 'uma resposta de não participação' : 'um cadastro') + ' no Banco de fontes da Unifesspa em nome de ' + nome + '.\n\n' +
      'Para confirmar que foi você, abra o link abaixo (válido por 48 horas):\n' + link + '\n\n' +
      (recusa ? 'Depois da confirmação, registraremos sua decisão de não participar.\n\n' : 'Depois da confirmação, a ASCOM revisa o cadastro antes de publicar. Telefone e e-mail não aparecem no site.\n\n') +
      'Se não foi você, ignore esta mensagem. Nada será publicado.\n\nASCOM Unifesspa'
  });
}

/** A visita GET apenas exibe a página: não modifica a planilha nem consome token. */
function paginaConfirmacao(token) {
  const t = HtmlService.createTemplate(
    '<!DOCTYPE html><html lang="pt-BR"><head><base target="_top"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font-family:system-ui,sans-serif;background:#edefec;margin:0;display:grid;place-items:center;min-height:100vh}' +
    'main{background:#fffffc;max-width:460px;margin:16px;padding:28px;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1)}' +
    'h1{font-size:1.25rem;margin:0 0 8px;color:#14763c}p{color:#333;line-height:1.5}' +
    'button{background:#14763c;color:white;border:0;border-radius:8px;padding:12px 18px;font:inherit;cursor:pointer}' +
    'button:disabled{opacity:.6;cursor:wait}</style></head><body><main>' +
    '<h1>Confirme sua resposta</h1>' +
    '<p>Para confirmar seu e-mail institucional e encaminhar sua resposta à ASCOM, clique no botão abaixo.</p>' +
    '<button id="confirmar" type="button">Confirmar minha resposta</button>' +
    '<p id="resultado" role="status" aria-live="polite"></p>' +
    '<script>const token = <?!= tokenJson ?>;' +
    'document.getElementById("confirmar").addEventListener("click",function(){' +
    'const botao=this,resultado=document.getElementById("resultado");botao.disabled=true;' +
    'resultado.textContent="Confirmando...";' +
    'google.script.run.withSuccessHandler(function(r){resultado.textContent=r.msg;' +
    'if(!r.ok)botao.disabled=false;else botao.hidden=true;})' +
    '.withFailureHandler(function(){resultado.textContent="Não foi possível confirmar. Tente novamente.";' +
    'botao.disabled=false;}).confirmarEmail(token);' +
    '});</script></main></body></html>');
  // Serialização segura para contexto JavaScript dentro do HTML.
  t.tokenJson = JSON.stringify(String(token || '')).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return t.evaluate().setTitle('Confirmação — Banco de fontes Unifesspa');
}

/** Limite por identificador, sem armazenar SIAPE, e-mail ou token em texto no cache.
 * Não equivale a proteção por IP: o Apps Script público não oferece IP confiável.
 */
function limitarIdentificador(acao, identificador, max, janelaSeg) {
  const texto = String(identificador || '').trim().toLowerCase();
  if (!texto || texto.length > 200) return false;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, acao + ':' + texto);
  const chave = 'lim_id_' + Utilities.base64EncodeWebSafe(bytes).slice(0, 40);
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get(chave) || 0) + 1;
  cache.put(chave, String(n), janelaSeg);
  return n <= max;
}

function limitar(chave, max, janelaSeg) {
  const c = CacheService.getScriptCache();
  const n = Number(c.get('lim_' + chave) || 0) + 1;
  c.put('lim_' + chave, String(n), janelaSeg);
  return n <= max;
}

function iguais(a, b) {
  let r = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) r |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return r === 0;
}

function soDigitos(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }

function limpar(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function listaTexto(v, maxItens, maxTam) {
  const arr = Array.isArray(v) ? v : String(v == null ? '' : v).split(',');
  const vistos = {}; const out = [];
  arr.forEach(function (x) {
    const t = limpar(x, maxTam).replace(/,/g, ' ');
    const k = t.toLowerCase();
    if (t && !vistos[k] && out.length < maxItens) { vistos[k] = 1; out.push(t); }
  });
  return out;
}

function lattesValido(u) {
  if (!u) return '';
  const m = String(u).match(/^(https?):\/\/([a-z0-9.\-]+)(\/[^\s<>"']*)?$/i);
  if (!m) return '';
  const host = m[2].toLowerCase();
  if (host !== 'cnpq.br' && !/\.cnpq\.br$/.test(host)) return '';
  return String(u);
}

/** Impede que o Sheets interprete texto do formulário como fórmula. */
function textoSeguro(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// ───────────────────────── Novidades de 06/11/2026: fotos, autorização e registro de buscas ─────────────────────────

const ABA_BUSCAS = 'Buscas';
const COLUNAS_BUSCAS = ['data_hora', 'termo', 'n_resultados', 'campus', 'formato', 'origem'];
const ORIGENS = ['real', 'demo'];
const FOTO_MODOS = ['sigaa', 'enviada', 'nenhuma'];
const FOTO_MAX_CHARS = 200000;
const FOTO_MAX_BYTES = 150000;
const PASTA_FOTOS = 'Banco de fontes (fotos privadas)';
let _mapaFotos = null;

function normalizar(s) {
  return String(s === null || s === undefined ? '' : s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Garante que a aba Cadastros tenha todas as colunas atuais no cabeçalho. */
function garantirCabecalho(sh) {
  if (sh.getLastColumn() < COLUNAS.length) {
    sh.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold');
  }
}

function abaBuscas() {
  const ss = planilha();
  let sh = ss.getSheetByName(ABA_BUSCAS);
  if (!sh) {
    sh = ss.insertSheet(ABA_BUSCAS);
    sh.getRange(1, 1, 1, COLUNAS_BUSCAS.length).setValues([COLUNAS_BUSCAS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Registro anônimo de busca: só termo, filtros, número de resultados e origem. Sem IP nem identificação. */
function registrarBusca(d) {
  if (!limitar('busca', 400, 600)) return { status: 'ok' };
  const termo = limpar(d.termo, 80);
  const campus = CAMPI.indexOf(d.campus) >= 0 ? d.campus : '';
  const formato = FORMATOS.indexOf(d.formato) >= 0 ? d.formato : '';
  if (!termo && !campus && !formato) return { status: 'ok' };
  const n = Math.max(0, Math.min(9999, parseInt(d.n_resultados, 10) || 0));
  const origem = ORIGENS.indexOf(d.origem) >= 0 ? d.origem : 'real';
  abaBuscas().appendRow([new Date().toISOString(), textoSeguro(termo), n, campus, formato, origem]);
  return { status: 'ok' };
}

/** Números agregados para o painel HTML da ASCOM (protegido por senha). */
function metricas(d) {
  const falha = autenticar(d.senha); if (falha) return falha;
  const filtro = ORIGENS.indexOf(d.origem) >= 0 ? d.origem : '';
  const v = abaBuscas().getDataRange().getValues();
  const dias = {}, termos = {}, campi = {}, formatos = {}, origens = {};
  let total = 0, sem = 0, primeira = '', ultima = '';
  for (let i = 1; i < v.length; i++) {
    const ts = String(v[i][0] || '');
    if (!ts) continue;
    const origem = String(v[i][5] || 'real');
    origens[origem] = (origens[origem] || 0) + 1;
    if (filtro && origem !== filtro) continue;
    const n = Number(v[i][2]) || 0;
    const campus = String(v[i][3] || ''), formato = String(v[i][4] || '');
    total++; if (n === 0) sem++;
    let dia = ts.slice(0, 10);
    try { dia = Utilities.formatDate(new Date(ts), 'America/Sao_Paulo', 'yyyy-MM-dd'); } catch (e) {}
    dias[dia] = (dias[dia] || 0) + 1;
    if (!primeira || ts < primeira) primeira = ts;
    if (!ultima || ts > ultima) ultima = ts;
    if (campus) campi[campus] = (campi[campus] || 0) + 1;
    if (formato) formatos[formato] = (formatos[formato] || 0) + 1;
    const k = normalizar(v[i][1]);
    if (k) {
      const t = termos[k] || (termos[k] = { termo: k, n: 0, sem: 0 });
      t.n++; if (n === 0) t.sem++;
    }
  }
  const lista = Object.keys(termos).map(function (k) { return termos[k]; });
  const maisBuscados = lista.slice().sort(function (a, b) { return b.n - a.n; }).slice(0, 40);
  const semResultado = lista.filter(function (t) { return t.sem > 0; })
    .sort(function (a, b) { return b.sem - a.sem; }).slice(0, 40);

  const aprov = lerCadastros(abaCadastros()).filter(function (r) { return r.status === 'aprovado'; });
  const acCampi = {}, acFormatos = {}, acTemas = {};
  aprov.forEach(function (r) {
    if (r.campus) acCampi[r.campus] = (acCampi[r.campus] || 0) + 1;
    listaTexto(r.formatos, 4, 30).forEach(function (f) { acFormatos[f] = (acFormatos[f] || 0) + 1; });
    listaTexto(r.temas, 12, 60).forEach(function (t) { const k = normalizar(t); if (k) acTemas[k] = (acTemas[k] || 0) + 1; });
  });
  const temasTop = Object.keys(acTemas).map(function (k) { return { tema: k, n: acTemas[k] }; })
    .sort(function (a, b) { return b.n - a.n; }).slice(0, 40);

  return { status: 'ok', origem: filtro || 'todas', buscas: { total: total, sem_resultado: sem, primeira: primeira, ultima: ultima,
    por_dia: dias, por_campus: campi, por_formato: formatos, por_origem: origens,
    mais_buscados: maisBuscados, sem_resultado_termos: semResultado },
    acervo: { total: aprov.length, por_campus: acCampi, por_formato: acFormatos, temas: temasTop } };
}

// ── Fotos ──

function fotoSigaaValida(u) {
  const s = String(u || '').trim();
  return /^https:\/\/sigaa\.unifesspa\.edu\.br\/sigaa\/verFoto\?[A-Za-z0-9=&%_.\-]+$/.test(s) ? s : '';
}

function fotoDoSigaa(siape) {
  if (!_mapaFotos) {
    _mapaFotos = {};
    lerSigaa().forEach(function (x) { _mapaFotos[x.siape] = fotoSigaaValida(x.foto); });
  }
  return _mapaFotos[siape] || '';
}

function escolherFotoModo(m, doc) {
  const modo = FOTO_MODOS.indexOf(m) >= 0 ? m : 'sigaa';
  if (modo === 'sigaa' && !fotoSigaaValida(doc && doc.foto)) return 'nenhuma';
  return modo;
}

/** Aceita só JPEG em data URL (o navegador recorta para 3:4 e reduz antes de enviar). */
function decodificarFoto(s) {
  const texto = String(s || '');
  const pref = 'data:image/jpeg;base64,';
  if (texto.indexOf(pref) !== 0 || texto.length > FOTO_MAX_CHARS) return null;
  try {
    const bytes = Utilities.base64Decode(texto.slice(pref.length));
    if (bytes.length < 1000 || bytes.length > FOTO_MAX_BYTES) return null;
    if (bytes[0] !== -1 || bytes[1] !== -40 || bytes[2] !== -1) return null; // FF D8 FF
    return bytes;
  } catch (e) { return null; }
}

function pastaFotos() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('PASTA_FOTOS_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const p = DriveApp.createFolder(PASTA_FOTOS);
  props.setProperty('PASTA_FOTOS_ID', p.getId());
  return p;
}

function salvarFotoPrivada(id, bytes) {
  pastaFotos().createFile(Utilities.newBlob(bytes, 'image/jpeg', id + '.jpg'));
}

function lerFotoPrivada(id) {
  const it = pastaFotos().getFilesByName(id + '.jpg');
  return it.hasNext() ? it.next().getBlob().getBytes() : null;
}

function fotoParaPainel(r) {
  if (r.foto_modo === 'sigaa') return fotoDoSigaa(r.siape);
  if (r.foto_modo === 'enviada') {
    if (r.status === 'aguardando_ascom') {
      const b = lerFotoPrivada(r.id);
      return b ? 'data:image/jpeg;base64,' + Utilities.base64Encode(b) : '';
    }
    return 'fotos/' + r.id + '.jpg';
  }
  return '';
}

function fotoPublica(r) {
  if (r.foto_modo === 'sigaa') return fotoDoSigaa(r.siape);
  if (r.foto_modo === 'enviada') return 'fotos/' + r.id + '.jpg';
  return '';
}

function publicarFoto(r) {
  if (r.foto_modo !== 'enviada') return;
  const bytes = lerFotoPrivada(r.id);
  if (!bytes) throw new Error('Foto enviada não encontrada na pasta privada.');
  commitArquivoBinario('fotos/' + r.id + '.jpg', Utilities.base64Encode(bytes), 'Publica foto de docente aprovado');
}

function removerFotoGitHub(r) {
  if (r.foto_modo !== 'enviada') return;
  try { apagarArquivoGitHub('fotos/' + r.id + '.jpg', 'Remove foto de cadastro retirado ou substituído'); }
  catch (e) { console.error('Falha ao remover foto: ' + e); }
}

function cabecalhoGitHub() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN não configurado nas propriedades do script.');
  return { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
}

function urlArquivoGitHub(caminho) {
  return 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + caminho;
}

function shaDoArquivo(caminho, cab) {
  const g = UrlFetchApp.fetch(urlArquivoGitHub(caminho) + '?ref=' + GITHUB_BRANCH, { headers: cab, muteHttpExceptions: true });
  if (g.getResponseCode() === 200) return JSON.parse(g.getContentText()).sha;
  if (g.getResponseCode() === 404) return '';
  throw new Error('GitHub (leitura) respondeu ' + g.getResponseCode());
}

function commitArquivoBinario(caminho, base64, mensagem) {
  const cab = cabecalhoGitHub();
  const sha = shaDoArquivo(caminho, cab);
  const corpo = { message: mensagem, branch: GITHUB_BRANCH, content: base64 };
  if (sha) corpo.sha = sha;
  const p = UrlFetchApp.fetch(urlArquivoGitHub(caminho), { method: 'put', headers: cab, contentType: 'application/json',
    payload: JSON.stringify(corpo), muteHttpExceptions: true });
  if (p.getResponseCode() > 299) throw new Error('GitHub (gravação de arquivo) respondeu ' + p.getResponseCode());
}

function apagarArquivoGitHub(caminho, mensagem) {
  const cab = cabecalhoGitHub();
  const sha = shaDoArquivo(caminho, cab);
  if (!sha) return;
  const p = UrlFetchApp.fetch(urlArquivoGitHub(caminho), { method: 'delete', headers: cab, contentType: 'application/json',
    payload: JSON.stringify({ message: mensagem, branch: GITHUB_BRANCH, sha: sha }), muteHttpExceptions: true });
  if (p.getResponseCode() > 299) throw new Error('GitHub (remoção de arquivo) respondeu ' + p.getResponseCode());
}

/** Teste isolado: consulta apenas a planilha definida em PLANILHA_ID. */
function testarIdentificacao() {
  const resultado = verificar({ siape: '9999999' });
  console.log(JSON.stringify(resultado));
}

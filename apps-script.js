// ═══════════════════════════════════════════════════════════════════════════
//  BANCO DE FONTES UNIFESSPA — Google Apps Script
//  Implante como Web App: Executar como "Eu", Acesso "Qualquer pessoa"
// ═══════════════════════════════════════════════════════════════════════════

// ── CONFIGURAÇÕES ── (edite aqui antes de implantar) ────────────────────────
const GITHUB_TOKEN  = 'COLE_SEU_TOKEN_AQUI';          // PAT gerado agora
const GITHUB_OWNER  = 'unifesspa-ascom';
const GITHUB_REPO   = 'fontes';
const GITHUB_PATH   = 'dados/docentes-cadastrados.json'; // JSON público (sem contatos)
const SHEET_NAME    = 'Respostas';                       // nome da aba da planilha
const SENHA_ASCOM   = 'DEFINA_UMA_SENHA_AQUI';          // senha do painel ASCOM

// ── CORS / OPTIONS ──────────────────────────────────────────────────────────
function doOptions() {
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ── ENTRY POINT ─────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);

    if (dados.acao === 'recusa') {
      gravarNaPlanilha(dados, false);
      return ok('recusa registrada');
    }

    if (dados.acao === 'cadastro') {
      gravarNaPlanilha(dados, true);
      publicarNoGitHub();
      return ok('cadastro salvo');
    }

    return erro('acao desconhecida');
  } catch (ex) {
    return erro(ex.message);
  }
}

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  // Endpoint ASCOM: retorna todos os cadastros com contatos
  if (params.acao === 'lista') {
    if (params.senha !== SENHA_ASCOM) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'erro', msg: 'Senha incorreta.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return retornarListaCompleta();
  }

  // Health check padrão
  return ok('Banco de Fontes UNIFESSPA — Script online');
}

function retornarListaCompleta() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', submissions: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const submissions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const formacoesStr = String(row[5] || '');
    const formacoes = formacoesStr
      ? formacoesStr.split(' | ').map(f => {
          const m = f.match(/^(.+?):\s*(.+?)\s*—\s*(.+?)(?:\s*\((\d+)\))?$/);
          return m
            ? { nivel: m[1], curso: m[2], instituicao: m[3], ano: m[4] || '' }
            : { nivel: '', curso: f, instituicao: '', ano: '' };
        })
      : [];

    submissions.push({
      siape:      String(row[1]),
      nome:       row[2],
      unidade:    row[3],
      disponivel: row[4],  // 'Sim' ou 'Não'
      formacoes,
      campus:     row[6],
      resumo:     row[7],
      temas:      row[8],
      formatos:   row[9],
      lattes:     row[10],
      email:      row[11], // contatos privados incluídos aqui
      whatsapp:   row[12],
      observacao: row[13],
      timestamp:  row[0]
    });
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', submissions }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── PLANILHA ─────────────────────────────────────────────────────────────────
function gravarNaPlanilha(dados, disponivel) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // Cria a aba e o cabeçalho na primeira vez
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'SIAPE', 'Nome', 'Unidade', 'Disponível',
      'Formações', 'Campus', 'Resumo', 'Temas', 'Formatos',
      'Lattes', 'Email', 'WhatsApp', 'Observação'
    ]);
    sheet.getRange(1, 1, 1, 14).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  const timestamp = new Date().toISOString();
  const siape = String(dados.siape || '').trim();

  // Formata formações como texto legível
  const formacoesStr = disponivel && Array.isArray(dados.formacoes)
    ? dados.formacoes.map(f => `${f.nivel}: ${f.curso} — ${f.instituicao}${f.ano ? ' ('+f.ano+')' : ''}`).join(' | ')
    : '';

  const novaLinha = [
    timestamp,
    siape,
    dados.nome || '',
    dados.unidade || '',
    disponivel ? 'Sim' : 'Não',
    formacoesStr,
    dados.campus || '',
    dados.resumo || '',
    dados.temas || '',
    dados.formatos || '',
    dados.lattes || '',
    dados.email || '',
    dados.whatsapp || '',
    dados.observacao || ''
  ];

  // Deduplicação: apaga todas as linhas com o mesmo SIAPE e insere a nova
  const data = sheet.getDataRange().getValues();
  const linhasParaApagar = [];
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).trim() === siape) {
      linhasParaApagar.push(i + 1); // +1 porque sheet rows são 1-indexed
    }
  }
  linhasParaApagar.forEach(row => sheet.deleteRow(row));

  sheet.appendRow(novaLinha);
}

// ── GERAÇÃO E COMMIT DO JSON PÚBLICO ─────────────────────────────────────────
function publicarNoGitHub() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  // Cabeçalho: row 0
  // Filtra apenas quem disse SIM (coluna índice 4 = "Disponível")
  const cadastrados = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[4]).trim().toLowerCase() !== 'sim') continue;

    // Formata formações de volta para array
    const formacoesStr = String(row[5] || '');
    const formacoes = formacoesStr
      ? formacoesStr.split(' | ').map(f => {
          const m = f.match(/^(.+?):\s*(.+?)\s*—\s*(.+?)(?:\s*\((\d+)\))?$/);
          return m
            ? { nivel: m[1], curso: m[2], instituicao: m[3], ano: m[4] || '' }
            : { nivel: '', curso: f, instituicao: '', ano: '' };
        })
      : [];

    cadastrados.push({
      siape: String(row[1]),
      nome: row[2],
      unidade: row[3],
      campus: row[6],
      resumo: row[7],
      temas: row[8],
      formatos: row[9],
      lattes: row[10],
      formacoes
      // email e whatsapp intencionalmente omitidos do JSON público
    });
  }

  const jsonPublico = {
    atualizado: new Date().toISOString(),
    total: cadastrados.length,
    docentes: cadastrados
  };

  commitNoGitHub(JSON.stringify(jsonPublico, null, 2));
}

function commitNoGitHub(conteudo) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;

  // Busca SHA atual do arquivo (se existir)
  let sha = null;
  try {
    const resp = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() === 200) {
      sha = JSON.parse(resp.getContentText()).sha;
    }
  } catch (e) { /* arquivo não existe ainda */ }

  const payload = {
    message: `chore: atualiza cadastros via formulário [${new Date().toISOString()}]`,
    content: Utilities.base64Encode(conteudo, Utilities.Charset.UTF_8),
    committer: { name: 'ASCOM Bot', email: 'ascom@unifesspa.edu.br' }
  };
  if (sha) payload.sha = sha;

  const options = {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch(url, options);
  const code = resp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error(`GitHub API error ${code}: ${resp.getContentText().substring(0, 200)}`);
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function ok(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
function erro(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'erro', msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

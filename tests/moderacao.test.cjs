/** Testes isolados do fluxo de moderação (sem Apps Script real, planilhas ou GitHub). */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');

const codigo = fs.readFileSync(require('node:path').join(__dirname, '..', 'apps-script.js'), 'utf8');
function ambiente({ falharPublicacao = false, falharPlanilha = false } = {}) {
  const registros = [
    { id: 'anterior', siape: '1111111', status: 'aprovado', moderado_em: 'antigo', foto_modo: 'enviada', _linha: 2 },
    { id: 'novo', siape: '1111111', status: 'aguardando_ascom', moderado_em: '', foto_modo: 'enviada', _linha: 3 }
  ];
  const eventos = [];
  let falhaPlanilhaUsada = false;
  const sandbox = {
    console: { error: () => {} },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    autenticar: () => null,
    abaCadastros: () => ({}),
    lerCadastros: () => registros,
    atualizarLinha: (_sh, linha, campos) => {
      eventos.push('planilha:' + linha + ':' + campos.status);
      if (falharPlanilha && !falhaPlanilhaUsada) { falhaPlanilhaUsada = true; throw new Error('Sheets indisponível'); }
      Object.assign(registros.find(x => x._linha === linha), campos);
    },
    publicarFoto: () => { eventos.push('foto:nova'); },
    publicarNoGitHub: () => {
      eventos.push('github:json');
      if (falharPublicacao) throw new Error('GitHub indisponível');
    },
    removerFotoGitHub: x => { eventos.push('foto:remover:' + x.id); }
  };
  vm.createContext(sandbox);
  // Extrair a função para não executar o restante do Apps Script neste ambiente.
  const inicio = codigo.indexOf('function moderar(d) {');
  const fim = codigo.indexOf('\nfunction autenticar(senha)', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  vm.runInContext(codigo.slice(inicio, fim), sandbox);
  return { executar: (decisao, id) => sandbox.moderar({ senha: 'teste', decisao, id }), registros, eventos };
}

test('aprovação substitui o perfil anterior e publica antes de remover foto', () => {
  const a = ambiente();
  assert.equal(a.executar('aprovar', 'novo').status, 'ok');
  assert.equal(a.registros[0].status, 'substituido');
  assert.equal(a.registros[1].status, 'aprovado');
  assert.ok(a.eventos.indexOf('github:json') < a.eventos.indexOf('foto:remover:anterior'));
});

test('falha no GitHub restaura estados e preserva foto anterior', () => {
  const a = ambiente({ falharPublicacao: true });
  assert.equal(a.executar('aprovar', 'novo').status, 'erro');
  assert.equal(a.registros[0].status, 'aprovado');
  assert.equal(a.registros[1].status, 'aguardando_ascom');
  assert.ok(!a.eventos.includes('foto:remover:anterior'));
});

test('falha na gravação restaura registros', () => {
  const a = ambiente({ falharPlanilha: true });
  assert.equal(a.executar('aprovar', 'novo').status, 'erro');
  assert.equal(a.registros[0].status, 'aprovado');
  assert.equal(a.registros[1].status, 'aguardando_ascom');
  assert.ok(!a.eventos.includes('github:json'));
});

test('retirada publica JSON antes de excluir foto', () => {
  const a = ambiente();
  assert.equal(a.executar('retirar', 'anterior').status, 'ok');
  assert.equal(a.registros[0].status, 'retirado');
  assert.ok(a.eventos.indexOf('github:json') < a.eventos.indexOf('foto:remover:anterior'));
});

test('falha na retirada mantém perfil anterior', () => {
  const a = ambiente({ falharPublicacao: true });
  assert.equal(a.executar('retirar', 'anterior').status, 'erro');
  assert.equal(a.registros[0].status, 'aprovado');
  assert.ok(!a.eventos.includes('foto:remover:anterior'));
});

test('rejeição não altera JSON público', () => {
  const a = ambiente();
  assert.equal(a.executar('rejeitar', 'novo').status, 'ok');
  assert.equal(a.registros[1].status, 'rejeitado');
  assert.ok(!a.eventos.includes('github:json'));
});

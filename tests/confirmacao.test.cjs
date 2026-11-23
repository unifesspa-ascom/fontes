const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script.js'), 'utf8');
function extrair(nome, seguinte) {
  const i = codigo.indexOf('function ' + nome + '(');
  const j = codigo.indexOf('\nfunction ' + seguinte + '(', i);
  assert.ok(i >= 0 && j > i, nome + ' deve existir');
  return codigo.slice(i, j);
}
test('domínio institucional exato, sem subdomínio ou sufixo falso', () => {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(extrair('emailInstitucionalValido', 'reenviarConfirmacao'), ctx);
  assert.equal(ctx.emailInstitucionalValido('professor@unifesspa.edu.br'), true);
  assert.equal(ctx.emailInstitucionalValido('PROFESSOR@UNIFESSPA.EDU.BR'), true);
  assert.equal(ctx.emailInstitucionalValido('professor@sub.unifesspa.edu.br'), false);
  assert.equal(ctx.emailInstitucionalValido('professor@unifesspa.edu.br.exemplo.com'), false);
  assert.equal(ctx.emailInstitucionalValido('professor@gmail.com'), false);
});
test('reenvio não revela existência de cadastro e só envia para correspondência exata', () => {
  const registros = [{ id: 'registro1', siape: '1234567', email: 'professor@unifesspa.edu.br', nome: 'Professor',
    status: 'aguardando_email', token: 'antigo', token_expira: 'antigo', _linha: 2 }];
  const envios = [];
  const cache = new Map();
  const ctx = {
    soDigitos: v => String(v).replace(/\D/g, ''),
    limpar: v => String(v),
    limitar: () => true,
    limitarIdentificador: () => true,
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    abaCadastros: () => ({}), lerCadastros: () => registros,
    atualizarLinha: (_sh, _linha, campos) => Object.assign(registros[0], campos),
    Utilities: { getUuid: () => 'abcd-1234' },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k), put: (k,v) => cache.set(k,v) }) },
    enviarLinkDeConfirmacao: (...args) => envios.push(args),
    console
  };
  vm.createContext(ctx);
  vm.runInContext(extrair('emailInstitucionalValido', 'confirmarEmail'), ctx);
  const wrong = ctx.reenviarConfirmacao({ siape: '1234567', email: 'outro@unifesspa.edu.br' });
  assert.equal(wrong.status, 'ok');
  assert.equal(envios.length, 0);
  const ok = ctx.reenviarConfirmacao({ siape: '1234567', email: 'professor@unifesspa.edu.br' });
  assert.equal(ok.status, 'ok');
  assert.equal(ok.msg, wrong.msg);
  assert.equal(envios.length, 1);
  assert.notEqual(registros[0].token, 'antigo');
  ctx.reenviarConfirmacao({ siape: '1234567', email: 'professor@unifesspa.edu.br' });
  assert.equal(envios.length, 1);
});

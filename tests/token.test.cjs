const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script.js'), 'utf8');
test('tokens malformados são rejeitados antes de acessar a planilha', () => {
  const inicio = codigo.indexOf('function confirmarEmail(token) {');
  const fim = codigo.indexOf('\n// ───────────────────────── Painel da ASCOM', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  const ctx = {
    limitarIdentificador: () => true,
    LockService: { getScriptLock: () => { throw Error('Não deve consultar planilha'); } }
  };
  vm.createContext(ctx);
  vm.runInContext(codigo.slice(inicio, fim), ctx);
  for (const token of ['', 'abc', 'z'.repeat(64), '<script>'.repeat(8), '0'.repeat(63)]) {
    assert.equal(ctx.confirmarEmail(token).ok, false);
  }
});

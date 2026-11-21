const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script.js'), 'utf8');
test('erros de senha não bloqueiam autenticação legítima', () => {
  const i = codigo.indexOf('function autenticar(senha) {');
  const j = codigo.indexOf('\n// ───────────────────────── Publicação no GitHub', i);
  assert.ok(i >= 0 && j > i);
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'senha-segura-123456' }) },
    iguais: (a,b) => a === b,
    limitarIdentificador: () => false
  };
  vm.createContext(ctx);
  vm.runInContext(codigo.slice(i,j), ctx);
  assert.equal(ctx.autenticar('errada').status, 'erro');
  assert.equal(ctx.autenticar('senha-segura-123456'), null);
});

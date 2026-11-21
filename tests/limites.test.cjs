const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script.js'), 'utf8');
test('limites de consultas são independentes entre identificadores', () => {
  const inicio = codigo.indexOf('function limitarIdentificador(');
  const fim = codigo.indexOf('\nfunction limitar(', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  const cache = new Map();
  const ctx = {
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (_alg, value) => Array.from(Buffer.from(value)),
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url')
    },
    CacheService: { getScriptCache: () => ({ get: k => cache.get(k), put: (k,v) => cache.set(k,v) }) }
  };
  vm.createContext(ctx);
  vm.runInContext(codigo.slice(inicio, fim), ctx);
  assert.equal(ctx.limitarIdentificador('ver', '1234567', 2, 600), true);
  assert.equal(ctx.limitarIdentificador('ver', '1234567', 2, 600), true);
  assert.equal(ctx.limitarIdentificador('ver', '1234567', 2, 600), false);
  assert.equal(ctx.limitarIdentificador('ver', '7654321', 2, 600), true);
  assert.equal(ctx.limitarIdentificador('cad', '1234567', 2, 600), true);
  assert.equal(ctx.limitarIdentificador('ver', '', 2, 600), false);
  assert.ok([...cache.keys()].every(k => !k.includes('1234567')));
});

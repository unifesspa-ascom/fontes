const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'apps-script.js'), 'utf8');
test('GET de confirmação apenas apresenta página, sem consumir token', () => {
  const inicio = codigo.indexOf('function doGet(e) {');
  const fim = codigo.indexOf('\nfunction resp(obj)', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  const chamadas = [];
  const ctx = {
    paginaConfirmacao: t => { chamadas.push(['pagina', t]); return { html: true }; },
    confirmarEmail: () => { throw new Error('GET não pode confirmar'); },
    resp: () => ({ json: true })
  };
  vm.createContext(ctx);
  vm.runInContext(codigo.slice(inicio, fim), ctx);
  assert.equal(ctx.doGet({ parameter: { acao: 'confirmar', t: 'token-teste' } }).html, true);
  assert.equal(chamadas.length, 1);
  assert.equal(chamadas[0][1], 'token-teste');
});
test('página exige clique explícito para chamar confirmarEmail', () => {
  const inicio = codigo.indexOf('function paginaConfirmacao(token) {');
  const fim = codigo.indexOf('\n/** Limite por identificador', inicio);
  assert.ok(inicio >= 0 && fim > inicio);
  let template = '';
  const ctx = {
    HtmlService: { createTemplate: html => {
      template = html;
      return { evaluate() { return { setTitle() { return { html: template }; } }; } };
    } }
  };
  vm.createContext(ctx);
  vm.runInContext(codigo.slice(inicio, fim), ctx);
  const pagina = ctx.paginaConfirmacao('token-teste');
  assert.match(pagina.html, /addEventListener\("click"/);
  assert.match(pagina.html, /\.confirmarEmail\(token\)/);
  assert.match(pagina.html, /<\/script>/);
  assert.match(template, /<button id="confirmar"/);
});

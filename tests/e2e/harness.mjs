// Arnés de pruebas en navegador real (Edge o Chrome sin interfaz) por el protocolo DevTools (CDP).
// No usa librerías: Node 22 trae fetch y WebSocket.
//
// ¿Por qué CDP y no `--dump-dom --virtual-time-budget`? El "tiempo virtual" no espera a Web Crypto
// (PBKDF2 corre fuera del hilo principal) y el login se quedaba congelado.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BROWSER = process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5600/';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startBrowser(width = 1366) {
  // Puerto aleatorio: un navegador que quedó vivo de otra corrida no debe "contestar" por este.
  const port = 9500 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-e2e-'));
  const proc = spawn(BROWSER, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},900`, 'about:blank']);

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) throw new Error(`No se pudo abrir el navegador (${BROWSER}). Define BROWSER_PATH.`);

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let seq = 0;
  const pending = new Map();
  const errors = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result ?? { error: m.error });
      pending.delete(m.id);
    }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url ?? ''}`);
  });
  // Cada comando tiene tiempo límite: si el navegador se cuelga o cierra, la prueba falla en vez de esperar para siempre.
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => (pending.delete(id), reject(new Error(`CDP sin respuesta: ${method}`))), 15000);
      pending.set(id, (value) => (clearTimeout(timer), resolve(value)));
      ws.send(JSON.stringify({ id, method, params }));
    });
  ws.addEventListener('close', () => errors.push('Se cerró la conexión con el navegador'));
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }))?.result?.value;

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });

  const results = [];
  const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`);
  const here = () => evaluate('location.pathname + location.search');

  async function go(url) {
    const target = BASE + url;
    await send('Page.navigate', { url: target });
    // Hasta que el documento NUEVO esté activo: si no, waitReady() vería la página anterior.
    // (Si la página redirige, la URL cambia: por eso también se acepta pasados 600 ms.)
    const t0 = Date.now();
    while (Date.now() - t0 < 3000) {
      const href = await evaluate('location.href + "|" + document.readyState');
      if (href === `${target}|complete` || (href && !href.startsWith(target) && Date.now() - t0 > 600)) break;
      await sleep(100);
    }
  }

  /** Página lista: cargada, sin <main aria-busy> y con su <h1>. */
  async function waitReady(timeout = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (await evaluate(`document.readyState === 'complete' && !document.querySelector('main[aria-busy="true"]') && !!document.querySelector('h1')`)) return true;
      await sleep(150);
    }
    return false;
  }

  async function login(email, password) {
    await go('login.html');
    await waitReady();
    await evaluate(`(() => {
      const set = (n, v) => { const el = document.querySelector('[name="' + n + '"]'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('email', ${JSON.stringify(email)}); set('password', ${JSON.stringify(password)});
      document.querySelector('form.auth-form').requestSubmit();
    })()`);
    for (let i = 0; i < 40; i++) {
      await sleep(150);
      if (!(await here()).includes('login.html')) break;
    }
  }

  async function screenshot(file) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
  }

  function finish() {
    // Este mensaje lo emite una extensión interna de Edge, no la aplicación.
    const unique = [...new Set(errors)].filter((e) => !e.includes('Receiving end does not exist'));
    check('Sin errores de JavaScript en la consola', unique.length === 0, unique.slice(0, 5).join(' || '));
    console.log(results.join('\n'));
    const fails = results.filter((r) => r.startsWith('FAIL')).length;
    console.log(`\nTOTAL ${results.length} · FAILS ${fails}`);
    ws.close();
    proc.kill();
    process.exitCode = fails ? 1 : 0;
  }

  return { send, evaluate, go, waitReady, login, here, check, screenshot, finish };
}

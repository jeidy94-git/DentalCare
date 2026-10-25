// Arnés de pruebas en navegador real (Edge o Chrome sin interfaz) por el protocolo DevTools (CDP).
// No usa librerías: Node 22 trae fetch y WebSocket.
//
// ¿Por qué CDP y no `--dump-dom --virtual-time-budget`? El "tiempo virtual" no espera a Web Crypto
// (PBKDF2 corre fuera del hilo principal) y el login se quedaba congelado.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BROWSER = process.env.BROWSER_PATH ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5600/';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cierre forzado y SÍNCRONO (sirve también en process.on('exit')) de todo lo que abrió esta corrida.
 * `proc.kill()` solo terminaba el proceso lanzado y en Windows quedaban vivos los hijos de Edge (renderers,
 * GPU, utilidades), que se acumulaban entre corridas hasta dejar la máquina sin memoria. Por eso:
 *  1. taskkill /T /F sobre el árbol del proceso lanzado. Con Chrome basta; msedge.exe en cambio es un
 *     LANZADOR: arranca el navegador real como otro proceso y termina, así que su árbol queda huérfano.
 *  2. Barrido de huérfanos: los msedge.exe cuya línea de comandos usa el perfil temporal de ESTA corrida
 *     (nombre único: nunca toca el Edge del usuario). Se repite hasta que no quede ninguno, porque mientras
 *     Edge se cierra todavía puede arrancar algún proceso auxiliar.
 *  3. Borra la carpeta del perfil (solo se puede cuando ya no hay procesos que la tengan abierta).
 */
function killBrowserTree(proc, profile) {
  if (process.platform === 'win32') {
    if (proc.pid) spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    const marker = path.basename(profile);
    const sweep = `
      for ($i = 0; $i -lt 20; $i++) {
        $p = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like '*${marker}*' }
        if (-not $p) { break }
        $p | Invoke-CimMethod -MethodName Terminate -ErrorAction SilentlyContinue | Out-Null
        Start-Sleep -Milliseconds 300
      }`;
    spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', sweep], { stdio: 'ignore', windowsHide: true });
  } else if (proc.exitCode === null) {
    proc.kill('SIGKILL');
  }
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {}
}

export async function startBrowser(width = 1366) {
  // Puerto aleatorio: un navegador que quedó vivo de otra corrida no debe "contestar" por este.
  const port = 9500 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dc-e2e-'));
  const proc = spawn(BROWSER, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, `--window-size=${width},900`, 'about:blank']);

  // El navegador se cierra pase lo que pase: fin normal, excepción no atrapada o Ctrl+C.
  let closed = false;
  const forceClose = () => {
    if (closed) return;
    closed = true;
    killBrowserTree(proc, profile);
  };
  process.on('exit', forceClose);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => (forceClose(), process.exit(130)));

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    } catch {}
  }
  if (!target) {
    forceClose();
    throw new Error(`No se pudo abrir el navegador (${BROWSER}). Define BROWSER_PATH.`);
  }

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

  // "Receiving end…" lo emite una extensión interna de Edge, no la aplicación.
  const ignored = [/Receiving end does not exist/];
  /** Errores de consola ESPERADOS en una prueba (p. ej. peticiones bloqueadas a propósito). */
  const ignoreErrors = (pattern) => ignored.push(pattern);

  /**
   * Cierre ordenado: Browser.close por la conexión CDP del NAVEGADOR (la de la pestaña no lo admite) y espera
   * a que el navegador deje de responder (hasta 5 s). No sirve esperar a `proc`: con Edge es el lanzador y ya
   * terminó. Después, siempre, el cierre forzado por si quedó algún proceso vivo.
   */
  async function closeBrowser() {
    ws.close();
    const version = `http://127.0.0.1:${port}/json/version`;
    try {
      const { webSocketDebuggerUrl } = await (await fetch(version)).json();
      const browserWs = new WebSocket(webSocketDebuggerUrl);
      await new Promise((resolve, reject) => (browserWs.addEventListener('open', resolve), browserWs.addEventListener('error', reject)));
      browserWs.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
      for (let i = 0; i < 25; i++) {
        await sleep(200);
        await fetch(version, { signal: AbortSignal.timeout(500) }); // lanza cuando el navegador ya cerró
      }
    } catch {}
    forceClose();
  }

  async function finish() {
    const unique = [...new Set(errors)].filter((e) => !ignored.some((re) => re.test(e)));
    check('Sin errores de JavaScript en la consola', unique.length === 0, unique.slice(0, 5).join(' || '));
    console.log(results.join('\n'));
    const fails = results.filter((r) => r.startsWith('FAIL')).length;
    console.log(`\nTOTAL ${results.length} · FAILS ${fails}`);
    process.exitCode = fails ? 1 : 0;
    await closeBrowser();
  }

  return { send, evaluate, go, waitReady, login, here, check, screenshot, ignoreErrors, finish };
}

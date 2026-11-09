import { chromium, expect } from '../e2e/node_modules/@playwright/test/index.mjs';
const phase = process.argv[2];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
await context.addInitScript(() => {
  window.EventSource = class extends EventTarget {
    readyState = 1;
    constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event('open'))); }
    close() { this.readyState = 2; }
  };
});
const project = { id: 'p', name: 'Shell and plan approval fixture', root: '/tmp/fixture', updatedAt: 1 };
const session = { id: 's', projectId: 'p', harness: 'codex', title: 'Inspect files before approving a plan', model: 'gpt-6.1-sol', permissionMode: 'auto', planMode: true, autonomy: 'agentic', archived: false, createdAt: 1, updatedAt: 4, busy: false, activeLeafId: 'plan' };
const messages = [
  { id: 'u1', role: 'user', parts: [{ id: 'u1-text', type: 'text', text: 'Make a plan for inspecting the sample data.' }], createdAt: 1, parentId: null },
  { id: 'plan', role: 'assistant', parts: [{ id: 'plan-text', type: 'text', text: 'I will inspect the sample data and its metadata.' }, { id: 'plan-prompt', type: 'prompt', prompt: { kind: 'plan', plan: 'Inspect the sample data and its metadata.', resolved: false, synthesized: true } }], createdAt: 2, completedAt: 2, parentId: 'u1' },
];
const harness = { id: 'codex', name: 'Codex', installed: true, authenticated: true, authState: 'ready', agentReady: true, supportsSteering: true, supportsCompaction: true, models: [{ id: 'gpt-6.1-sol' }], options: { permissionModes: [{ id: 'auto', label: 'Auto' }], defaultPermissionMode: 'auto', planActivation: 'command', reasoningLevels: [] } };
let shellRequest, approval;
await context.route('**/*', async route => {
  const req = route.request(); const url = new URL(req.url()); const p = url.pathname;
  if (url.origin !== 'http://127.0.0.1:4972') return route.abort();
  if (!p.startsWith('/api/') && !p.startsWith('/_orx/')) return route.continue();
  let data = {};
  if (p === '/_orx/runtime') data = { kind: 'local', version: 'fixture', buildChannel: 'stable' };
  else if (p === '/api/projects') data = { projects: [project] };
  else if (p === '/api/projects/p') data = { project };
  else if (p === '/api/projects/activity') data = { activity: [] };
  else if (p === '/api/settings/ui-state') data = { onboardingCompleted: true };
  else if (p === '/api/update' || p.endsWith('/ui-state')) data = req.method() === 'POST' ? req.postDataJSON() : null;
  else if (p === '/api/chat/sessions') data = { sessions: [session] };
  else if (p === '/api/chat/sessions/s') data = { session };
  else if (p === '/api/chat/sessions/s/messages') data = { messages, queued: [], activeLeafId: messages.at(-1).id };
  else if (p === '/api/chat/sessions/s/shell') {
    shellRequest = req.postDataJSON();
    const message = { id: 'shell', role: 'user', parentId: 'plan', createdAt: 3, parts: [{ id: 'shell-result', type: 'tool', tool: 'bash', state: { status: 'completed', input: { command: shellRequest.command, exitCode: 0 }, output: 'On branch main\nnothing to commit, working tree clean' } }] };
    messages.push(message);
    data = { message };
  } else if (p === '/api/chat/sessions/s/respond') {
    approval = req.postDataJSON();
    messages[1].parts[1].prompt = { ...messages[1].parts[1].prompt, resolved: true, approved: true };
    session.planMode = false;
    data = { ok: true };
  } else if (p === '/api/chat/active-runs') data = [];
  else if (p === '/api/harnesses') data = { harnesses: [harness] };
  else if (p === '/api/skills') data = { skills: [] };
  else if (p === '/api/remote/sessions') data = { sessions: [] };
  else if (p.endsWith('/experiments')) data = { experiments: [] };
  else if (p.endsWith('/runs')) data = { runs: [] };
  else if (p.endsWith('/code-tree')) data = { root: 'fixture', branch: 'main', entries: [] };
  else if (p.startsWith('/api/telemetry/')) data = req.postDataJSON();
  await route.fulfill({ json: data });
});
const page = await context.newPage();
page.on('pageerror', error => { throw error; });
await page.goto('http://127.0.0.1:4972/projects/p/tasks/s');
const field = page.locator('[data-onboarding="composer"] .cm-content');
await expect(field).toBeVisible();
await expect(page.locator('.plan-strip')).toHaveCount(1);
await field.fill('!git status');
await field.press('Enter');
await expect.poll(() => shellRequest).toEqual({ command: 'git status' });
await expect(page.locator('.msg-shell')).toContainText('working tree clean');
await expect(field.locator('.cm-placeholder')).toBeVisible();
await expect(page.locator('.plan-strip')).toHaveCount(phase === 'before' ? 0 : 1);
await page.screenshot({ animations: 'disabled', path: `.shots/shell-plan-${phase}.png` });
if (phase === 'after') {
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await page.screenshot({ animations: 'disabled', path: '.shots/shell-plan-after-dark.png' });
  await page.setViewportSize({ width: 720, height: 850 });
  await expect(page.getByRole('button', { name: 'Accept plan', exact: true })).toBeVisible();
  await page.screenshot({ animations: 'disabled', path: '.shots/shell-plan-after-narrow.png' });
  await page.getByRole('button', { name: 'Accept plan', exact: true }).click();
  await expect.poll(() => approval?.promptId).toBe('plan-prompt');
  expect(approval.approve).toBe(true);
  await expect(page.locator('.plan-strip')).toHaveCount(0);
}
console.log(JSON.stringify({ phase, shellRequest, approval: approval ?? null, shellOutputVisible: true }));
await browser.close();

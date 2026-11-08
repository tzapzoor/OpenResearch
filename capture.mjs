import { chromium, expect } from '../e2e/node_modules/@playwright/test/index.mjs';
const phase = process.argv[2];
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 850 }, colorScheme: 'light' });
await context.addInitScript(() => {
  window.__streams = [];
  window.EventSource = class extends EventTarget {
    static CLOSED = 2;
    readyState = 1;
    constructor() { super(); window.__streams.push(this); queueMicrotask(() => this.dispatchEvent(new Event('open'))); }
    close() { this.readyState = 2; }
  };
});
const project = { id: 'p', name: 'Steering regression fixture', root: '/tmp/fixture', updatedAt: 1 };
const session = { id: 's', projectId: 'p', harness: 'codex', title: 'Plan followed by a new turn', model: 'gpt-6.1-sol', serviceTier: null, permissionMode: 'auto', planMode: true, reasoningLevel: null, autonomy: 'agentic', archived: false, createdAt: 1, updatedAt: 4, busy: true, awaitingInput: false, activeLeafId: 'a2', sideParentSessionId: null, delegate: null, goal: null };
const messages = [
  { id: 'u1', role: 'user', parts: [{ id: 'u1-text', type: 'text', text: 'Make a plan for inspecting the sample data.' }], createdAt: 1, parentId: null },
  { id: 'a1', role: 'assistant', parts: [{ id: 'a1-text', type: 'text', text: 'I will inspect the sample data and its metadata.' }, { id: 'a1-plan', type: 'prompt', prompt: { kind: 'plan', plan: 'Inspect the sample data and its metadata.', resolved: false, synthesized: true } }], createdAt: 2, completedAt: 2, parentId: 'u1' },
  { id: 'u2', role: 'user', parts: [{ id: 'u2-text', type: 'text', text: 'Start by inspecting the inputs.' }], createdAt: 3, parentId: 'a1' },
  { id: 'a2', role: 'assistant', parts: [{ id: 'a2-text', type: 'text', text: 'Inspecting the inputs. You can send a follow-up while this turn runs.' }], createdAt: 4, completedAt: null, parentId: 'u2' },
];
const codex = { id: 'codex', name: 'Codex', installed: true, installBroken: false, authenticated: true, authState: 'ready', agentReady: true, supportsSteering: true, supportsCompaction: true, models: [{ id: 'gpt-6.1-sol' }], options: { permissionModes: [{ id: 'auto', label: 'Auto' }], defaultPermissionMode: 'auto', planActivation: 'command', reasoningLevels: [] } };
const sends = [];
let queued = [];
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
  else if (p === '/api/chat/sessions/s/messages') data = { messages, queued, activeLeafId: 'a2' };
  else if (p === '/api/chat/sessions/s/message') {
    const submission = req.postDataJSON();
    sends.push(submission);
    if (submission.mode === 'steer') {
      messages.at(-1).parts.push({ id: 'a2-steer', type: 'steer', text: submission.text });
      data = { ok: true };
    } else {
      queued = [{ id: 'q1', text: submission.text, planMode: true, dispatchState: 'queued', error: null, nextRetryAt: null }];
      data = { ok: true, turn: { id: 'q1', queued: true, existing: false } };
    }
  }
  else if (p === '/api/chat/active-runs') data = [];
  else if (p === '/api/harnesses') data = { harnesses: [codex] };
  else if (p === '/api/skills') data = { skills: [] };
  else if (p === '/api/remote/sessions') data = { sessions: [] };
  else if (p.endsWith('/experiments')) data = { experiments: [] };
  else if (p.endsWith('/runs')) data = { runs: [] };
  else if (p.endsWith('/code-tree')) data = { root: 'fixture', branch: 'main', entries: [] };
  else if (p.startsWith('/api/telemetry/')) data = req.postDataJSON();
  await route.fulfill({ json: data });
});
const page = await context.newPage();
page.on('pageerror', e => console.error('pageerror:', e.message));
await page.goto('http://127.0.0.1:4972/projects/p/tasks/s');
const field = page.locator('[data-onboarding="composer"] .cm-content');
await expect(field).toBeVisible();
await expect(page.locator('.plan-strip')).toHaveCount(phase === 'before' ? 1 : 0);
await field.fill('Also inspect the metadata.');
await field.press('Enter');
await expect.poll(() => sends.length).toBe(1);
await expect(field.locator('.cm-placeholder')).toBeVisible();
// The fixture acknowledges the real request, then sends the matching server event.
const event = sends[0].mode === 'steer'
  ? { type: 'chat.message', data: { sessionId: 's', message: messages.at(-1) } }
  : { type: 'chat.queued', data: { sessionId: 's', items: queued } };
await page.evaluate(({ type, data }) => {
  for (const stream of window.__streams.filter(s => s.readyState !== 2)) {
    stream.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) }));
  }
}, event);
if (phase === 'before') {
  expect(sends[0].mode).toBeUndefined();
  await expect(page.locator('.queued-chip')).toContainText('Also inspect the metadata.');
  await expect(page.locator('.queued-chip')).toContainText('Queued');
  await expect(page.locator('.msg-steer')).toHaveCount(0);
} else {
  expect(sends[0].mode).toBe('steer');
  await expect(page.locator('.msg-steer')).toHaveText('Also inspect the metadata.');
  await expect(page.locator('.queued-chip')).toHaveCount(0);
}
await page.screenshot({ path: `.shots/${phase}.png` });
console.log(JSON.stringify({ phase, text: sends[0].text, mode: sends[0].mode ?? 'queued', pendingPlan: await page.locator('.plan-strip').count(), queuedChips: await page.locator('.queued-chip').count(), steerBubbles: await page.locator('.msg-steer').count(), composerCleared: await field.locator('.cm-placeholder').isVisible() }));
if (phase === 'after') {
  expect(sends[0].mode).toBe('steer');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '.shots/after-dark.png' });
  await page.setViewportSize({ width: 720, height: 850 });
  await expect(field).toBeVisible();
  await page.screenshot({ path: '.shots/after-narrow.png' });
}
await browser.close();

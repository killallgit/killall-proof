// Optional browser regression runner: requires Playwright and its Chromium browser.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const source = path.resolve(__dirname, '../skills/proofcast');
const encode = text => Buffer.from(text).toString('base64');

(async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'proofcast-browser-'));
  const root = path.join(temporary, 'proof');
  const browser = await chromium.launch({ headless: true });
  try {
    const slug = 'test-capture';
    const stamp = '20261017-150000-000';
    await fs.mkdir(path.join(root, slug), { recursive: true });
    await fs.writeFile(path.join(root, slug, `${stamp}.cast`),
      '{"version":2,"width":80,"height":12}\n[0.1,"o","Browser test fixture\\r\\n"]\n[6,"o","middle\\r\\n"]\n[12,"o","end\\r\\n"]\n');
    await fs.writeFile(path.join(root, slug, `${stamp}.stdout.log`), '$ test-fixture\nBrowser test fixture\n');
    await fs.writeFile(path.join(root, slug, `${stamp}.gif`), Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    await fs.writeFile(path.join(root, slug, `${stamp}.meta.json`), JSON.stringify({
      assertion: encode('A browser test fixture renders <script> as text.'),
      justification: encode('Load the fixture to check playback controls.'),
      command: encode("test-fixture 'spaces and café'"),
      exitStatus: 7
    }));
    await fs.mkdir(path.join(root, 'legacy'));
    await fs.writeFile(path.join(root, 'legacy/20260101-120000-000.cast'),
      '{"version":2,"width":80,"height":12}\n[0.1,"o","legacy\\r\\n"]\n[1,"o","end"]\n');
    execFileSync('bash', [path.join(source, 'scripts/proofcast-index.sh'), root]);
    const index = path.join(root, 'index.html');
    const original = await fs.readFile(index, 'utf8');
    const url = pathToFileURL(index).href;
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    page.on('dialog', dialog => dialog.accept().catch(error => errors.push(error.message)));
    const errors = [];
    const network = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url())) network.push(request.url());
    });
    await page.goto(url);
    await page.waitForFunction(() => !document.getElementById('toggle').disabled);
    assert.match(await page.locator('#assertion').textContent(), /<script>/);
    assert.match(await page.locator('#exit-status').textContent(), /7.*failed/);
    assert.equal(await page.locator('#toggle').textContent(), 'Play');
    assert.equal(await page.locator('#export').textContent(), 'Save');
    assert.equal(await page.locator('#gif').count(), 0);
    assert.equal(await page.locator('#auto-next').isChecked(), true);
    await page.locator('#auto-next').uncheck();
    await page.locator('#position').evaluate(input => {
      input.value = '6';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => Number(document.getElementById('position').value) >= 5.9);
    for (const label of ['1.5x', '2x', '0.5x', '1x']) {
      await page.locator('#speed').click();
      await page.waitForFunction(() => !document.getElementById('toggle').disabled);
      assert.equal(await page.locator('#speed').textContent(), label);
    }
    assert.ok(Number(await page.locator('#position').inputValue()) >= 5.9, 'speed change preserves time');
    assert.equal(await page.locator('#toggle').textContent(), 'Play', 'speed change preserves pause');
    await page.locator('#back').click();
    await page.waitForFunction(() => Number(document.getElementById('position').value) < 1.2);
    await page.locator('#back').click();
    await page.waitForFunction(() => Number(document.getElementById('position').value) < 0.1);
    await page.locator('#forward').click();
    await page.waitForFunction(() => Number(document.getElementById('position').value) >= 4.9);
    await page.locator('#forward').click();
    await page.waitForFunction(() => Number(document.getElementById('position').value) >= 9.9);
    await page.locator('#forward').click();
    await page.waitForFunction(() => Number(document.getElementById('position').value) >= 11.9);
    assert.ok(Number(await page.locator('#position').inputValue()) <= 12, 'forward clamps to duration');
    await page.locator('#position').evaluate(input => {
      input.value = '0';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => Number(document.getElementById('position').value) < 0.1);
    await page.locator('#toggle').click();
    await page.waitForFunction(() => document.getElementById('toggle').textContent === 'Pause');
    await page.locator('#speed').click();
    await page.waitForFunction(() => !document.getElementById('toggle').disabled && document.getElementById('toggle').textContent === 'Pause');
    await page.waitForFunction(() => Number(document.getElementById('position').value) > 1);
    await page.locator('#toggle').click();
    // With auto-next off, completing playback keeps the current capture.
    await page.locator('#position').evaluate(input => {
      input.value = '11.8';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => Number(document.getElementById('position').value) >= 11.7);
    await page.locator('#toggle').click();
    await page.waitForFunction(() => document.getElementById('toggle').textContent === 'Play');
    assert.equal(await page.locator('#title').textContent(), 'Test capture');
    await page.locator('#auto-next').check();
    await page.locator('#position').evaluate(input => {
      input.value = '11.8';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => Number(document.getElementById('position').value) >= 11.7);
    await page.locator('#toggle').click();
    await page.waitForFunction(() => document.getElementById('title').textContent === 'Legacy' &&
      document.getElementById('toggle').textContent === 'Pause');
    await page.waitForFunction(() => document.getElementById('toggle').textContent === 'Play');
    assert.equal(await page.locator('#title').textContent(), 'Legacy', 'last capture does not loop');
    await page.locator('.recording').nth(1).click();
    await page.waitForFunction(() => !document.getElementById('toggle').disabled);
    assert.match(await page.locator('#assertion').textContent(), /older recording/);
    await page.locator('.recording').first().click();
    await page.waitForFunction(() => !document.getElementById('toggle').disabled);
    for (const width of [320, 390, 768, 1200]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no overflow at ${width}px`);
      const logLink = await page.locator('#log').boundingBox();
      const autoNext = await page.locator('.auto-next').boundingBox();
      const links = await page.locator('.links').boundingBox();
      assert.ok(Math.abs(logLink.x - links.x) < 1 &&
        Math.abs(autoNext.x + autoNext.width - links.x - links.width) < 1, 'log and auto-play align to opposite edges');
      assert.equal(await page.locator('#log').evaluate(link => getComputedStyle(link).borderTopWidth), '0px', 'text log is a plain link');
      const controls = await page.locator('.button-group button').all();
      assert.equal(controls.length, 4);
      const boxes = await page.locator('.button-group button').evaluateAll(buttons =>
        buttons.map(button => {
          const { x, y, width, height } = button.getBoundingClientRect();
          return { x, y, width, height };
        }));
      assert.ok(boxes.every(box => box.y === boxes[0].y), 'controls stay on one row');
      assert.ok(boxes[3].x > boxes[2].x + boxes[2].width, 'space before speed button');
      const group = await page.locator('.button-group').boundingBox();
      assert.ok(Math.abs(boxes[0].x - group.x) < 1 &&
        Math.abs(boxes[3].x + boxes[3].width - group.x - group.width) < 1, 'buttons fill the row');
      assert.ok(boxes.every(box => box.width >= (group.width - 16) / 4 - 1), 'buttons expand evenly');
      for (const selector of ['#back', '#toggle', '#forward', '#speed']) {
        assert.ok((await page.locator(selector).boundingBox()).height >= 44, 'touch target height');
      }
    }
    if (process.env.PROOFCAST_SCREENSHOTS) {
      await fs.mkdir(process.env.PROOFCAST_SCREENSHOTS, { recursive: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(process.env.PROOFCAST_SCREENSHOTS, 'mobile.png'), fullPage: true });
      await page.setViewportSize({ width: 1200, height: 900 });
      await page.screenshot({ path: path.join(process.env.PROOFCAST_SCREENSHOTS, 'desktop.png'), fullPage: true });
    }
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await downloadEvent;
    const exported = path.join(temporary, 'exported.html');
    await download.saveAs(exported);
    await page.evaluate(() => {
      for (const id of ['error', 'cleanup-error']) {
        const element = document.getElementById(id);
        element.textContent = 'An error from another recording';
        element.hidden = false;
      }
    });
    const secondDownloadEvent = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await secondDownloadEvent).saveAs(exported);
    await page.goto(pathToFileURL(exported).href);
    await page.waitForFunction(() => !document.getElementById('toggle').disabled);
    assert.equal(await page.locator('.recording').count(), 1);
    assert.equal(await page.locator('#nuke').isVisible(), false);
    assert.equal(await page.locator('#gif').count(), 0);
    assert.equal(await page.evaluate(() => JSON.parse(document.getElementById('data').textContent).rootPath), '');
    assert.match(await page.locator('#log').getAttribute('href'), /^data:text\/plain;base64,/);
    for (const id of ['notice', 'error', 'cleanup-error']) {
      assert.equal(await page.locator(`#${id}`).getAttribute('hidden'), '', 'saved page hides cleared messages');
      assert.equal(await page.locator(`#${id}`).textContent(), '', 'saved page clears unrelated messages');
    }

    // Fake folder handles exercise deletion boundaries without touching real files.
    await page.addInitScript(({ html }) => {
        const mode = new URL(location.href).searchParams.get('cleanup');
        if (!mode) return;
        const data = JSON.parse(new DOMParser().parseFromString(html, 'text/html').getElementById('data').textContent);
        const decode = value => atob(value);
        const files = new Map([['index.html', html], ['notes.txt', 'keep']]);
        for (const recording of data.recordings) {
          const prefix = `${decode(recording.slug)}/${decode(recording.stamp)}`;
          files.set(`${prefix}.cast`, '');
          if (recording.log) files.set(`${prefix}.stdout.log`, '');
          if (recording.meta) files.set(`${prefix}.meta.json`, '');
          if (recording.gif) files.set(`${prefix}.gif`, '');
        }
        window.testFiles = files;
        window.testDeleted = [];
        const handle = prefix => ({
          name: prefix ? prefix.slice(0, -1) : 'proof',
          getDirectoryHandle: async name => handle(`${name}/`),
          getFileHandle: async name => {
            const key = prefix + name;
            if (!files.has(key) || (mode === 'missing' && key.endsWith('.meta.json'))) throw new Error('File missing');
            return { getFile: async () => ({ text: async () => mode === 'changed' && key === 'index.html' ? html.replace('"root":', '"changed":true,"root":') : files.get(key) }) };
          },
          removeEntry: async name => {
            if (mode === 'partial' && window.testDeleted.length === 1) throw new Error('Permission lost');
            files.delete(prefix + name);
            window.testDeleted.push(prefix + name);
          }
        });
        window.showDirectoryPicker = mode === 'unsupported' ? undefined : async () => {
          if (mode === 'denied') throw new DOMException('Permission denied', 'NotAllowedError');
          return handle('');
        };
    }, { html: original });
    async function cleanupCase(mode) {
      await page.goto(`${url}?cleanup=${mode}`);
      await page.locator('#nuke').click();
      if (mode === 'unsupported') {
        assert.equal(await page.locator('#fallback').isVisible(), true);
        assert.match(await page.locator('#cleanup-command').textContent(), /rm -f -- '/);
        assert.doesNotMatch(await page.locator('#cleanup-command').textContent(), /notes\.txt|rm -rf/);
        return;
      }
      await page.locator('#delete-files').click();
      if (mode === 'success') {
        await page.waitForFunction(() => document.getElementById('notice').textContent.includes('Proof files deleted'));
        assert.deepEqual(await page.evaluate(() => [...testFiles.keys()]), ['notes.txt']);
      } else {
        await page.waitForFunction(() => !document.getElementById('cleanup-error').hidden);
        assert.equal(await page.evaluate(() => testDeleted.length), mode === 'partial' ? 1 : 0);
        assert.equal(await page.evaluate(() => testFiles.has('notes.txt') && testFiles.has('index.html')), true);
      }
    }
    for (const mode of ['unsupported', 'denied', 'changed', 'missing', 'partial', 'success']) await cleanupCase(mode);
    const invalid = original.replace(
      /(<script id="data" type="application\/json">)([\s\S]*?)(<\/script>)/,
      (_, start, text, end) => {
        const data = JSON.parse(text);
        data.recordings[0].meta = encode('{"assertion":"incomplete metadata"}');
        return start + JSON.stringify(data) + end;
      }
    );
    await fs.writeFile(index, invalid);
    await page.goto(url);
    await page.waitForFunction(() => !document.getElementById('toggle').disabled);
    assert.match(await page.locator('#error').textContent(), /invalid metadata fields/);
    assert.match(await page.locator('#assertion').textContent(), /unreadable/);
    await page.goto(pathToFileURL(path.join(source, 'resources/index.html')).href);
    assert.equal(await page.locator('#empty').isVisible(), true);
    assert.equal(await page.locator('#capture').isVisible(), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(network, []);
    console.log('Offline playback, rewind, speed, export, mobile layout, legacy/empty state, and safe cleanup cases passed.');
  } finally {
    await browser.close();
    await fs.rm(temporary, { recursive: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

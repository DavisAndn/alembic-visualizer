import assert from "node:assert/strict";
import {
  getEmptyHtml,
  getErrorHtml,
  getGraphHtml,
  getLoadingHtml,
} from "../../src/ui/webviewHtml";

describe("webviewHtml", () => {
  it("loading html shows a spinner", () => {
    assert.match(getLoadingHtml(), /spinner/);
  });

  it("error html escapes the detail and shows the hint", () => {
    const html = getErrorHtml({
      title: "Boom",
      detail: "<script>alert(1)</script>",
      hint: "do X",
    });
    assert.match(html, /Boom/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /do X/);
  });

  it("empty html gives recursive-versions guidance and escapes the label", () => {
    const html = getEmptyHtml('proj"<b>');
    assert.match(html, /No migrations found/);
    assert.match(html, /version_locations|recursive/i);
    assert.doesNotMatch(html, /<b>/);
  });

  it("graph html: nonce CSP, bundled mermaid, embedded extractor, no CDN", () => {
    const html = getGraphHtml({
      nonce: "NONCE123",
      mermaidUri: "vscode-webview://abc/media/mermaid.esm.min.mjs",
      cspSource: "vscode-webview://abc",
      projectLabel: "backend/alembic.ini",
    });
    assert.match(html, /Content-Security-Policy/);
    assert.match(html, /script-src 'nonce-NONCE123'/);
    assert.match(html, /<script type="module" nonce="NONCE123">/);
    assert.match(html, /media\/mermaid\.esm\.min\.mjs/);
    assert.doesNotMatch(html, /cdn\.jsdelivr\.net|https:\/\/cdn/);
    assert.match(html, /extractSyntheticNodeId/);
    assert.match(html, /securityLevel: "strict"/);
    assert.match(html, /type: "ready"/);
    assert.match(html, /backend\/alembic\.ini/);
  });

  it("graph html escapes a malicious project label", () => {
    const html = getGraphHtml({
      nonce: "n",
      mermaidUri: "m",
      cspSource: "c",
      projectLabel: '"><img src=x onerror=alert(1)>',
    });
    assert.doesNotMatch(html, /<img src=x/);
  });
});

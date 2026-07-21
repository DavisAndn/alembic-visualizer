// Entry point bundled by esbuild into `media/mermaid.esm.min.mjs`, a single,
// self-contained ESM module the webview imports locally (no CDN). Re-exporting
// the default keeps `import mermaid from "...mjs"` working in the webview.
import mermaid from "mermaid";
export default mermaid;

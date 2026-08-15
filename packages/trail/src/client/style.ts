/** Package-owned stylesheet, inserted at plugin apply and removed on unload. */

export const TRAIL_CSS = `
.tf-root { display: flex; flex-direction: column; gap: 10px; padding: 12px; height: 100%; overflow-y: auto; box-sizing: border-box; font-size: 13px; line-height: 1.65; }
.tf-top { display: flex; gap: 8px; align-items: center; }
.tf-search { flex: 1; padding: 6px 10px; border: 1px solid color-mix(in srgb, currentColor 28%, transparent); border-radius: 8px; background: transparent; color: inherit; font-size: 13px; }
.tf-btn { padding: 2px 8px; border: 1px solid color-mix(in srgb, currentColor 25%, transparent); border-radius: 8px; background: transparent; color: inherit; cursor: pointer; font-size: 11px; line-height: 1.6; flex: none; }
.tf-btn:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
.tf-btn:disabled { opacity: .5; cursor: default; }
.tf-legend { padding: 8px 10px; border-radius: 8px; background: color-mix(in srgb, currentColor 6%, transparent); font-size: 12px; }
.tf-round { border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; }
.tf-live { border-style: dashed; }
.tf-round-head { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.tf-turn-title { font-weight: 600; }
.tf-turn-question { opacity: .75; }
.tf-meta { font-size: 11px; opacity: .6; }
.tf-row { word-break: break-word; }
.tf-think { opacity: .85; }
.tf-error { font-weight: 600; }
.tf-detail { margin: 4px 0 0; padding: 6px 8px; border-radius: 6px; background: color-mix(in srgb, currentColor 6%, transparent); font-size: 12px; white-space: pre-wrap; word-break: break-all; max-height: 240px; overflow: auto; }
.tf-badge { font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); }
.tf-loading, .tf-empty { padding: 28px 16px; text-align: center; opacity: .7; }
`

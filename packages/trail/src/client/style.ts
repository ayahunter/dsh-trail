/** Package-owned stylesheet, inserted at plugin apply and removed on unload. */

export const TRAIL_CSS = `
.tf-root {
  --tf-border: color-mix(in srgb, currentColor 12%, transparent);
  --tf-border-soft: color-mix(in srgb, currentColor 6%, transparent);
  --tf-muted: color-mix(in srgb, currentColor 57%, transparent);
  --tf-surface: color-mix(in srgb, currentColor 1.5%, transparent);
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 18px 30px 36px;
  overflow-y: auto;
  box-sizing: border-box;
  color: inherit;
  font-family: inherit;
  font-size: 16px;
  line-height: 1.45;
}
.tf-root *, .tf-root *::before, .tf-root *::after { box-sizing: border-box; }
.tf-title {
  margin: 0 0 32px;
  font-size: 24px;
  font-weight: 700;
  line-height: 32px;
}
.tf-top {
  display: grid;
  grid-template-columns: minmax(280px, 535px) 1fr auto;
  align-items: center;
  column-gap: 24px;
  margin-bottom: 28px;
}
.tf-search-field {
  position: relative;
  display: flex;
  align-items: center;
  height: 48px;
  min-width: 0;
}
.tf-search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  width: 18px;
  height: 18px;
  color: var(--tf-muted);
  font-size: 0;
  transform: translateY(-50%);
  pointer-events: none;
}
.tf-search-icon::before {
  content: '';
  position: absolute;
  left: 1px;
  top: 1px;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-radius: 50%;
}
.tf-search-icon::after {
  content: '';
  position: absolute;
  right: 1px;
  bottom: 1px;
  width: 7px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  transform: rotate(45deg);
  transform-origin: right center;
}
.tf-search {
  width: 100%;
  height: 48px;
  padding: 0 16px 0 42px;
  border: 1px solid var(--tf-border);
  border-radius: 10px;
  outline: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 18px;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.tf-search::placeholder { color: var(--tf-muted); opacity: 1; }
.tf-search:focus {
  border-color: color-mix(in srgb, #6b82c8 58%, currentColor);
  box-shadow: 0 0 0 3px color-mix(in srgb, #6b82c8 18%, transparent);
}
.tf-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--tf-border);
  border-radius: 9px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 140ms ease, border-color 140ms ease, transform 100ms ease;
}
.tf-btn:hover { background: color-mix(in srgb, currentColor 5%, transparent); }
.tf-btn:active { transform: translateY(1px); }
.tf-btn:focus-visible, .tf-round-head:focus-visible, .tf-filter:focus-visible {
  outline: 2px solid color-mix(in srgb, #6b82c8 72%, transparent);
  outline-offset: 2px;
}
.tf-btn:disabled { opacity: .5; cursor: default; transform: none; }
.tf-legend-toggle {
  grid-column: 3;
  height: 40px;
  padding: 0 12px;
}
.tf-button-chevron, .tf-chevron {
  position: relative;
  display: inline-block;
  flex: none;
  width: 12px;
  height: 12px;
  color: var(--tf-muted);
  transition: transform 140ms ease;
}
.tf-button-chevron::before, .tf-chevron::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 1px;
  width: 7px;
  height: 7px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
}
.tf-button-chevron-open, .tf-chevron-open {
  transform: rotate(180deg);
}
.tf-legend {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  padding: 0;
  margin-bottom: 30px;
}
.tf-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  min-width: max-content;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--tf-muted);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  transition: color 140ms ease, background-color 140ms ease, border-color 140ms ease, transform 100ms ease;
}
.tf-filter:hover {
  color: inherit;
  background: color-mix(in srgb, currentColor 4%, transparent);
}
.tf-filter:active { transform: translateY(1px); }
.tf-filter-active {
  border-color: var(--tf-border);
  background: color-mix(in srgb, currentColor 5%, transparent);
  color: inherit;
  font-weight: 600;
}
.tf-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.tf-round {
  flex: none;
  overflow: hidden;
  border: 1px solid var(--tf-border);
  border-radius: 11px;
  background: var(--tf-surface);
  box-shadow: 0 1px 4px color-mix(in srgb, currentColor 4%, transparent);
}
.tf-round-head {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) 20px;
  align-items: center;
  column-gap: 28px;
  width: 100%;
  height: 56px;
  padding: 0 24px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-size: 18px;
  text-align: left;
}
.tf-round-head:hover { background: color-mix(in srgb, currentColor 2.5%, transparent); }
.tf-round-head-static {
  grid-template-columns: minmax(0, auto) minmax(0, 1fr) auto;
  cursor: default;
}
.tf-round-head-static:hover { background: transparent; }
.tf-round-summary {
  display: flex;
  align-items: baseline;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.tf-turn-title { flex: none; font-weight: 700; }
.tf-turn-question {
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
}
.tf-round-meta {
  min-width: 0;
  overflow: hidden;
  color: var(--tf-muted);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tf-chevron { justify-self: end; }
.tf-round-body {
  padding: 3px 0 8px;
  border-top: 1px solid var(--tf-border-soft);
}
.tf-node-group { display: contents; }
.tf-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  min-height: 46px;
  padding: 5px 36px 5px 24px;
  font-size: 16px;
}
.tf-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  font-size: 16px;
  font-style: normal;
  font-weight: 700;
  line-height: 1;
}
.tf-icon-user { color: #7658dc; background: color-mix(in srgb, #7658dc 8%, transparent); }
.tf-icon-reply { color: #507da8; background: color-mix(in srgb, #507da8 8%, transparent); }
.tf-icon-think { color: #cb6f96; background: color-mix(in srgb, #cb6f96 8%, transparent); }
.tf-icon-tool { color: #5f8fd0; background: color-mix(in srgb, #5f8fd0 9%, transparent); }
.tf-icon-success { color: #5f9f82; background: color-mix(in srgb, #5f9f82 9%, transparent); }
.tf-icon-error { color: #cf3f45; background: color-mix(in srgb, #cf3f45 8%, transparent); }
.tf-icon-system { color: #5e8fc9; background: color-mix(in srgb, #5e8fc9 9%, transparent); border-radius: 50%; font-family: Arial, sans-serif; }
.tf-icon-other { color: #7b8490; background: color-mix(in srgb, #7b8490 9%, transparent); }
.tf-legend .tf-icon {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: transparent;
  font-size: 15px;
}
.tf-icon-tool, .tf-icon-success {
  font-family: "Segoe UI Emoji", "Apple Color Emoji", sans-serif;
  font-weight: 400;
}
.tf-row-main { min-width: 0; }
.tf-row-copy {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tf-row-label { color: var(--tf-muted); }
.tf-row-text { min-width: 0; }
.tf-row-text strong { font-weight: 600; }
.tf-row-reply {
  color: inherit;
  font-size: 18px;
}
.tf-row-reply .tf-row-label {
  color: inherit;
  font-weight: 700;
}
.tf-row-reply .tf-row-text { font-weight: 600; }
.tf-row-user { font-size: 17px; }
.tf-row-think, .tf-row-tool, .tf-row-success, .tf-row-system, .tf-row-other {
  color: color-mix(in srgb, currentColor 76%, transparent);
}
.tf-row-tool .tf-row-text, .tf-row-success .tf-row-text { font-weight: 500; }
.tf-row-expanded { align-items: start; }
.tf-row-expanded .tf-icon, .tf-row-expanded .tf-row-action { margin-top: 2px; }
.tf-row-expanded .tf-row-copy {
  overflow: visible;
  text-overflow: clip;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
.tf-row-action {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 80px;
}
.tf-row-btn {
  min-width: 80px;
  height: 38px;
  padding: 0 14px;
}
.tf-inline-meta { color: inherit; }
.tf-detail {
  max-height: 240px;
  margin: 8px 0 4px;
  padding: 10px 12px;
  overflow: auto;
  border-radius: 8px;
  background: color-mix(in srgb, currentColor 5%, transparent);
  color: inherit;
  font: 13px/1.55 ui-monospace, SFMono-Regular, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
.tf-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 13px;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.tf-status-thinking { color: #b96882; background: color-mix(in srgb, #d97896 15%, transparent); }
.tf-status-running { color: #4f75dc; background: color-mix(in srgb, #5b7de1 15%, transparent); }
.tf-status-replying { color: #5b7dde; background: color-mix(in srgb, #6c87df 13%, transparent); }
.tf-spinner {
  width: 12px;
  height: 12px;
  border: 2px dotted currentColor;
  border-radius: 50%;
  animation: tf-spin 1.15s linear infinite;
}
.tf-more-btn {
  align-self: center;
  width: 210px;
  height: 44px;
  margin: 12px 0 14px;
  color: var(--tf-muted);
}
.tf-loading, .tf-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 152px;
  padding: 24px;
  border: 1px dashed var(--tf-border);
  border-radius: 10px;
  color: var(--tf-muted);
  text-align: center;
}
.tf-loading-error { color: #b45461; }
.tf-empty { flex-direction: column; }
.tf-empty-icon {
  height: 36px;
  margin-bottom: 6px;
  color: color-mix(in srgb, currentColor 40%, transparent);
  font-size: 38px;
  line-height: 1;
}
.tf-empty-title { margin-bottom: 4px; font-size: 18px; font-weight: 500; }
.tf-empty-copy { font-size: 18px; }
@keyframes tf-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .tf-root *, .tf-root *::before, .tf-root *::after { scroll-behavior: auto !important; transition: none !important; }
  .tf-spinner { animation: none; }
}
@media (max-width: 767px) {
  .tf-root { padding: 16px; font-size: 15px; }
  .tf-title { margin-bottom: 20px; font-size: 22px; line-height: 30px; }
  .tf-top { grid-template-columns: 1fr; row-gap: 12px; margin-bottom: 18px; }
  .tf-legend-toggle { grid-column: 1; justify-self: end; }
  .tf-legend {
    justify-content: flex-start;
    flex-wrap: nowrap;
    gap: 8px;
    min-height: 34px;
    margin: 0 -16px 22px;
    padding: 4px 16px 8px;
    overflow-x: auto;
  }
  .tf-round-head {
    grid-template-columns: minmax(0, 1fr) 20px;
    grid-template-rows: auto auto;
    height: auto;
    min-height: 64px;
    padding: 10px 16px;
    column-gap: 12px;
  }
  .tf-round-summary { grid-column: 1; grid-row: 1; }
  .tf-round-meta { grid-column: 1; grid-row: 2; font-size: 13px; }
  .tf-chevron { grid-column: 2; grid-row: 1 / span 2; }
  .tf-round-head-static .tf-status { grid-column: 2; grid-row: 1 / span 2; }
  .tf-row {
    grid-template-columns: 28px minmax(0, 1fr);
    row-gap: 8px;
    padding: 8px 16px;
    font-size: 15px;
  }
  .tf-row-reply { font-size: 16px; }
  .tf-row-user { font-size: 15px; }
  .tf-row-action { grid-column: 2; min-width: 0; justify-content: flex-start; }
  .tf-row-btn { min-width: 72px; height: 34px; }
  .tf-row-copy { white-space: normal; }
  .tf-status { min-height: 34px; padding: 0 11px; }
  .tf-empty-copy { font-size: 16px; }
}
`

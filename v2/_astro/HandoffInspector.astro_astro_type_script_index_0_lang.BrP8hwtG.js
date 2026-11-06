function t(e,n={},...i){const s=document.createElement(e);for(const[a,r]of Object.entries(n))r==null||r===!1||(typeof r=="function"?s.addEventListener(a.replace(/^on/,""),r):a==="class"?s.className=String(r):s.setAttribute(a,r===!0?"":String(r)));for(const a of i)a!=null&&a!==!1&&s.append(a);return s}function V(e){const n=document.createElement("template");return n.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" aria-hidden="true">${G[e]}</svg>`,n.content.firstElementChild}const $=(e,n,i=1)=>`<circle cx="${e}" cy="${n}" r="${i}" fill="currentColor" stroke="none"/>`,G={cursor:'<path d="M8.5 6.5v10.5l2.9-2.8 2 4.2 1.7-.8-2-4.1h4.1Z"/>',plus:'<path d="M12 6.5v11M6.5 12h11"/>',undo:'<path d="M9 7.5 6 10.5l3 3"/><path d="M6 10.5h7.5a3.5 3.5 0 0 1 0 7H11"/>',redo:'<path d="m15 7.5 3 3-3 3"/><path d="M18 10.5h-7.5a3.5 3.5 0 0 0 0 7H13"/>',minus:'<path d="M6.5 12h11"/>',chevron:'<path d="m9 10.5 3 3 3-3"/>',check:'<path d="m7.5 12.5 3 3 6-6.5"/>',close:'<path d="m8 8 8 8M16 8l-8 8"/>',kebab:$(7,12)+$(12,12)+$(17,12),reset:'<path d="M8.5 9.5a5 5 0 1 1-1 4"/><path d="M8.5 6.5v3h3"/>',search:'<circle cx="11" cy="11" r="4.5"/><path d="m14.5 14.5 3 3"/>',eye:'<path d="M5.5 12s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4Z"/><circle cx="12" cy="12" r="1.75"/>',comment:'<path d="M7.5 16.5V9a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 16.5 9v4a1.5 1.5 0 0 1-1.5 1.5h-5l-2.5 2Z"/>',link:'<path d="M10.5 8.5H9a3.5 3.5 0 0 0 0 7h1.5M13.5 8.5H15a3.5 3.5 0 0 1 0 7h-1.5M9.5 12h5"/>',token:'<path d="m12 6 5.2 3v6L12 18l-5.2-3V9Z"/>'+$(12,12,1.25),detach:'<path d="M10.5 8.5H9a3.5 3.5 0 0 0 0 7h1.5M13.5 8.5H15a3.5 3.5 0 0 1 0 7h-1.5"/><path d="M12 6v2M12 16v2"/>',styles:'<circle cx="9" cy="9" r="2"/><circle cx="15" cy="9" r="2"/><circle cx="9" cy="15" r="2"/><circle cx="15" cy="15" r="2"/>',adjust:'<path d="M9.5 6.5v3M9.5 13.5v4M14.5 6.5v4M14.5 14.5v3"/><circle cx="9.5" cy="11.5" r="1.5"/><circle cx="14.5" cy="12.5" r="1.5"/>',contrast:'<circle cx="12" cy="12" r="5.5"/><path d="M12 6.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" stroke="none"/>',sun:'<circle cx="12" cy="12" r="2.5"/><path d="M12 6.5v1.5M12 16v1.5M6.5 12H8M16 12h1.5M8.1 8.1l1 1M14.9 14.9l1 1M8.1 15.9l1-1M14.9 9.1l1-1"/>',moon:'<path d="M16.5 13.5A5 5 0 0 1 10.5 7.5a5 5 0 1 0 6 6Z"/>',isolate:'<path d="M7.5 10V7.5H10M14 7.5h2.5V10M16.5 14v2.5H14M10 16.5H7.5V14"/><rect x="10.5" y="10.5" width="3" height="3" rx=".5"/>',panel:'<rect x="6.5" y="7.5" width="11" height="9" rx="1.5"/><path d="M13.5 7.5v9"/>',compare:'<rect x="6.5" y="8.5" width="4.5" height="7" rx="1"/><rect x="13" y="8.5" width="4.5" height="7" rx="1"/>',size:'<path d="M8.5 8.5h7M12 8.5v8"/>',radius:'<path d="M8.5 16.5v-4a4 4 0 0 1 4-4h4"/>',padY:'<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><path d="M10 10.5h4M10 13.5h4"/>',padX:'<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><path d="M10.5 10v4M13.5 10v4"/>',height:'<path d="M12 7.5v9M10 9.5l2-2 2 2M10 14.5l2 2 2-2"/>',icon:'<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><rect x="10.5" y="10.5" width="3" height="3" rx=".5"/>'};(()=>{const e=document.createElement("canvas");return e.width=e.height=1,e.getContext("2d",{willReadFrequently:!0})})();function J(e,n,i,s){const a=t("button",{type:"button",class:"ib","aria-label":n,title:n},V(e));return a.addEventListener("click",i),a}const Z="design-layer:collapsed",R=()=>{try{return new Set(JSON.parse(localStorage.getItem(Z)??"[]"))}catch{return new Set}};function y(e){const n=R().has(e.id),i=t("button",{type:"button",class:"sec__toggle","aria-expanded":String(!n)},t("span",{class:"sec__caret","aria-hidden":"true"},V("chevron")),e.title),s=t("div",{class:"sec__h"},t("h2",{class:"sec__title"},i),...e.actions??[]),a=t("section",{class:"sec","data-sec":e.id,...e.empty?{"data-empty":!0}:{},...n?{"data-collapsed":!0}:{}},s,t("div",{class:"sec__b g"},...e.body)),r=()=>{const l=!a.hasAttribute("data-collapsed");a.toggleAttribute("data-collapsed",l),i.setAttribute("aria-expanded",String(!l));const f=R();l?f.add(e.id):f.delete(e.id);try{localStorage.setItem(Z,JSON.stringify([...f]))}catch{}};return s.addEventListener("click",l=>{const f=l.target;f!==i&&f.closest('button, input, [role="button"]')||r()}),{el:a,setEmpty(l){a.toggleAttribute("data-empty",l)}}}function Q(e){const n=t("div",{class:"tabs",role:"tablist","aria-label":e.label}),i=e.options.map(s=>{const a=t("span",{class:"n"}),r=t("button",{type:"button",role:"tab","aria-selected":"false"},s.label,a);return r.addEventListener("click",()=>e.onChange(s.value)),n.append(r),{b:r,n:a,v:s.value}});return{el:n,set(s){for(const a of i)a.b.setAttribute("aria-selected",String(a.v===s))},count(s,a){const r=i.find(l=>l.v===s);r&&(r.n.textContent=a?String(a):"")}}}const ee=`
  :host { all: initial; }
  *, *::before, *::after { box-sizing: border-box; }
  [hidden] { display: none !important; }

  /* ── Figma's semantic tokens, light and dark (figma-tokens.json) ── */
  .ui, .ui[data-theme="light"] {
    --bg: #ffffff;
    --field: #f5f5f5;
    --hover: #f5f5f5;
    --pressed: #e6e6e6;
    --line: #e6e6e6;
    --line-strong: #2c2c2c;
    --check-line: #c4c4c4;
    --ink: rgba(0, 0, 0, 0.9);
    --ink-2: rgba(0, 0, 0, 0.5);
    --ink-3: rgba(0, 0, 0, 0.3);
    --brand: #0d99ff;
    --brand-hover: #007be5;
    --on-brand: #ffffff;
    --selected: #e5f4ff;
    --selected-ink: #007be5;
    --focus: #0d99ff;
    --chip: #e6e6e6;
    --danger: #dc3412;
    --shadow: 0px 2px 5px 0px #00000026, 0px 10px 16px 0px #0000001f, 0px 0px .5px 0px #0000001f;
    --menu-bg: #ffffff;
    --menu-ink: rgba(0, 0, 0, 0.9);
    --menu-ink-2: rgba(0, 0, 0, 0.5);
    --menu-ink-3: rgba(0, 0, 0, 0.3);
    --menu-line: #e6e6e6;
    --menu-active: #0d99ff;
    color-scheme: light;
  }
  .ui[data-theme="dark"] {
    --bg: #2c2c2c;
    --field: #383838;
    --hover: #383838;
    --pressed: #444444;
    --line: #444444;
    --line-strong: rgba(255, 255, 255, 0.9);
    --check-line: #757575;
    --ink: #ffffff;
    --ink-2: rgba(255, 255, 255, 0.7);
    --ink-3: rgba(255, 255, 255, 0.4);
    --brand: #0c8ce9;
    --brand-hover: #0a6dc2;
    --selected: #394360;
    --selected-ink: #7cc4f8;
    --focus: #0c8ce9;
    --chip: #444444;
    --danger: #fca397;
    --shadow: 0px 2px 5px 0px #00000059, 0px 10px 16px 0px #00000047, 0px 0px .5px 0px #ffffff40;
    --menu-bg: #1e1e1e;
    --menu-ink: #ffffff;
    --menu-ink-2: rgba(255, 255, 255, 0.7);
    --menu-ink-3: rgba(255, 255, 255, 0.4);
    --menu-line: #383838;
    --menu-active: #0c8ce9;
    color-scheme: dark;
  }
  .ui {
    /* The panel's width: a setting, dragged on the left edge (240 to 480). */
    --w: 280px;
    font: 450 11px/16px 'Design Layer UI', Inter, system-ui, -apple-system, sans-serif;
    letter-spacing: 0.055px;
    color: var(--ink);
    -webkit-font-smoothing: antialiased;
  }
  .ui button, .ui input, .ui textarea { font: inherit; letter-spacing: inherit; color: inherit; margin: 0; }
  .ui button { cursor: default; }
  .ui :focus { outline: none; }
  /* Figma's focus: a 1px accent border drawn inside the control, radius unchanged, no outer ring. */
  .ui :focus-visible { outline: none; box-shadow: inset 0 0 0 1px var(--focus); }
  .ui input:focus, .ui textarea:focus { outline: none; }
  .ui textarea:focus-visible { box-shadow: none; }
  .ui svg { display: block; width: 24px; height: 24px; flex: none; }

  /* ── the grid every row sits on ── */
  .g { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 24px; column-gap: 8px; row-gap: 8px; align-items: center; }
  .g > .span2 { grid-column: 1 / 3; }
  .g > .span3 { grid-column: 1 / -1; }
  .g > .c2 { grid-column: 2; }
  .g > .c3 { grid-column: 3; }

  /* ── panel frame ── */
  .p { position: relative; display: flex; flex-direction: column; width: calc(var(--w) + 2px); height: 100%; background: var(--bg); border: 1px solid var(--line); border-radius: 13px; overflow: hidden;
    box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.2), 0 2px 6px rgba(0, 0, 0, 0.12), 0 12px 32px rgba(0, 0, 0, 0.18), 0 32px 64px -16px rgba(0, 0, 0, 0.16); }
  .p-resize { position: absolute; top: 0; bottom: 0; left: 0; width: 6px; cursor: ew-resize; z-index: 1; }
  .p-top { display: flex; align-items: center; gap: 2px; height: 40px; padding: 8px; border-bottom: 1px solid var(--line); flex: none; }
  .p-top .grow { flex: 1; }
  .p-body { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; scrollbar-width: thin; }

  /* selection header: 48 high, a 13/550 title, icon actions */
  .sel { display: flex; align-items: center; gap: 4px; height: 48px; padding: 0 8px 0 16px; border-bottom: 1px solid var(--line); }
  .sel .grow { flex: 1; }
  .sel .dd { margin-left: -6px; font: 550 13px/22px 'Design Layer UI', Inter, system-ui, sans-serif; letter-spacing: -0.032px; }

  /* ── section: 40 head, rows 4 below it, 32 pitch, 16 below the last ── */
  .sec { border-bottom: 1px solid var(--line); }
  .sec__h { display: flex; align-items: center; gap: 4px; height: 40px; padding: 0 8px 0 16px; }
  .sec__title { flex: 1; margin: 0; font-size: inherit; line-height: inherit; min-width: 0; font-weight: 550; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sec[data-empty] .sec__title { color: var(--ink-2); }
  .sec__b { padding: 4px 8px 16px 16px; }
  .sec[data-empty] .sec__b { display: none; }
  .sec[data-collapsed] .sec__b { display: none; }
  .sec[data-collapsed] .sec__title { color: var(--ink-2); }
  .sec__toggle { display: block; width: 100%; padding: 0; border: 0; background: none; font: inherit; color: inherit; text-align: left; overflow: hidden; text-overflow: ellipsis; }
  /* Figma's section caret: a 12 box in the head's left gutter, pointing right when shut, down when open */
  .sec__toggle { display: flex; align-items: center; }
  .sec__caret { display: grid; place-items: center; flex: none; width: 12px; height: 12px; margin-left: -14px; margin-right: 2px; color: var(--ink-2); transition: rotate 120ms; }
  .sec__caret svg { width: 20px; height: 20px; }
  .sec__toggle[aria-expanded="false"] .sec__caret { rotate: -90deg; }
  .sec__h:hover .sec__caret { color: var(--ink); }
  .sec__toggle:focus-visible { box-shadow: none; text-decoration: underline; text-decoration-color: var(--focus); text-underline-offset: 3px; }

  /* ── icon button: 24, ink at rest ── */
  .ib { position: relative; display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 5px; background: none; color: var(--ink); flex: none; }
  .ib:hover { background: var(--hover); }
  .ib[aria-pressed="true"] { background: var(--selected); color: var(--selected-ink); }
  .ib[aria-expanded="true"] { background: var(--pressed); }
  .ib--dim { color: var(--ink-2); }
  .ib[data-warn]::after { content: ''; position: absolute; top: 4px; right: 4px; width: 4px; height: 4px; border-radius: 50%; background: var(--danger); }

  /* ── tabs: Figma's Design / Prototype pill ── */
  .tabs { display: flex; gap: 0; min-width: 0; overflow: hidden; }
  .tabs button { height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--ink-2); font-weight: 550; white-space: nowrap; }
  .tabs button:hover { color: var(--ink); }
  .tabs button[aria-selected="true"] { background: var(--field); color: var(--ink); }
  .tabs .n { margin-left: 4px; color: var(--ink-3); font-variant-numeric: tabular-nums; }

  /* ghost dropdown: text and a chevron ("20% ⌄") */
  .dd { display: inline-flex; align-items: center; height: 24px; padding: 0 0 0 6px; border: 0; border-radius: 5px; background: none; color: var(--ink); white-space: nowrap; }
  .dd:hover, .dd[aria-expanded="true"] { background: var(--hover); }
  .dd svg { margin-left: -4px; }

  /* buttons */
  .btn { height: 24px; padding: 0 8px; border: 1px solid var(--line-strong); border-radius: 5px; background: none; color: var(--ink); font-weight: 450; white-space: nowrap; }
  .btn:hover:not(:disabled) { background: var(--hover); }
  .btn--primary { border-color: transparent; background: var(--brand); color: var(--on-brand); font-weight: 550; }
  .btn--primary:hover:not(:disabled) { background: var(--brand-hover); }
  .btn:disabled { border-color: transparent; background: var(--field); color: var(--ink-3); }
  .tb { height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--ink); white-space: nowrap; }
  .tb:hover { background: var(--hover); }

  /* ── field: 24, radius 5, filled, no border ── */
  .f { position: relative; display: flex; align-items: center; min-width: 0; height: 24px; border: 1px solid transparent; border-radius: 5px; background: var(--field); color: var(--ink); }
  .f:hover { border-color: var(--line); }
  .f:focus-within { border-color: var(--focus); background: var(--bg); }
  .f--outline { background: var(--bg); border-color: var(--line); }
  .f__pre { display: grid; place-items: center; flex: none; width: 23px; height: 22px; margin-left: -1px; color: var(--ink-2); text-align: center; }
  .f__pre[data-scrub] { cursor: ew-resize; }
  .f__input { flex: 1 0 32px; min-width: 32px; width: 100%; height: 100%; padding: 0; border: 0; background: none; color: inherit; font-variant-numeric: tabular-nums; text-overflow: ellipsis; }
  /* a11y-checked: the input's keyboard focus ring is the field's own 1px focus-blue border (.f:focus-within above), Figma's ring; an inner outline as well would double it */
  .f__input:focus-visible { outline: none; box-shadow: none; }
  .f[data-inherited] .f__input { color: var(--ink-2); }
  .f__suf { flex: 0 1 auto; min-width: 0; padding: 0 7px 0 4px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* apply a variable: a 24 icon over the field's right end on hover */
  .f__tok { position: absolute; top: -1px; right: -1px; display: grid; place-items: center; width: 24px; height: 24px; padding: 0; border: 0; border-radius: 0 5px 5px 0; background: inherit; color: var(--ink-2); opacity: 0; }
  .f:hover .f__tok, .f__tok[aria-expanded="true"], .f__tok:focus-visible { opacity: 1; }
  .f__tok:hover { color: var(--ink); }
  /* bound to a variable: the variable's name in a chip */
  .chip { flex: 1; display: flex; align-items: center; gap: 4px; min-width: 0; height: 16px; margin-right: 4px; padding: 0 4px; border: 0; border-radius: 3px; background: var(--chip); color: var(--ink); text-align: left; }
  .chip__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chip { height: 18px; }
  .chip__glyph { display: grid; place-items: center; flex: none; width: 12px; height: 12px; color: var(--ink-2); }
  .chip__glyph svg { width: 18px; height: 18px; }

  /* colour: a 14 swatch in the prefix slot */
  .sw { display: block; width: 14px; height: 14px; padding: 0; border: 0; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    background: linear-gradient(var(--sw, #000), var(--sw, #000)), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 6px 6px; }
  .f--color > .f__input { flex: 1 0 52px; min-width: 52px; text-transform: uppercase; }
  /* opacity: its own short field after a 1px divider, Figma's "100 %" */
  .f__op { display: flex; align-items: center; flex: none; height: 100%; padding: 0 6px 0 7px; border-left: 1px solid var(--bg); }
  .f__op .f__alpha { flex: none; width: 24px; min-width: 0; text-align: right; }
  .f__pct { color: var(--ink-2); }
  .f:focus-within .f__op { border-left-color: var(--line); }

  /* ── colour picker: 240 wide, a square, two strips, the value row ── */
  .cpop { width: 240px; max-width: 240px; padding: 0; background: var(--bg); }
  .cp { display: grid; gap: 12px; padding: 0 0 12px; }
  .cp__sv { position: relative; height: 200px; background: linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), var(--hue, red); cursor: crosshair; touch-action: none; }
  .cp__strip { position: relative; height: 12px; margin: 0 16px; border-radius: 6px; touch-action: none; }
  .cp__hue { background: linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00); }
  .cp__alpha { background: repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 0 0 / 8px 8px; }
  .cp__fill { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(to right, transparent, var(--solid, #000)); }
  .cp__knob { position: absolute; top: 50%; left: 0; width: 14px; height: 14px; margin: -7px 0 0 -7px; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgba(0, 0, 0, 0.25); pointer-events: none; }
  .cp__sv .cp__knob { margin-top: -7px; }
  .cp__sv:focus-visible, .cp__strip:focus-visible { box-shadow: inset 0 0 0 1px var(--focus); }
  .cp__menu { position: absolute; left: 8px; bottom: 40px; z-index: 1; width: 120px; padding: 8px; border-radius: 13px; background: var(--menu-bg); box-shadow: var(--shadow); }
  .cp__row { position: relative; display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 4px; align-items: center; padding: 0 12px 0 10px; }
  .cp__val { padding-left: 7px; }
  .cp__in { display: grid; flex: 1; min-width: 0; height: 100%; gap: 4px; }
  .cp__in[data-n="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cp__in .f__input { min-width: 0; text-transform: uppercase; }
  .f__name { flex: 1; min-width: 0; height: 22px; padding: 0 4px 0 0; border: 0; background: none; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* select: Figma's bordered dropdown */
  .f--select { width: 100%; padding: 0 0 0 8px; gap: 4px; background: var(--bg); border-color: var(--line); text-align: left; }
  .f--select:hover { border-color: var(--line); }
  .f--select .f__value { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .f--select .f__suf { padding: 0; }
  .f--select > svg { margin-right: -1px; color: var(--ink); }
  .f--select[aria-expanded="true"] { border-color: var(--focus); }

  /* ── checkbox: 16, Figma's grey box ── */
  .cb { display: flex; align-items: center; gap: 8px; height: 24px; padding: 0; border: 0; background: none; color: var(--ink); text-align: left; }
  .cb__box { display: grid; place-items: center; width: 16px; height: 16px; border: 1px solid var(--check-line); border-radius: 3px; background: var(--field); }
  .cb__box svg { width: 16px; height: 16px; opacity: 0; color: var(--on-brand); }
  .cb[aria-checked="true"] .cb__box { border-color: var(--brand); background: var(--brand); }
  .cb[aria-checked="true"] .cb__box svg { opacity: 1; }

  /* ── segmented: a choice group (selected cell white, bordered) ── */
  .seg { display: flex; height: 24px; border-radius: 5px; background: var(--field); }
  .seg button { flex: 1; display: grid; place-items: center; min-width: 0; height: 24px; padding: 0 6px; border: 1px solid transparent; border-radius: 5px; background: none; color: var(--ink-2); white-space: nowrap; }
  .seg button:hover { color: var(--ink); }
  .seg button[aria-pressed="true"] { background: var(--bg); border-color: var(--line); color: var(--ink); }
  /* an icon group: cells divided by 1px of panel */
  .seg--icons { gap: 1px; background: none; }
  .seg--icons button { background: var(--field); border-radius: 0; color: var(--ink); }
  .seg--icons button:first-child { border-radius: 5px 0 0 5px; }
  .seg--icons button:last-child { border-radius: 0 5px 5px 0; }

  /* ── popovers: panel-coloured, radius 13; menus follow the panel theme ── */
  .pop { position: fixed; z-index: 2147483100; min-width: 160px; max-width: 320px; border-radius: 13px; background: var(--bg); box-shadow: var(--shadow); color: var(--ink); overflow: hidden; }
  .pop--menu { padding: 8px; background: var(--menu-bg); color: var(--menu-ink); }
  .menu { max-height: 360px; overflow-y: auto; }
  .mi { display: grid; grid-template-columns: 16px 1fr auto; align-items: center; gap: 8px; width: 100%; height: 24px; padding: 0 8px 0 4px; border: 0; border-radius: 5px; background: none; color: var(--menu-ink); text-align: left; white-space: nowrap; }
  .mi svg { width: 16px; height: 16px; }
  .mi[data-active] { background: var(--menu-active); color: #ffffff; }
  .mi:disabled { color: var(--menu-ink-3); }
  .mi:disabled[data-active] { background: none; color: var(--menu-ink-3); }
  .mi__meta { color: var(--menu-ink-2); font-variant-numeric: tabular-nums; }
  .mi[data-active] .mi__meta { color: #ffffff; }
  .mi__label { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .mh { padding: 4px 8px 4px 28px; color: var(--menu-ink-3); }
  .msep { height: 1px; margin: 8px -8px; background: var(--menu-line); }
  .mi__sw { width: 12px; height: 12px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(128,128,128,.25); justify-self: center; }
  .mi__glyph { color: var(--menu-ink-3); text-align: center; font-size: 9px; }

  /* a popover's own head: a title and a close button, 40 high */
  .pop__h { display: flex; align-items: center; height: 40px; padding: 0 8px 0 16px; border-bottom: 1px solid var(--line); font-weight: 550; }
  .pop__h span { flex: 1; }
  .pop__b { padding: 12px 8px 16px 16px; }

  /* token picker: a dark menu with search */
  .tp { width: 280px; max-width: 280px; padding: 0; }
  .tp__search { display: flex; align-items: center; height: 32px; margin: 4px 4px 0; padding: 0 4px; border: 1px solid transparent; border-radius: 5px; color: var(--menu-ink-3); }
  .tp__search:focus-within { border-color: var(--menu-active); }
  .tp__search input { flex: 1; min-width: 0; height: 100%; border: 0; background: none; color: var(--menu-ink); }
  .ui .tp__search input:focus-visible { box-shadow: none; }
  .tp__search input::placeholder { color: var(--menu-ink-3); }
  .tp .menu { margin-top: 4px; padding: 8px; max-height: 320px; border-top: 1px solid var(--menu-line); }
  .tp__empty { padding: 16px; color: var(--menu-ink-3); }
  .tp__foot { display: flex; align-items: center; height: 36px; padding: 0 8px; border-top: 1px solid var(--menu-line); }
  .tp__foot .cb { color: var(--menu-ink-2, var(--menu-ink)); }

  /* palette picker: whole themes, by group */
  .pp { width: 280px; max-width: 280px; }
  .pp .pop__b { padding: 8px; max-height: 420px; overflow-y: auto; }
  .pp__group { padding: 8px 8px 4px; color: var(--ink-2); }
  .pp__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 4px; }
  .pp__item { display: flex; align-items: center; gap: 8px; height: 24px; padding: 0 8px 0 5px; border: 0; border-radius: 5px; background: none; text-align: left; white-space: nowrap; }
  .pp__item:hover { background: var(--hover); }
  .pp__item[aria-pressed="true"] { background: var(--selected); color: var(--selected-ink); }
  .pp__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .pp__off { flex: none; width: 4px; height: 4px; margin-left: auto; border-radius: 50%; background: var(--danger); }
  .pal-strip { display: flex; flex: none; width: 14px; height: 14px; border-radius: 2px; overflow: hidden; box-shadow: inset 0 0 0 1px rgba(0,0,0,.1); }
  .pal-strip i { flex: 1; }

  /* readouts and a contrast table */
  .note { color: var(--ink-2); }
  .note--fail { color: var(--danger); }
  .grid-table { display: grid; gap: 0 8px; font-variant-numeric: tabular-nums; }
  .grid-table > span { height: 24px; line-height: 24px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grid-table .h { color: var(--ink-2); }
  .grid-table .fail { color: var(--danger); }
`,te="Design Layer UI";function ne(e){if(document.getElementById("design-layer-font"))return;const n=document.createElement("style");n.id="design-layer-font",n.textContent=`@font-face { font-family: '${te}'; src: url('${e}') format('woff2'); font-weight: 100 900; font-style: normal; font-display: swap; }`,document.head.append(n)}const oe={default:320},C=12,j=220,ie=`
  .dock { position: fixed; top: ${C}px; bottom: ${C}px; right: ${C}px; z-index: 2147483000;
    transition: transform ${j}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${j}ms cubic-bezier(0.16, 1, 0.3, 1); }
  .dock[data-side="left"] { right: auto; left: ${C}px; }
  .dock[data-state="closed"] { opacity: 0; transform: translateX(24px) scale(0.985); pointer-events: none; }
  .dock[data-side="left"][data-state="closed"] { transform: translateX(-24px) scale(0.985); }
  .dock[data-side="left"] .p-resize { left: auto; right: 0; }
  @media (prefers-reduced-motion: reduce) { .dock { transition: none; } }
  /* outlines only: nothing fills over the design */
  .box { position: fixed; z-index: 2147482998; pointer-events: none; border: 1px solid #0d99ff; background: none; }
  .box--picked { border-width: 2px; background: rgba(13, 153, 255, 0.12); }
  .box--sel { border-color: #0d99ff; background: none; }
  .box__name, .box__size { position: absolute; height: 16px; padding: 0 4px; border-radius: 2px; background: #0d99ff; color: #fff;
    font: 550 11px/16px 'Design Layer UI', Inter, system-ui, sans-serif; letter-spacing: .055px; white-space: nowrap; }
  .box__name { left: -1px; bottom: calc(100% + 4px); }
  .box__size { left: 50%; top: calc(100% + 4px); transform: translateX(-50%); font-variant-numeric: tabular-nums; }
`,K=e=>e.ctrlKey&&e.altKey&&!e.shiftKey&&!e.metaKey&&e.code==="KeyD";function re(e,n){const i=document.createElement("design-layer-pill"),s=i.attachShadow({mode:"open"});s.innerHTML=`<style>
    button { position: fixed; right: 16px; bottom: 16px; z-index: 2000000000; font: 500 11px/1 'Design Layer UI', Inter, system-ui, sans-serif;
      color: #eeeeee; background: #222222; border: 1px solid #484848; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
    button:hover { background: #2a2a2a; }
    button:focus-visible { outline: 2px solid #0d99ff; outline-offset: 2px; }
    button[hidden] { display: none; }
  </style>`;const a=t("button",{type:"button",title:`${e} (Control+Option+D)`},e);return a.addEventListener("click",n),s.append(a),document.documentElement.append(i),a}const I="/ltinfo-monitoring-dashboard/v2";function ae(){let e=location.pathname;return e.startsWith(I)&&(e=e.slice(I.length)),e=e.replace(/^\/|\/$/g,""),e.replace(/\//g,"-")||"index"}async function W(){const e=new URL(`${I}handoff/${ae()}/manifest.json`,location.href);try{const n=await fetch(e);if(!n.ok)return null;const i=await n.json();if(!Array.isArray(i.sections))return null;const s=new URL(".",e).href;return{manifest:i,local:s,remote:i.baseUrl??s}}catch{return null}}function B(e,n){const i=document.querySelector(e);i&&(i.value=n,i.dispatchEvent(new Event("input",{bubbles:!0})))}function se(e){const n=document.querySelector("[data-omni]");n&&!n.hasAttribute("hidden")&&document.querySelector("[data-omni-close]")?.click();for(const i of e??[])i.click?document.querySelector(i.click)?.click():i.fill?B(i.fill[0],i.fill[1]):i.clear?B(i.clear,""):i.clickText?[...document.querySelector(i.clickText[0])?.querySelectorAll("button")??[]].find(a=>a.textContent?.trim().includes(i.clickText[1]))?.click():i.key&&document.dispatchEvent(new KeyboardEvent("keydown",{key:i.key,bubbles:!0}))}const F=e=>{if(!e.selector)return null;try{return document.querySelector(e.selector)}catch{return null}},le="design-layer-host, design-layer-pill, design-layer-stage",de=`
  .ho-list { display: grid; grid-column: 1 / -1; margin: 0 0 0 -8px; padding: 0; list-style: none; }
  .ho-row { display: block; width: 100%; height: 24px; padding: 0 8px; border: 0; border-radius: 5px; background: none; color: var(--ink); text-align: left;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ho-row:hover { background: var(--hover); }
  .ho-row[aria-pressed="true"] { background: var(--selected); color: var(--selected-ink); }
  .ho-text { grid-column: 1 / -1; margin: 0; overflow-wrap: anywhere; }
  .ho-ul { grid-column: 1 / -1; display: grid; gap: 4px; margin: 0; padding: 0 0 0 16px; }
  .ho-ul li { overflow-wrap: anywhere; }
  .ho-sub { grid-column: 1 / -1; margin: 4px 0 -4px; font-weight: 550; }
  .ho-kv { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; align-items: center; min-height: 24px; }
  .ho-kv > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ho-kv > span + span { color: var(--ink-2); text-align: right; }
  .ho-kv code, .ho-text code { font: 450 11px/16px ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ho-sw { display: inline-block; width: 10px; height: 10px; margin-right: 6px; border-radius: 2px; vertical-align: -1px; box-shadow: inset 0 0 0 1px rgba(128,128,128,.35); }
  .ho-links { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 4px 12px; }
  .ui .ho-links a { color: var(--ink); text-decoration: underline; text-decoration-color: var(--ink-3); text-underline-offset: 3px; }
  .ui .ho-links a:hover { text-decoration-color: var(--ink); }
  .ho-empty { padding: 16px; color: var(--ink-2); }
`;function ce(e){const n=t("div",{class:"p-body",role:"tabpanel",hidden:!0}),i=t("div",{class:"box",hidden:!0}),s=t("span",{class:"box__name"}),a=t("div",{class:"box box--sel",hidden:!0},s),r=t("div",{},i,a);let l=e.preloaded??null,f=!!e.preloaded,w=!1,b=null,x=null,_=!1,m=[];const u=()=>l?.manifest.sections??[],v=(o,c)=>new URL(c,o).href;function H(o,c){const d=(c&&w?F(c):null)?.getBoundingClientRect();if(!d||!d.width||!d.height){o.hidden=!0;return}o.hidden=!1,Object.assign(o.style,{left:`${d.left}px`,top:`${d.top}px`,width:`${d.width}px`,height:`${d.height}px`})}const k=()=>{H(a,b),H(i,x&&x!==b?x:null)};function z(o){let c=null,h=null;for(const d of u()){const g=F(d);g&&g.contains(o)&&(!h||h.contains(g))&&(c=d,h=g)}return c}function O(o,c){if(b=o,c==="list"){if(o.apply?.length){_=!0;try{se(o.apply)}finally{setTimeout(()=>{_=!1},0)}}requestAnimationFrame(()=>{F(o)?.scrollIntoView({block:"nearest",behavior:"instant"}),k()})}s.textContent=o.label;for(const[h,d]of m.entries())d.setAttribute("aria-pressed",String(u()[h]===o));T(),k()}const A=t("div",{});function q(){if(!l){n.replaceChildren(t("div",{class:"ho-empty"},"No handoff bundle for this page."));return}const o=l.manifest;m=o.sections.map(d=>{const g=t("button",{type:"button",class:"ho-row","aria-pressed":String(d===b),title:d.apply?.length?`${d.label}: shows this state on the page`:d.label},d.label);return g.addEventListener("click",()=>O(d,"list")),g});const c=t("a",{href:v(l.local,"README.md"),target:"_blank",rel:"noopener"},"README"),h=y({id:"handoff-sections",title:o.title,body:[t("div",{class:"ho-links"},c),t("ul",{class:"ho-list"},...m.map(d=>t("li",{},d)))]});n.replaceChildren(h.el,A),T()}function T(){const o=b;if(!o||!l){A.replaceChildren();return}const c=l,h=o.guide??{},d=t("button",{type:"button",class:"btn btn--primary"},"Copy for Claude");d.addEventListener("click",async()=>{const p=`Prototype handoff: ${v(c.remote,"README.md")}
Section (${o.label}): ${v(c.remote,o.claudePath)}`;try{await navigator.clipboard.writeText(p),d.textContent="Copied"}catch{d.textContent="Copy Failed"}setTimeout(()=>{d.textContent="Copy for Claude"},1600)});const g=(p,S)=>S?.length?[t("div",{class:"ho-sub"},p),t("ul",{class:"ho-ul"},...S.map(Y=>t("li",{},Y)))]:[],U=[...h.intent?[t("p",{class:"ho-text"},h.intent)]:[],...g("Key Decisions",h.decisions),...g("Gotchas",h.gotchas),...g("Done When",h.acceptance)],M=[y({id:"handoff-guide",title:o.label,actions:[d],body:U.length?U:[t("p",{class:"ho-text"},"No guidance written for this section.")]}).el];o.components?.length&&M.push(y({id:"handoff-components",title:"Components",body:o.components.map(p=>t("div",{class:"ho-kv",title:p.source??""},t("span",{},t("code",{},p.name)),t("span",{},p.target?`→ ${p.target}`:p.origin==="hub"?"Ecology":"Prototype")))}).el);const N=ue(o.data??l.manifest.data);N.length&&M.push(y({id:"handoff-data",title:"Data",body:N}).el),o.tokens?.length&&M.push(y({id:"handoff-tokens",title:"Tokens",body:o.tokens.map(p=>t("div",{class:"ho-kv",title:`${p.name}: ${p.value} (${p.tier})`},t("span",{},t("code",{},p.name)),t("span",{},pe(p.value)?t("i",{class:"ho-sw",style:`background:${p.value}`}):null,p.value)))}).el);const E=(p,S)=>t("a",{href:v(c.local,p),target:"_blank",rel:"noopener"},S),X=[E(o.claudePath,"Spec"),...o.shots?.desktop?[E(o.shots.desktop,"Desktop")]:[],...o.shots?.phone?[E(o.shots.phone,"Phone")]:[],...(o.parts??[]).map(p=>E(p,he(p)))];M.push(y({id:"handoff-files",title:"Files",body:[t("div",{class:"ho-links"},...X)]}).el),A.replaceChildren(...M)}const P=o=>o instanceof Element&&!o.closest(le);document.addEventListener("mousemove",o=>{if(!w||!l)return;const c=P(o.target)?z(o.target):null;c!==x&&(x=c,k())},!0),document.addEventListener("click",o=>{if(!w||_||!P(o.target))return;const c=z(o.target);c&&c!==b&&O(c,"page")},!0);let L=0;const D=()=>{w&&!L&&(L=requestAnimationFrame(()=>{L=0,k()}))};return addEventListener("scroll",D,!0),addEventListener("resize",D),setInterval(D,600),q(),{el:n,overlay:r,setActive(o){w=o,n.hidden=!o,o||(x=null),o&&!f&&(f=!0,W().then(c=>{l=c,q(),k()})),k()}}}const pe=e=>/^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%/]+\)|hsla?\([\d.,\s%/]+\))$/i.test(e.trim());function he(e){const n=e.match(/\.(markup|styles|tokens)(?:-(\d+))?\.md$/);return n?`${n[1][0].toUpperCase()}${n[1].slice(1)}${n[2]?` ${n[2]}`:""}`:e.split("/").pop()}function ue(e){if(!e)return[];const n=typeof e=="string"?{fixture:e}:e,i=r=>r==null?[]:Array.isArray(r)?r:[r],s=[];for(const r of i(n.fixture))s.push(t("div",{class:"ho-kv",title:r},t("span",{},"Fixture"),t("span",{},t("code",{},r))));for(const r of i(n.store))s.push(t("div",{class:"ho-kv",title:r},t("span",{},"Client Store"),t("span",{},t("code",{},r))));for(const r of i(n.notes))s.push(t("p",{class:"ho-text"},r));const a=Array.isArray(n.fields)?n.fields.map(r=>[r,""]):Object.entries(n.fields??{});for(const[r,l]of a)s.push(t("div",{class:"ho-kv",title:l},t("span",{},t("code",{},r)),t("span",{},l)));for(const[r,l]of Object.entries(n.enums??{}))s.push(t("div",{class:"ho-sub"},t("code",{},r)),t("p",{class:"ho-text"},(Array.isArray(l)?l:[l]).join(" · ")));return s}const fe=new URL("/ltinfo-monitoring-dashboard/v2/_astro/inter-variable.qeAHGKee.woff2",import.meta.url).href;async function ge(){if(document.querySelector("design-layer-host"))return;const e=await W();if(!e||document.querySelector("design-layer-host"))return;ne(fe);const n=document.createElement("design-layer-host"),i=n.attachShadow({mode:"open"});i.innerHTML=`<style>${ee}${ie}${de}</style>`;const s=t("div",{class:"ui","data-theme":"dark",style:`--w:${oe.default}px`});i.append(s);const a=ce({preloaded:e}),r=Q({label:"Panel",options:[{value:"handoff",label:"Handoff"}],onChange:()=>{}});r.set("handoff");let l=!1;const f=J("close","Close (⌃⌥D)",()=>m(!1)),w=t("div",{class:"p-top"},r.el,t("span",{class:"grow"}),f),b=t("aside",{class:"p","aria-label":"Handoff"},w,a.el),x=t("div",{class:"dock","data-state":"closed"},b);s.append(x,a.overlay),document.documentElement.append(n);const _=re("Handoff",()=>m(!0));function m(u){l=u,_.hidden=u,a.setActive(u),u?requestAnimationFrame(()=>requestAnimationFrame(()=>{x.dataset.state="open"})):x.dataset.state="closed"}for(const u of["keydown","keyup","keypress"])s.addEventListener(u,v=>{u==="keydown"&&K(v)&&(v.preventDefault(),m(!l)),v.stopPropagation()});document.addEventListener("keydown",u=>{K(u)&&(u.preventDefault(),m(!l))})}function xe(){window.__designLayer||ge()}xe();

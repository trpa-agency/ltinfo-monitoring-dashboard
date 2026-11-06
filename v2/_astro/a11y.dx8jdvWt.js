/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const P=globalThis,R=P.ShadowRoot&&(P.ShadyCSS===void 0||P.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,k=Symbol(),I=new WeakMap;let Y=class{constructor(t,e,n){if(this._$cssResult$=!0,n!==k)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(R&&t===void 0){const n=e!==void 0&&e.length===1;n&&(t=I.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),n&&I.set(e,t))}return t}toString(){return this.cssText}};const D=i=>new Y(typeof i=="string"?i:i+"",void 0,k),Pt=(i,...t)=>{const e=i.length===1?i[0]:t.reduce((n,o,r)=>n+(s=>{if(s._$cssResult$===!0)return s.cssText;if(typeof s=="number")return s;throw Error("Value passed to 'css' function must be a 'css' function result: "+s+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(o)+i[r+1],i[0]);return new Y(e,i,k)},rt=(i,t)=>{if(R)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const e of t){const n=document.createElement("style"),o=P.litNonce;o!==void 0&&n.setAttribute("nonce",o),n.textContent=e.cssText,i.appendChild(n)}},V=R?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(const n of t.cssRules)e+=n.cssText;return D(e)})(i):i;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:st,defineProperty:at,getOwnPropertyDescriptor:pt,getOwnPropertyNames:ht,getOwnPropertySymbols:yt,getPrototypeOf:lt}=Object,O=globalThis,W=O.trustedTypes,gt=W?W.emptyScript:"",ct=O.reactiveElementPolyfillSupport,x=(i,t)=>i,T={toAttribute(i,t){switch(t){case Boolean:i=i?gt:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},tt=(i,t)=>!st(i,t),q={attribute:!0,type:String,converter:T,reflect:!1,useDefault:!1,hasChanged:tt};Symbol.metadata??=Symbol("metadata"),O.litPropertyMetadata??=new WeakMap;let $=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=q){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const n=Symbol(),o=this.getPropertyDescriptor(t,n,e);o!==void 0&&at(this.prototype,t,o)}}static getPropertyDescriptor(t,e,n){const{get:o,set:r}=pt(this.prototype,t)??{get(){return this[e]},set(s){this[e]=s}};return{get:o,set(s){const h=o?.call(this);r?.call(this,s),this.requestUpdate(t,h,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??q}static _$Ei(){if(this.hasOwnProperty(x("elementProperties")))return;const t=lt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(x("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(x("properties"))){const e=this.properties,n=[...ht(e),...yt(e)];for(const o of n)this.createProperty(o,e[o])}const t=this[Symbol.metadata];if(t!==null){const e=litPropertyMetadata.get(t);if(e!==void 0)for(const[n,o]of e)this.elementProperties.set(n,o)}this._$Eh=new Map;for(const[e,n]of this.elementProperties){const o=this._$Eu(e,n);o!==void 0&&this._$Eh.set(o,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const n=new Set(t.flat(1/0).reverse());for(const o of n)e.unshift(V(o))}else t!==void 0&&e.push(V(t));return e}static _$Eu(t,e){const n=e.attribute;return n===!1?void 0:typeof n=="string"?n:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const n of e.keys())this.hasOwnProperty(n)&&(t.set(n,this[n]),delete this[n]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return rt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,n){this._$AK(t,n)}_$ET(t,e){const n=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,n);if(o!==void 0&&n.reflect===!0){const r=(n.converter?.toAttribute!==void 0?n.converter:T).toAttribute(e,n.type);this._$Em=t,r==null?this.removeAttribute(o):this.setAttribute(o,r),this._$Em=null}}_$AK(t,e){const n=this.constructor,o=n._$Eh.get(t);if(o!==void 0&&this._$Em!==o){const r=n.getPropertyOptions(o),s=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:T;this._$Em=o;const h=s.fromAttribute(e,r.type);this[o]=h??this._$Ej?.get(o)??h,this._$Em=null}}requestUpdate(t,e,n,o=!1,r){if(t!==void 0){const s=this.constructor;if(o===!1&&(r=this[t]),n??=s.getPropertyOptions(t),!((n.hasChanged??tt)(r,e)||n.useDefault&&n.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(s._$Eu(t,n))))return;this.C(t,e,n)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:n,reflect:o,wrapped:r},s){n&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,s??e??this[t]),r!==!0||s!==void 0)||(this._$AL.has(t)||(this.hasUpdated||n||(e=void 0),this._$AL.set(t,e)),o===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[o,r]of this._$Ep)this[o]=r;this._$Ep=void 0}const n=this.constructor.elementProperties;if(n.size>0)for(const[o,r]of n){const{wrapped:s}=r,h=this[o];s!==!0||this._$AL.has(o)||h===void 0||this.C(o,void 0,r,h)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(n=>n.hostUpdate?.()),this.update(e)):this._$EM()}catch(n){throw t=!1,this._$EM(),n}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};$.elementStyles=[],$.shadowRootOptions={mode:"open"},$[x("elementProperties")]=new Map,$[x("finalized")]=new Map,ct?.({ReactiveElement:$}),(O.reactiveElementVersions??=[]).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const L=globalThis,Z=i=>i,H=L.trustedTypes,J=H?H.createPolicy("lit-html",{createHTML:i=>i}):void 0,et="$lit$",m=`lit$${Math.random().toFixed(9).slice(2)}$`,nt="?"+m,ft=`<${nt}>`,u=document,A=()=>u.createComment(""),z=i=>i===null||typeof i!="object"&&typeof i!="function",j=Array.isArray,mt=i=>j(i)||typeof i?.[Symbol.iterator]=="function",N=`[ 	
\f\r]`,w=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,K=/-->/g,F=/>/g,d=RegExp(`>|${N}(?:([^\\s"'>=/]+)(${N}*=${N}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),G=/'/g,Q=/"/g,ot=/^(?:script|style|textarea|title)$/i,dt=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),Ht=dt(1),b=Symbol.for("lit-noChange"),l=Symbol.for("lit-nothing"),X=new WeakMap,v=u.createTreeWalker(u,129);function it(i,t){if(!j(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return J!==void 0?J.createHTML(t):t}const vt=(i,t)=>{const e=i.length-1,n=[];let o,r=t===2?"<svg>":t===3?"<math>":"",s=w;for(let h=0;h<e;h++){const a=i[h];let y,g,p=-1,c=0;for(;c<a.length&&(s.lastIndex=c,g=s.exec(a),g!==null);)c=s.lastIndex,s===w?g[1]==="!--"?s=K:g[1]!==void 0?s=F:g[2]!==void 0?(ot.test(g[2])&&(o=RegExp("</"+g[2],"g")),s=d):g[3]!==void 0&&(s=d):s===d?g[0]===">"?(s=o??w,p=-1):g[1]===void 0?p=-2:(p=s.lastIndex-g[2].length,y=g[1],s=g[3]===void 0?d:g[3]==='"'?Q:G):s===Q||s===G?s=d:s===K||s===F?s=w:(s=d,o=void 0);const f=s===d&&i[h+1].startsWith("/>")?" ":"";r+=s===w?a+ft:p>=0?(n.push(y),a.slice(0,p)+et+a.slice(p)+m+f):a+m+(p===-2?h:f)}return[it(i,r+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),n]};class E{constructor({strings:t,_$litType$:e},n){let o;this.parts=[];let r=0,s=0;const h=t.length-1,a=this.parts,[y,g]=vt(t,e);if(this.el=E.createElement(y,n),v.currentNode=this.el.content,e===2||e===3){const p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(o=v.nextNode())!==null&&a.length<h;){if(o.nodeType===1){if(o.hasAttributes())for(const p of o.getAttributeNames())if(p.endsWith(et)){const c=g[s++],f=o.getAttribute(p).split(m),C=/([.?@])?(.*)/.exec(c);a.push({type:1,index:r,name:C[2],strings:f,ctor:C[1]==="."?$t:C[1]==="?"?bt:C[1]==="@"?_t:M}),o.removeAttribute(p)}else p.startsWith(m)&&(a.push({type:6,index:r}),o.removeAttribute(p));if(ot.test(o.tagName)){const p=o.textContent.split(m),c=p.length-1;if(c>0){o.textContent=H?H.emptyScript:"";for(let f=0;f<c;f++)o.append(p[f],A()),v.nextNode(),a.push({type:2,index:++r});o.append(p[c],A())}}}else if(o.nodeType===8)if(o.data===nt)a.push({type:2,index:r});else{let p=-1;for(;(p=o.data.indexOf(m,p+1))!==-1;)a.push({type:7,index:r}),p+=m.length-1}r++}}static createElement(t,e){const n=u.createElement("template");return n.innerHTML=t,n}}function _(i,t,e=i,n){if(t===b)return t;let o=n!==void 0?e._$Co?.[n]:e._$Cl;const r=z(t)?void 0:t._$litDirective$;return o?.constructor!==r&&(o?._$AO?.(!1),r===void 0?o=void 0:(o=new r(i),o._$AT(i,e,n)),n!==void 0?(e._$Co??=[])[n]=o:e._$Cl=o),o!==void 0&&(t=_(i,o._$AS(i,t.values),o,n)),t}class ut{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:n}=this._$AD,o=(t?.creationScope??u).importNode(e,!0);v.currentNode=o;let r=v.nextNode(),s=0,h=0,a=n[0];for(;a!==void 0;){if(s===a.index){let y;a.type===2?y=new S(r,r.nextSibling,this,t):a.type===1?y=new a.ctor(r,a.name,a.strings,this,t):a.type===6&&(y=new wt(r,this,t)),this._$AV.push(y),a=n[++h]}s!==a?.index&&(r=v.nextNode(),s++)}return v.currentNode=u,o}p(t){let e=0;for(const n of this._$AV)n!==void 0&&(n.strings!==void 0?(n._$AI(t,n,e),e+=n.strings.length-2):n._$AI(t[e])),e++}}class S{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,n,o){this.type=2,this._$AH=l,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=n,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=_(this,t,e),z(t)?t===l||t==null||t===""?(this._$AH!==l&&this._$AR(),this._$AH=l):t!==this._$AH&&t!==b&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):mt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==l&&z(this._$AH)?this._$AA.nextSibling.data=t:this.T(u.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:n}=t,o=typeof n=="number"?this._$AC(t):(n.el===void 0&&(n.el=E.createElement(it(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===o)this._$AH.p(e);else{const r=new ut(o,this),s=r.u(this.options);r.p(e),this.T(s),this._$AH=r}}_$AC(t){let e=X.get(t.strings);return e===void 0&&X.set(t.strings,e=new E(t)),e}k(t){j(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let n,o=0;for(const r of t)o===e.length?e.push(n=new S(this.O(A()),this.O(A()),this,this.options)):n=e[o],n._$AI(r),o++;o<e.length&&(this._$AR(n&&n._$AB.nextSibling,o),e.length=o)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const n=Z(t).nextSibling;Z(t).remove(),t=n}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class M{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,n,o,r){this.type=1,this._$AH=l,this._$AN=void 0,this.element=t,this.name=e,this._$AM=o,this.options=r,n.length>2||n[0]!==""||n[1]!==""?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=l}_$AI(t,e=this,n,o){const r=this.strings;let s=!1;if(r===void 0)t=_(this,t,e,0),s=!z(t)||t!==this._$AH&&t!==b,s&&(this._$AH=t);else{const h=t;let a,y;for(t=r[0],a=0;a<r.length-1;a++)y=_(this,h[n+a],e,a),y===b&&(y=this._$AH[a]),s||=!z(y)||y!==this._$AH[a],y===l?t=l:t!==l&&(t+=(y??"")+r[a+1]),this._$AH[a]=y}s&&!o&&this.j(t)}j(t){t===l?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class $t extends M{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===l?void 0:t}}class bt extends M{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==l)}}class _t extends M{constructor(t,e,n,o,r){super(t,e,n,o,r),this.type=5}_$AI(t,e=this){if((t=_(this,t,e,0)??l)===b)return;const n=this._$AH,o=t===l&&n!==l||t.capture!==n.capture||t.once!==n.once||t.passive!==n.passive,r=t!==l&&(n===l||o);o&&this.element.removeEventListener(this.name,this,n),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class wt{constructor(t,e,n){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(t){_(this,t)}}const xt=L.litHtmlPolyfillSupport;xt?.(E,S),(L.litHtmlVersions??=[]).push("3.3.3");const At=(i,t,e)=>{const n=e?.renderBefore??t;let o=n._$litPart$;if(o===void 0){const r=e?.renderBefore??null;n._$litPart$=o=new S(t.insertBefore(A(),r),r,void 0,e??{})}return o._$AI(i),o};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const B=globalThis;class U extends ${constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=At(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return b}}U._$litElement$=!0,U.finalized=!0,B.litElementHydrateSupport?.({LitElement:U});const zt=B.litElementPolyfillSupport;zt?.({LitElement:U});(B.litElementVersions??=[]).push("4.2.2");const Et=`.typography-display {
  font-family: var(--typography-display-font-family);
  font-size: var(--typography-display-font-size);
  font-weight: var(--typography-display-font-weight);
  line-height: var(--typography-display-line-height);
  letter-spacing: var(--typography-display-letter-spacing);
}

.typography-display-sm {
  font-family: var(--typography-display-sm-font-family);
  font-size: var(--typography-display-sm-font-size);
  font-weight: var(--typography-display-sm-font-weight);
  line-height: var(--typography-display-sm-line-height);
  letter-spacing: var(--typography-display-sm-letter-spacing);
}

.typography-heading-lg {
  font-family: var(--typography-heading-lg-font-family);
  font-size: var(--typography-heading-lg-font-size);
  font-weight: var(--typography-heading-lg-font-weight);
  line-height: var(--typography-heading-lg-line-height);
  letter-spacing: var(--typography-heading-lg-letter-spacing);
}

.typography-heading-md {
  font-family: var(--typography-heading-md-font-family);
  font-size: var(--typography-heading-md-font-size);
  font-weight: var(--typography-heading-md-font-weight);
  line-height: var(--typography-heading-md-line-height);
  letter-spacing: var(--typography-heading-md-letter-spacing);
}

.typography-title {
  font-family: var(--typography-title-font-family);
  font-size: var(--typography-title-font-size);
  font-weight: var(--typography-title-font-weight);
  line-height: var(--typography-title-line-height);
  letter-spacing: var(--typography-title-letter-spacing);
}

.typography-body-lg {
  font-family: var(--typography-body-lg-font-family);
  font-size: var(--typography-body-lg-font-size);
  font-weight: var(--typography-body-lg-font-weight);
  line-height: var(--typography-body-lg-line-height);
  letter-spacing: var(--typography-body-lg-letter-spacing);
}

.typography-body-md {
  font-family: var(--typography-body-md-font-family);
  font-size: var(--typography-body-md-font-size);
  font-weight: var(--typography-body-md-font-weight);
  line-height: var(--typography-body-md-line-height);
  letter-spacing: var(--typography-body-md-letter-spacing);
}

.typography-body-sm {
  font-family: var(--typography-body-sm-font-family);
  font-size: var(--typography-body-sm-font-size);
  font-weight: var(--typography-body-sm-font-weight);
  line-height: var(--typography-body-sm-line-height);
  letter-spacing: var(--typography-body-sm-letter-spacing);
}

.typography-body-xs {
  font-family: var(--typography-body-xs-font-family);
  font-size: var(--typography-body-xs-font-size);
  font-weight: var(--typography-body-xs-font-weight);
  line-height: var(--typography-body-xs-line-height);
  letter-spacing: var(--typography-body-xs-letter-spacing);
}

.typography-body-2xs {
  font-family: var(--typography-body-2xs-font-family);
  font-size: var(--typography-body-2xs-font-size);
  font-weight: var(--typography-body-2xs-font-weight);
  line-height: var(--typography-body-2xs-line-height);
  letter-spacing: var(--typography-body-2xs-letter-spacing);
}


.typography-label-2xs {
  font-family: var(--typography-label-2xs-font-family);
  font-size: var(--typography-label-2xs-font-size);
  font-weight: var(--typography-label-2xs-font-weight);
  line-height: var(--typography-label-2xs-line-height);
  letter-spacing: var(--typography-label-2xs-letter-spacing);
}

.typography-label-xs {
  font-family: var(--typography-label-xs-font-family);
  font-size: var(--typography-label-xs-font-size);
  font-weight: var(--typography-label-xs-font-weight);
  line-height: var(--typography-label-xs-line-height);
  letter-spacing: var(--typography-label-xs-letter-spacing);
}

.typography-label-sm {
  font-family: var(--typography-label-sm-font-family);
  font-size: var(--typography-label-sm-font-size);
  font-weight: var(--typography-label-sm-font-weight);
  line-height: var(--typography-label-sm-line-height);
  letter-spacing: var(--typography-label-sm-letter-spacing);
}

.typography-label-md {
  font-family: var(--typography-label-md-font-family);
  font-size: var(--typography-label-md-font-size);
  font-weight: var(--typography-label-md-font-weight);
  line-height: var(--typography-label-md-line-height);
  letter-spacing: var(--typography-label-md-letter-spacing);
}

.typography-label-lg {
  font-family: var(--typography-label-lg-font-family);
  font-size: var(--typography-label-lg-font-size);
  font-weight: var(--typography-label-lg-font-weight);
  line-height: var(--typography-label-lg-line-height);
  letter-spacing: var(--typography-label-lg-letter-spacing);
}

.typography-label-2xs-strong {
  font-family: var(--typography-label-2xs-strong-font-family);
  font-size: var(--typography-label-2xs-strong-font-size);
  font-weight: var(--typography-label-2xs-strong-font-weight);
  line-height: var(--typography-label-2xs-strong-line-height);
  letter-spacing: var(--typography-label-2xs-strong-letter-spacing);
}

.typography-label-xs-strong {
  font-family: var(--typography-label-xs-strong-font-family);
  font-size: var(--typography-label-xs-strong-font-size);
  font-weight: var(--typography-label-xs-strong-font-weight);
  line-height: var(--typography-label-xs-strong-line-height);
  letter-spacing: var(--typography-label-xs-strong-letter-spacing);
}

.typography-label-sm-strong {
  font-family: var(--typography-label-sm-strong-font-family);
  font-size: var(--typography-label-sm-strong-font-size);
  font-weight: var(--typography-label-sm-strong-font-weight);
  line-height: var(--typography-label-sm-strong-line-height);
  letter-spacing: var(--typography-label-sm-strong-letter-spacing);
}

.typography-label-md-strong {
  font-family: var(--typography-label-md-strong-font-family);
  font-size: var(--typography-label-md-strong-font-size);
  font-weight: var(--typography-label-md-strong-font-weight);
  line-height: var(--typography-label-md-strong-line-height);
  letter-spacing: var(--typography-label-md-strong-letter-spacing);
}

.typography-label-lg-strong {
  font-family: var(--typography-label-lg-strong-font-family);
  font-size: var(--typography-label-lg-strong-font-size);
  font-weight: var(--typography-label-lg-strong-font-weight);
  line-height: var(--typography-label-lg-strong-line-height);
  letter-spacing: var(--typography-label-lg-strong-letter-spacing);
}



.typography-microcopy-2xs {
  font-family: var(--typography-microcopy-2xs-font-family);
  font-size: var(--typography-microcopy-2xs-font-size);
  font-weight: var(--typography-microcopy-2xs-font-weight);
  line-height: var(--typography-microcopy-2xs-line-height);
  letter-spacing: var(--typography-microcopy-2xs-letter-spacing);
}

.typography-microcopy-xs {
  font-family: var(--typography-microcopy-xs-font-family);
  font-size: var(--typography-microcopy-xs-font-size);
  font-weight: var(--typography-microcopy-xs-font-weight);
  line-height: var(--typography-microcopy-xs-line-height);
  letter-spacing: var(--typography-microcopy-xs-letter-spacing);
}

.typography-microcopy-sm {
  font-family: var(--typography-microcopy-sm-font-family);
  font-size: var(--typography-microcopy-sm-font-size);
  font-weight: var(--typography-microcopy-sm-font-weight);
  line-height: var(--typography-microcopy-sm-line-height);
  letter-spacing: var(--typography-microcopy-sm-letter-spacing);
}

.typography-microcopy-md {
  font-family: var(--typography-microcopy-md-font-family);
  font-size: var(--typography-microcopy-md-font-size);
  font-weight: var(--typography-microcopy-md-font-weight);
  line-height: var(--typography-microcopy-md-line-height);
  letter-spacing: var(--typography-microcopy-md-letter-spacing);
}

.typography-microcopy-lg {
  font-family: var(--typography-microcopy-lg-font-family);
  font-size: var(--typography-microcopy-lg-font-size);
  font-weight: var(--typography-microcopy-lg-font-weight);
  line-height: var(--typography-microcopy-lg-line-height);
  letter-spacing: var(--typography-microcopy-lg-letter-spacing);
}

.typography-microcopy-2xs-subtle {
  font-family: var(--typography-microcopy-2xs-subtle-font-family);
  font-size: var(--typography-microcopy-2xs-subtle-font-size);
  font-weight: var(--typography-microcopy-2xs-subtle-font-weight);
  line-height: var(--typography-microcopy-2xs-subtle-line-height);
  letter-spacing: var(--typography-microcopy-2xs-subtle-letter-spacing);
}

.typography-microcopy-xs-subtle {
  font-family: var(--typography-microcopy-xs-subtle-font-family);
  font-size: var(--typography-microcopy-xs-subtle-font-size);
  font-weight: var(--typography-microcopy-xs-subtle-font-weight);
  line-height: var(--typography-microcopy-xs-subtle-line-height);
  letter-spacing: var(--typography-microcopy-xs-subtle-letter-spacing);
}

.typography-microcopy-sm-subtle {
  font-family: var(--typography-microcopy-sm-subtle-font-family);
  font-size: var(--typography-microcopy-sm-subtle-font-size);
  font-weight: var(--typography-microcopy-sm-subtle-font-weight);
  line-height: var(--typography-microcopy-sm-subtle-line-height);
  letter-spacing: var(--typography-microcopy-sm-subtle-letter-spacing);
}

.typography-microcopy-md-subtle {
  font-family: var(--typography-microcopy-md-subtle-font-family);
  font-size: var(--typography-microcopy-md-subtle-font-size);
  font-weight: var(--typography-microcopy-md-subtle-font-weight);
  line-height: var(--typography-microcopy-md-subtle-line-height);
  letter-spacing: var(--typography-microcopy-md-subtle-letter-spacing);
}

.typography-microcopy-lg-subtle {
  font-family: var(--typography-microcopy-lg-subtle-font-family);
  font-size: var(--typography-microcopy-lg-subtle-font-size);
  font-weight: var(--typography-microcopy-lg-subtle-font-weight);
  line-height: var(--typography-microcopy-lg-subtle-line-height);
  letter-spacing: var(--typography-microcopy-lg-subtle-letter-spacing);
}

.typography-microcopy-2xs-strong {
  font-family: var(--typography-microcopy-2xs-strong-font-family);
  font-size: var(--typography-microcopy-2xs-strong-font-size);
  font-weight: var(--typography-microcopy-2xs-strong-font-weight);
  line-height: var(--typography-microcopy-2xs-strong-line-height);
  letter-spacing: var(--typography-microcopy-2xs-strong-letter-spacing);
}

.typography-microcopy-xs-strong {
  font-family: var(--typography-microcopy-xs-strong-font-family);
  font-size: var(--typography-microcopy-xs-strong-font-size);
  font-weight: var(--typography-microcopy-xs-strong-font-weight);
  line-height: var(--typography-microcopy-xs-strong-line-height);
  letter-spacing: var(--typography-microcopy-xs-strong-letter-spacing);
}

.typography-microcopy-sm-strong {
  font-family: var(--typography-microcopy-sm-strong-font-family);
  font-size: var(--typography-microcopy-sm-strong-font-size);
  font-weight: var(--typography-microcopy-sm-strong-font-weight);
  line-height: var(--typography-microcopy-sm-strong-line-height);
  letter-spacing: var(--typography-microcopy-sm-strong-letter-spacing);
}

.typography-microcopy-md-strong {
  font-family: var(--typography-microcopy-md-strong-font-family);
  font-size: var(--typography-microcopy-md-strong-font-size);
  font-weight: var(--typography-microcopy-md-strong-font-weight);
  line-height: var(--typography-microcopy-md-strong-line-height);
  letter-spacing: var(--typography-microcopy-md-strong-letter-spacing);
}

.typography-microcopy-lg-strong {
  font-family: var(--typography-microcopy-lg-strong-font-family);
  font-size: var(--typography-microcopy-lg-strong-font-size);
  font-weight: var(--typography-microcopy-lg-strong-font-weight);
  line-height: var(--typography-microcopy-lg-strong-line-height);
  letter-spacing: var(--typography-microcopy-lg-strong-letter-spacing);
}

.typography-microcopy-code-sm {
  font-family: var(--typography-microcopy-code-sm-font-family);
  font-size: var(--typography-microcopy-code-sm-font-size);
  font-weight: var(--typography-microcopy-code-sm-font-weight);
  line-height: var(--typography-microcopy-code-sm-line-height);
  letter-spacing: var(--typography-microcopy-code-sm-letter-spacing);
}

.typography-microcopy-code-md {
  font-family: var(--typography-microcopy-code-md-font-family);
  font-size: var(--typography-microcopy-code-md-font-size);
  font-weight: var(--typography-microcopy-code-md-font-weight);
  line-height: var(--typography-microcopy-code-md-line-height);
  letter-spacing: var(--typography-microcopy-code-md-letter-spacing);
}

.typography-microcopy-code-lg {
  font-family: var(--typography-microcopy-code-lg-font-family);
  font-size: var(--typography-microcopy-code-lg-font-size);
  font-weight: var(--typography-microcopy-code-lg-font-weight);
  line-height: var(--typography-microcopy-code-lg-line-height);
  letter-spacing: var(--typography-microcopy-code-lg-letter-spacing);
}

.typography-title-strong {
  font-family: var(--typography-title-strong-font-family);
  font-size: var(--typography-title-strong-font-size);
  font-weight: var(--typography-title-strong-font-weight);
  line-height: var(--typography-title-strong-line-height);
  letter-spacing: var(--typography-title-strong-letter-spacing);
}

.typography-title-sm-strong {
  font-family: var(--typography-title-sm-strong-font-family);
  font-size: var(--typography-title-sm-strong-font-size);
  font-weight: var(--typography-title-sm-strong-font-weight);
  line-height: var(--typography-title-sm-strong-line-height);
  letter-spacing: var(--typography-title-sm-strong-letter-spacing);
}

.typography-meta {
  font-family: var(--typography-meta-font-family);
  font-size: var(--typography-meta-font-size);
  font-weight: var(--typography-meta-font-weight);
  line-height: var(--typography-meta-line-height);
  letter-spacing: var(--typography-meta-letter-spacing);
}

.typography-eyebrow-sm {
  font-family: var(--typography-eyebrow-sm-font-family);
  font-size: var(--typography-eyebrow-sm-font-size);
  font-weight: var(--typography-eyebrow-sm-font-weight);
  line-height: var(--typography-eyebrow-sm-line-height);
  letter-spacing: var(--typography-eyebrow-sm-letter-spacing);
  text-transform: var(--typography-eyebrow-sm-text-transform);
}

.typography-eyebrow-md {
  font-family: var(--typography-eyebrow-md-font-family);
  font-size: var(--typography-eyebrow-md-font-size);
  font-weight: var(--typography-eyebrow-md-font-weight);
  line-height: var(--typography-eyebrow-md-line-height);
  letter-spacing: var(--typography-eyebrow-md-letter-spacing);
  text-transform: var(--typography-eyebrow-md-text-transform);
}

.typography-code-lg {
  font-family: var(--typography-code-lg-font-family);
  font-size: var(--typography-code-lg-font-size);
  font-weight: var(--typography-code-lg-font-weight);
  line-height: var(--typography-code-lg-line-height);
  letter-spacing: var(--typography-code-lg-letter-spacing);
}

.typography-code-md {
  font-family: var(--typography-code-md-font-family);
  font-size: var(--typography-code-md-font-size);
  font-weight: var(--typography-code-md-font-weight);
  line-height: var(--typography-code-md-line-height);
  letter-spacing: var(--typography-code-md-letter-spacing);
}

.typography-code-sm {
  font-family: var(--typography-code-sm-font-family);
  font-size: var(--typography-code-sm-font-size);
  font-weight: var(--typography-code-sm-font-weight);
  line-height: var(--typography-code-sm-line-height);
  letter-spacing: var(--typography-code-sm-letter-spacing);
}

.typography-code-xs {
  font-family: var(--typography-code-xs-font-family);
  font-size: var(--typography-code-xs-font-size);
  font-weight: var(--typography-code-xs-font-weight);
  line-height: var(--typography-code-xs-line-height);
  letter-spacing: var(--typography-code-xs-letter-spacing);
}

.typography-code-2xs {
  font-family: var(--typography-code-2xs-font-family);
  font-size: var(--typography-code-2xs-font-size);
  font-weight: var(--typography-code-2xs-font-weight);
  line-height: var(--typography-code-2xs-line-height);
  letter-spacing: var(--typography-code-2xs-letter-spacing);
}`,Ot=D(Et),St=`.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
}


.visually-hidden--focusable:focus,
.visually-hidden--focusable:focus-within,
.visually-hidden--focusable:active {
  position: static;
  width: auto;
  height: auto;
  margin: 0;
  overflow: visible;
  white-space: normal;
  clip: auto;
  clip-path: none;
}


@media (forced-colors: active) {
  :focus-visible {
    outline: 2px solid Highlight !important;
    outline-offset: 2px !important;
  }
}`,Mt=D(St);export{l as A,b as E,Mt as a,Ht as b,Pt as c,U as i,Ot as t};

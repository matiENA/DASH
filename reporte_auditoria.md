# Auditoría Global de Rendimiento, Cuotas y Escalabilidad DB — 2026-11-02T13:01:58.039Z

## 1. Estimación de Cuotas y Proyección de Escalabilidad (Supabase & Render)

> Proyección calculada sobre día 27 de 30 del ciclo.

| metrica | actual | limite_free | pct_actual | proy_fin_mes | escala_5x | escala_20x | estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Egress (Uncached) | 0.17 GB | 5 GB | 3.4% | 0.19 GB (3.8%) | 0.94 GB  | 3.78 GB  | 🟢 Holgado |
| Database Size | 30.12 MB | 500 MB | 6.0% | 33.47 MB (6.7%) | 50.20 MB  | 100.40 MB  | 🟢 Holgado |
| Log Ingestion | 0.14 GB | 1 GB | 14.0% | 0.16 GB (15.6%) | 0.78 GB  | 3.11 GB 🚨 BLOQUEO | 🟡 Monitorear |
| Log Query | 2.10 GB | 100 GB | 2.1% | 2.33 GB (2.3%) | 4.67 GB  | 11.67 GB  | 🟢 Holgado |
| Realtime Messages | 0.05 M msgs | 2 M msgs | 2.5% | 0.06 M msgs (2.8%) | 0.28 M msgs  | 1.11 M msgs  | 🟢 Holgado |

## 2. Diagnóstico Relacional de Base de Datos (PostgreSQL / Supabase)

> ❌ No se encontró DATABASE_URL ni SUPABASE_DB_URL (especificá --url o --env)

## 3. Diagnóstico Estático de Código Multi-Proyecto

> Proyectos analizados: dash

### Tablas referenciadas en código

| tabla | menciones |
| --- | --- |
| choferes | 7 |
| novedades | 7 |
| chofer_documentacion | 3 |
| tipos_novedad | 3 |
| terminales | 3 |
| servicios_choferes | 3 |
| dash | 3 |
| chofer_observaciones | 2 |
| unidades | 2 |
| view_dash_novedades | 2 |
| dash_menciones | 2 |
| view_dash_flota | 1 |
| view_dash_retorno | 1 |
| view_dash_usuarios | 1 |
| tractores | 1 |

### SELECT * / .select("*") — 8 ocurrencias

```text
[dash] backend/routes/dash.js:380  supabase.from('chofer_documentacion').select('*').eq('chofer_id', choferId).maybeSingle(),
[dash] backend/routes/dash.js:381  supabase.from('chofer_observaciones').select('*').eq('chofer_id', choferId).order('fecha', { ascending: false 
[dash] backend/utils/googleSheetsSync.js:208  .select('*')
[dash] backend/utils/supabase.js:37  .select('*')
[dash] backend/utils/supabase.js:64  .select('*')
[dash] backend/utils/supabase.js:80  .select('*');
[dash] backend/utils/supabase.js:95  .select('*');
[dash] backend/utils/supabase.js:110  .select('*')
```

### Polling (refetchInterval / setInterval) — 15 ocurrencias

```text
[dash] backend/server.js:207  setInterval(async () => {
[dash] frontend/src/components/layout/Header.tsx:41  const interval = setInterval(actualizarReloj, 1000);
[dash] frontend/src/hooks/useAutoScroll.ts:46  const interval = setInterval(() => {
[dash] frontend/storybook-static/assets/DocsRenderer-JROSPFPF-BJEqwaR6.js:651  `});let $=s.versions&&Object.keys(s.versions).length?s.versions:m.versions;await i.setRef(u,{id:u,url:b.url,..
[dash] frontend/storybook-static/assets/iframe-CYOCVoz_.js:334  `),Object.keys(s).length>0&&c.push(s);let u=i+"By"+e;return{queryName:e,queryMethod:u,queryArgs:c,variant:i,wa
[dash] frontend/storybook-static/sb-addons/chromatic-com-storybook-1/manager-bundle.js:99  `),U4=({createdProjectId:e,setCreatedProjectId:t,onUpdateProject:n})=>{let r=a.useCallback(async i=>{await n(i
[dash] frontend/storybook-static/sb-addons/chromatic-com-storybook-1/manager-bundle.js:364  `),B7=({projectId:e,storyId:t,gitInfo:n,selectedBuildInfo:r})=>{let[{data:i,error:l,operation:o},s]=Dl({query:
[dash] frontend/storybook-static/sb-addons/vitest-2/manager-bundle.js:2  (()=>{function ae(e){if(!e||typeof e!="object")return!1;let t=Object.getPrototypeOf(e);return t===null||t===Ob
[dash] frontend/storybook-static/sb-manager/globals-runtime.js:53902  intervalId = setInterval(checkRealTimersCallback, interval);
[dash] frontend/storybook-static/sb-manager/globals-runtime.js:60971  let startTime = Date.now(), maxDuration = 500, intervalId = setInterval(() => {
[dash] frontend/storybook-static/sb-manager/runtime.js:11321  let intervalId = window.setInterval(() => {
[dash] frontend/storybook-static/sb-manager/runtime.js:17551  this.floaterRefInterval = setInterval(function() {
[dash] frontend/storybook-static/sb-manager/runtime.js:19302  this._intervalId === null && (this._intervalId = setInterval(() => {
[dash] frontend/storybook-static/sb-manager/runtime.js:22050  let childWindow = globalWindow2.open(loginUrl, `storybook_auth_${id}`, "resizable,scrollbars"), timer = setInt
[dash] frontend/storybook-static/sb-manager/runtime.js:22246  ), timer = setInterval(() => {
```

### Polling sin pausa en background (falta refetchIntervalInBackground: false) — 0 ocurrencias

### Llamada directa cliente frontend a Supabase PostgREST — 12 ocurrencias

```text
[dash] backend/routes/dash.js:336  let query = supabase.from('choferes').select('id, nombre, dni, legajo');
[dash] backend/routes/dash.js:516  await supabase.from('choferes').update({ unidad_id: null, estado: 'inactivo', actualizado_el: new Date().toISO
[dash] backend/routes/dash.js:518  await supabase.from('choferes').update({ unidad_id: targetUnidadId, estado: 'circulando', actualizado_el: new 
[dash] backend/utils/googleSheetsSync.js:207  .from('view_dash_novedades')
[dash] backend/utils/googleSheetsSync.js:276  .from('choferes')
[dash] backend/utils/supabase.js:63  .from('view_dash_novedades')
[dash] backend/utils/supabase.js:79  .from('view_dash_flota')
[dash] backend/utils/supabase.js:94  .from('view_dash_retorno')
[dash] backend/utils/supabase.js:143  .from('view_dash_usuarios')
[dash] backend/utils/supabase.js:169  .from('choferes')
[dash] backend/utils/supabase.js:286  .from('choferes')
[dash] backend/utils/supabase.js:441  .from('choferes')
```

### Suscripciones Realtime (postgres_changes / .channel) — 3 ocurrencias

```text
[dash] backend/utils/supabase.js:589  .channel('backend-dash-realtime')
[dash] backend/utils/supabase.js:590  .on('postgres_changes', {
[dash] backend/utils/supabase.js:598  .on('postgres_changes', {
```

### Cache TTL (staleTime / gcTime / cacheTime / TTL) — 0 ocurrencias

### Transacciones explícitas (BEGIN/COMMIT, getClient, db.transaction) — 0 ocurrencias

### Locks de fila (SELECT ... FOR UPDATE / SKIP LOCKED) — 1 ocurrencias

```text
[dash] frontend/storybook-static/sb-manager/runtime.js:4637  return react_default.createElement(Container2, null, react_default.createElement("strong", null, "You are on S
```

### Ráfagas async (Promise.all con map/forEach async) — 3 ocurrencias

```text
[dash] frontend/storybook-static/assets/DocsRenderer-JROSPFPF-BJEqwaR6.js:641  `);return O.push(I),O},[]);return A.forEach((O,C)=>{let P=A[C+1]||x.id;_.length&&C===0?S[O]=sn(S[O]||{},{type:
[dash] frontend/storybook-static/assets/DocsRenderer-JROSPFPF-BJEqwaR6.js:744  ${Yd(.02,e.input.background)} 100%)`,borderRadius:6,boxShadow:`${e.base=="dark"?"hsl(0 0 100 / 0.4)":"hsl(0 0 
[dash] frontend/storybook-static/sb-addons/chromatic-com-storybook-1/manager-bundle.js:2  (()=>{var Ht=(e=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(e,{get:(t,n)=>(typeof require<"u"?requi
```

### RPC / upsert compuestas — 1 ocurrencias

```text
[dash] backend/utils/supabase.js:527  .upsert({
```

### Caché en Hot RAM (backend in-memory datasets) — 0 ocurrencias

### Wipe de tabla en ETL (DELETE FROM sin WHERE o TRUNCATE) — 13 ocurrencias

```text
[dash] frontend/src/components/kanban/NoveltyCard.tsx:262  <h3 className="font-extrabold text-black text-[14px] leading-tight uppercase truncate tracking-tight flex-1 pr
[dash] frontend/src/components/kanban/NoveltyCard.tsx:423  <span className="truncate max-w-[80px] font-black">{novedad.creador || novedad.usuario || 'OPERADOR'}</span>
[dash] frontend/src/components/kanban/NoveltyCard.tsx:532  } text-sm sm:text-base leading-tight uppercase truncate flex-1 pr-2 tracking-tight`}
[dash] frontend/src/components/kanban/QuickAddLibre.tsx:125  <div className="flex flex-col truncate pr-2">
[dash] frontend/src/components/kanban/QuickAddLibre.tsx:126  <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate uppercase">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:149  <span className="flex-1 truncate pr-1">Conductor</span>
[dash] frontend/src/components/kanban/ReturnColumn.tsx:179  <div className="flex flex-col truncate flex-1 min-w-0 pr-1">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:180  <span className="font-black text-xs text-slate-900 dark:text-slate-100 truncate uppercase">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:214  <div className="flex flex-col truncate flex-1 min-w-0 pr-1">
[dash] frontend/src/components/kanban/ReturnColumn.tsx:215  <span className="font-black text-xs text-slate-900 dark:text-slate-100 truncate uppercase">
[dash] frontend/src/components/modals/NoveltyModal.tsx:275  <h2 className="text-sm font-black uppercase tracking-wide text-center truncate mx-2 flex-1">
[dash] frontend/storybook-static/assets/NoveltyCard.stories-Ceb3bdpF.js:1  import{j as t}from"./jsx-runtime-D_zvdyIk.js";import{R as C,r as p}from"./iframe-CYOCVoz_.js";import"./preload
[dash] frontend/storybook-static/assets/ReturnColumn.stories-BIlNT7YK.js:1  import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as f}from"./iframe-CYOCVoz_.js";import"./preload-helper
```

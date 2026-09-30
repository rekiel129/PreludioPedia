(() => {
  const KEY='preludiopedia-local-v1';
  const initial={
    articles:[],
    folders:[],
    comments:[],revisions:[],
    design:{theme:'light',accent:'#496579',wallpaper:'',overlay:.78,customCss:''},
    reading:{size:'normal',font:'sans',line:'comfortable'}
  };
  let state=load(), page='home', articleId='', editorId='', activeFolderId='', articleTab='article', selectedDesign='minimal', range=null, pickedMedia=null, slideIndex=0;
  let pendingWallpaper, audioRecorder=null, audioStream=null, recognition=null, cameraStream=null, cameraRecorder=null, cameraParts=[], cancelCamera=false, toastTimer;
  const view=document.getElementById('view'), modal=document.getElementById('modal'), backdrop=document.getElementById('modal-backdrop'), content=document.getElementById('modal-content'), footer=document.getElementById('modal-footer');
  function id(){return crypto.randomUUID?.()||'p-'+Date.now()+'-'+Math.random().toString(36).slice(2)}
  function load(){
    const migrationKey='preludiopedia-folders-cleared-v1';
    try{
      const s=JSON.parse(localStorage.getItem(KEY));
      if(s&&Array.isArray(s.articles)){
        const base=JSON.parse(JSON.stringify(initial));
        const result={...base,...s,folders:Array.isArray(s.folders)?s.folders:base.folders,comments:s.comments||[],revisions:s.revisions||[],reading:{...base.reading,...s.reading},design:{...base.design,...s.design},articles:s.articles.map(a=>({...a,folderId:a.folderId||'',designId:a.designId||'minimal'}))};
        if(!localStorage.getItem(migrationKey)){
          result.folders=[];
          result.articles=result.articles.map(a=>({...a,folderId:''}));
          try{localStorage.setItem(KEY,JSON.stringify(result));localStorage.setItem(migrationKey,'1')}catch(_){}
        }
        return result
      }
      if(!localStorage.getItem(migrationKey))localStorage.setItem(migrationKey,'1');
    }catch(_){}
    return JSON.parse(JSON.stringify(initial))
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));count();return true}catch(_){toast('Almacenamiento local lleno. Reduce el tamaño de los archivos.');return false}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function linkUrl(v){v=String(v||'').trim();return /^(https?:|mailto:|tel:|#|\/)/i.test(v)&&!/^\/\//.test(v)?v:''}
  function mediaUrl(v){v=String(v||'').trim();return /^https?:\/\//i.test(v)||/^data:(image|video|audio)\/[\w.+-]+;base64,/i.test(v)?v:''}
  function clean(html){
    const d=new DOMParser().parseFromString('<div>'+String(html||'')+'</div>','text/html'),root=d.body.firstElementChild;
    const ok=new Set('P BR H1 H2 H3 UL OL LI STRONG B EM I U S BLOCKQUOTE PRE CODE A IMG VIDEO AUDIO FIGURE FIGCAPTION SPAN DIV HR TABLE THEAD TBODY TR TH TD SUP SUB SOURCE'.split(' '));
    const bad=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','SVG','MATH']);
    [...root.querySelectorAll('*')].forEach(e=>{
      if(!ok.has(e.tagName)){if(bad.has(e.tagName))e.remove();else e.replaceWith(...e.childNodes);return}
      [...e.attributes].forEach(a=>{
        const n=a.name.toLowerCase();
        if(n.startsWith('on')||n==='srcdoc'||n==='contenteditable'){e.removeAttribute(a.name);return}
        if(n==='href'){const u=linkUrl(a.value);u?e.setAttribute('href',u):e.removeAttribute(a.name);return}
        if(n==='src'){const u=mediaUrl(a.value);u?e.setAttribute('src',u):e.removeAttribute(a.name);return}
        if(n==='style'){if(/expression\s*\(|javascript:|url\s*\(|@import/i.test(a.value))e.removeAttribute('style');return}
        if(!['alt','title','width','height','controls','playsinline','target','rel','class','data-latex','colspan','rowspan'].includes(n))e.removeAttribute(a.name)
      });
      if(e.tagName==='A'&&e.getAttribute('target')==='_blank')e.setAttribute('rel','noopener noreferrer');
      if(['VIDEO','AUDIO'].includes(e.tagName))e.setAttribute('controls','');
    });
    return root.innerHTML
  }
  function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2800)}
  function count(){const n=document.getElementById('article-count');if(n)n.textContent=state.articles.length}
  function design(){
    document.documentElement.dataset.theme=state.design.theme;
    const accent=state.design.accent==='#496579'&&state.design.theme==='dark'?'#a3bfce':state.design.accent;
    document.documentElement.style.setProperty('--accent',accent);
    document.documentElement.style.setProperty('--accent-soft',accent+(state.design.theme==='dark'?'33':'18'));
    if(state.design.wallpaper){const alpha=Math.max(0,Math.min(.95,Number(state.design.overlay))),rgb=state.design.theme==='dark'?'12,15,25':'247,248,252';document.body.style.backgroundImage='linear-gradient(rgba('+rgb+','+alpha+'),rgba('+rgb+','+alpha+')),url("'+state.design.wallpaper+'")';document.body.style.backgroundSize='cover';document.body.style.backgroundPosition='center';document.body.style.backgroundAttachment='fixed'}else document.body.style.backgroundImage='';
    let s=document.getElementById('user-design-css');if(!s){s=document.createElement('style');s.id='user-design-css';document.head.appendChild(s)}s.textContent=state.design.customCss||'';
    const b=document.getElementById('theme-toggle');if(b){b.textContent=state.design.theme==='dark'?'☼':'◐';b.title=state.design.theme==='dark'?'Cambiar a tema claro':'Cambiar a tema oscuro'}
    document.title='PreludioPedia · La Wiki de todos los preludianos';
    document.documentElement.style.setProperty('--article-size',({'small':'14px','normal':'16px','large':'19px','xlarge':'22px'})[state.reading.size]||'16px');
    document.documentElement.style.setProperty('--article-font',state.reading.font==='serif'?'Georgia,serif':state.reading.font==='mono'?'ui-monospace,monospace':'"DM Sans",sans-serif');
    document.documentElement.style.setProperty('--article-leading',state.reading.line==='relaxed'?'2':'1.75');
  }
  function countText(){return state.articles.length+' '+(state.articles.length===1?'artículo':'artículos')}
  const designDefs=[
    {id:'minimal',name:'Minimal',desc:'Muy simple, limpio y con mucho espacio.'},
    {id:'paper',name:'Papel editorial',desc:'Tonos cálidos y lectura tranquila.'},
    {id:'ocean',name:'Azul sereno',desc:'Azules suaves y acentos elegantes.'},
    {id:'color-pop',name:'Color vivo',desc:'Bloques alegres para destacar títulos.'},
    {id:'cards',name:'Tarjetas',desc:'Secciones enmarcadas y fáciles de recorrer.'},
    {id:'notebook',name:'Cuaderno',desc:'Fondo de líneas y estilo de apuntes.'},
    {id:'midnight',name:'Noche',desc:'Fondo oscuro con texto de alto contraste.'},
    {id:'sunrise',name:'Vibrante',desc:'Colores cálidos con detalles llamativos.'}
  ];
  function folderName(idValue){return state.folders.find(f=>f.id===idValue)?.name||'Sin carpeta'}
  function folderNav(){const host=document.getElementById('folder-nav');if(!host)return;host.innerHTML=state.folders.map(f=>`<button class="nav-item folder-nav-item ${page==='folder'&&activeFolderId===f.id?'active':''}" data-open-folder="${esc(f.id)}"><span class="nav-icon">▰</span>${esc(f.name)}</button>`).join('')}
  function home(){
    const folderCards=state.folders.length?state.folders.map(f=>{const n=state.articles.filter(a=>a.folderId===f.id).length;return `<button class="folder-card" data-open-folder="${esc(f.id)}"><span class="folder-icon">▰</span><span class="folder-card-copy"><strong>${esc(f.name)}</strong><small>${esc(f.description||'Carpeta de la wiki')}</small></span><span class="folder-count">${n}</span></button>`}).join(''):`<div class="empty-state"><h3>Aún no hay carpetas</h3><p>Crea una carpeta para organizar los temas de la comunidad.</p><button class="primary-button" data-action="create-folder">Crear carpeta</button></div>`;
    const list=state.articles.length?'<div class="article-grid">'+state.articles.slice(0,6).map(a=>`<button class="article-tile" data-open="${esc(a.id)}"><span class="tile-folder">${esc(folderName(a.folderId))}</span><h3>${esc(a.title)}</h3><small>Abrir →</small></button>`).join('')+'</div>':`<div class="empty-state compact-empty"><h3>La enciclopedia empieza con la comunidad</h3><p>Crea el primer artículo, elige uno de los ocho diseños y escribe desde una página vacía.</p><button class="primary-button" data-action="create">＋ Crear artículo</button></div>`;
    return `<div class="page-wrap"><div class="breadcrumb"><span>PreludioPedia</span><span>/</span><span>Inicio</span></div>
      <section class="hero"><div class="hero-copy"><div class="eyebrow">PreludioPedia</div><h1>PreludioPedia</h1><p>La Wiki de todos los preludianos. Conocimiento escolar que crece y permanece entre generaciones.</p><div class="hero-actions"><button class="primary-button" data-action="create">＋ Crear artículo</button><button class="text-button" data-action="create-folder">＋ Crear carpeta</button></div></div><div class="hero-art"><div class="school-seal">P</div></div></section>
      <div class="section-heading home-section"><div><h2>Explora por carpetas</h2><div class="subheading">Entra a un nicho o crea uno nuevo</div></div><button class="link-button" data-action="create-folder">＋ Nueva carpeta</button></div><div class="folder-grid">${folderCards}</div>
      <div class="section-heading home-section"><div><h2>Artículos recientes</h2><div class="subheading">${countText()} en la wiki</div></div><button class="link-button" data-page="articles">Ver todos →</button></div>${list}</div>`
  }
  function articleResults(q='',folderId=null){
    q=q.toLowerCase();
    const rows=state.articles.filter(a=>a.title.toLowerCase().includes(q)&&(folderId===null||a.folderId===folderId));
    return rows.length?'<div class="article-grid">'+rows.map(a=>`<button class="article-tile" data-open="${esc(a.id)}"><h3>${esc(a.title)}</h3><small>${new Date(a.updated).toLocaleDateString('es-CO')} · Abrir →</small></button>`).join('')+'</div>':`<div class="empty-state"><div class="empty-icon">＋</div><h3>${q?'No encontramos páginas':'Aún no hay artículos'}</h3><p>${q?'Prueba con otro título.':'Crea la primera página para empezar.'}</p><button class="primary-button" data-action="create">Crear artículo</button></div>`
  }
  function articles(q=''){
      return `<div class="page-wrap"><div class="breadcrumb"><button class="link-button" data-page="home">PreludioPedia</button><span>/</span><span>Artículos</span></div><div class="page-title-row"><div><div class="eyebrow">PreludioPedia</div><h1>Artículos</h1><p>${countText()}. El diseño de cada página es libre.</p></div><button class="primary-button" data-action="create">＋ Crear artículo</button></div><div class="article-list-top"><input class="filter-input" id="article-filter" placeholder="Filtrar artículos" value="${esc(q)}"></div><div id="article-results">${articleResults(q)}</div></div>`
  }
  function indexedBody(raw){const root=document.createElement('div');root.innerHTML=clean(raw);const headings=[...root.querySelectorAll('h1,h2,h3')].map((h,i)=>{const idValue='indice-'+i;h.id=idValue;return {id:idValue,text:h.textContent.trim(),level:Number(h.tagName.slice(1))}});return {html:root.innerHTML,headings}}
  function folderPage(folderId,q=''){
    const f=state.folders.find(x=>x.id===folderId);if(!f)return home();
    return `<div class="page-wrap"><div class="breadcrumb"><button class="link-button" data-page="home">PreludioPedia</button><span>/</span><span>${esc(f.name)}</span></div><div class="page-title-row"><div><div class="eyebrow">CARPETA</div><h1>${esc(f.name)}</h1><p>${esc(f.description||'Temas reunidos en esta carpeta.')}</p></div><div class="article-actions"><button class="outline-button" data-action="edit-folder" data-id="${esc(f.id)}">Editar carpeta</button><button class="primary-button" data-action="create" data-folder="${esc(f.id)}">＋ Crear artículo</button></div></div><div class="article-list-top"><input class="filter-input" id="folder-filter" placeholder="Filtrar en esta carpeta"></div><div id="folder-results">${articleResults(q,folderId)}</div></div>`
  }
  function discussion(a){
    const comments=state.comments.filter(c=>c.articleId===a.id);
    return `<section class="discussion-panel"><div class="discussion-heading"><div><div class="eyebrow">CONVERSACIÓN</div><h2>Discusión del artículo</h2><p>Comentarios y preguntas para mejorar esta página entre todos.</p></div><span class="comment-total">${comments.length} comentarios</span></div><div class="comment-form"><label class="form-label" for="comment-author">Tu nombre</label><input class="form-input" id="comment-author" placeholder="Preludiano/a"><label class="form-label" for="comment-body">Comentario</label><textarea class="form-textarea" id="comment-body" placeholder="Escribe una pregunta, sugerencia o aporte..."></textarea><button class="primary-button" data-action="save-comment" data-id="${esc(a.id)}">Publicar comentario</button></div>${comments.length?comments.map(c=>`<article class="comment-card"><div class="comment-byline"><strong>${esc(c.author||'Preludiano/a')}</strong><time>${new Date(c.date).toLocaleString('es-CO')}</time></div><p>${esc(c.body)}</p></article>`).join(''):`<div class="article-preview-empty">Todavía no hay comentarios en esta discusión.</div>`}</section>`
  }
  function historyPanel(a){const rows=state.revisions.filter(r=>r.articleId===a.id);return `<section class="discussion-panel"><div class="discussion-heading"><div><div class="eyebrow">HISTORIAL</div><h2>Versiones del artículo</h2><p>Las versiones anteriores quedan guardadas al editar.</p></div></div>${rows.length?rows.map((r,i)=>`<article class="revision-row"><div><strong>Versión ${rows.length-i}</strong><small>${new Date(r.date).toLocaleString('es-CO')}</small></div><button class="outline-button" data-action="restore-revision" data-id="${esc(r.id)}">Restaurar</button></article>`).join(''):`<div class="article-preview-empty">Aún no hay versiones anteriores.</div>`}</section>`}
  function articleView(a){
    const content=indexedBody(a.body),probe=document.createElement('div');probe.innerHTML=content.html;const empty=!probe.textContent.trim()&&!probe.querySelector('img,video,audio');
    const designId=designDefs.some(d=>d.id===a.designId)?a.designId:'minimal';
    const current=articleTab==='discussion'?discussion(a):articleTab==='history'?historyPanel(a):`<div class="article-layout"><article class="wiki-card article-design article-design-${designId}"><div class="wiki-content" id="article-content">${empty?'<div class="article-empty"><p>Este artículo está en blanco.</p><button class="primary-button" data-action="edit" data-id="'+esc(a.id)+'">Empezar a escribir</button></div>':content.html}</div></article><aside class="article-index"><strong>Índice</strong>${content.headings.length?`<ol>${content.headings.map(h=>`<li class="level-${h.level}"><a href="#${h.id}">${esc(h.text)}</a></li>`).join('')}</ol>`:`<p>Añade encabezados desde el editor para generar un índice automático.</p>`}</aside></div>`;
    const categoryCrumb=a.folderId?`<button class="link-button" data-open-folder="${esc(a.folderId)}">${esc(folderName(a.folderId))}</button>`:`<button class="link-button" data-page="articles">Sin carpeta</button>`;
    return `<div class="page-wrap"><div class="breadcrumb"><button class="link-button" data-page="home">PreludioPedia</button><span>/</span>${categoryCrumb}<span>/</span><span>${esc(a.title)}</span></div><header class="article-header"><div><div class="eyebrow">${esc(folderName(a.folderId))}</div><h1>${esc(a.title)}</h1><div class="article-meta">Actualizado ${new Date(a.updated).toLocaleString('es-CO')}</div></div><div class="article-actions"><button class="outline-button" data-action="present" data-id="${esc(a.id)}">▷ Presentar</button><button class="primary-button" data-action="edit" data-id="${esc(a.id)}">✎ Editar</button></div></header><nav class="article-tabs" aria-label="Pestañas del artículo"><button class="article-tab ${articleTab==='article'?'active':''}" data-action="article-tab" data-tab="article">Artículo</button><button class="article-tab ${articleTab==='discussion'?'active':''}" data-action="article-tab" data-tab="discussion">Discusión <span>${state.comments.filter(c=>c.articleId===a.id).length}</span></button><button class="article-tab ${articleTab==='history'?'active':''}" data-action="article-tab" data-tab="history">Historial</button></nav>${current}</div>`
  }
  function slides(a){
    const root=document.createElement('div');root.innerHTML=clean(a.body);
    const out=[{title:a.title,html:''}];let section={title:'',html:''},sawHeading=false;
    [...root.childNodes].forEach(n=>{if(n.nodeType===1&&/^H[1-3]$/.test(n.tagName)){sawHeading=true;if(section.html.trim())out.push(section);section={title:n.textContent.trim()||'Sección',html:''}}else section.html+=n.nodeType===1?n.outerHTML:esc(n.textContent)});
    if(section.html.trim())out.push(section.title?section:{title:sawHeading?'Contenido':'',html:section.html});
    return out
  }
  function presentation(){
    const a=state.articles.find(x=>x.id===articleId);if(!a)return home();
    const pages=slides(a);slideIndex=Math.max(0,Math.min(slideIndex,pages.length-1));const s=pages[slideIndex];
    const body=s.html?`<div class="wiki-content">${s.html}</div>`:'';
    const designId=designDefs.some(d=>d.id===a.designId)?a.designId:'minimal';
    return `<div class="presentation-view" id="presentation-view"><div class="present-top"><span>${esc(a.title)}</span><button class="present-exit" data-action="exit-present">Salir · Esc</button></div><main class="present-stage article-design article-design-${designId}"><h1>${esc(s.title||a.title)}</h1>${body}</main><footer class="present-bottom"><button class="outline-button" data-action="prev" ${slideIndex===0?'disabled':''}>← Anterior</button><span>${slideIndex+1} / ${pages.length}</span><div class="present-progress"><i style="width:${(slideIndex+1)/pages.length*100}%"></i></div><button class="primary-button" data-action="next" ${slideIndex===pages.length-1?'disabled':''}>Siguiente →</button><button class="present-exit" data-action="present-fullscreen">⛶</button></footer></div>`
  }
  function render(){
    design();count();folderNav();
    document.querySelectorAll('.nav-item[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page||(page==='article'&&b.dataset.page==='articles')));
    if(page==='present'){view.innerHTML=presentation();typeset(document.getElementById('presentation-view'));return}
    if(page==='articles')view.innerHTML=articles();
    else if(page==='folder')view.innerHTML=folderPage(activeFolderId);
    else if(page==='article'){const a=state.articles.find(x=>x.id===articleId);view.innerHTML=a?articleView(a):home();typeset(document.getElementById('article-content'))}
    else view.innerHTML=home()
  }
  function typeset(el){if(el&&window.MathJax?.typesetPromise)window.MathJax.typesetPromise([el]).catch(()=>{})}
  function showModal(title,html,buttons='',compact=false,extra=''){
    document.getElementById('modal-title').textContent=title;document.getElementById('modal-eyebrow').textContent='PreludioPedia';content.innerHTML=html;footer.innerHTML=buttons;modal.className='modal'+(compact?' compact':'')+(extra?' '+extra:'');backdrop.hidden=false;
    const first=content.querySelector('input:not([type=file]),textarea,select');if(first)setTimeout(()=>first.focus(),25)
  }
  function hideModal(){hideAux();stopCamera(true);if(audioRecorder?.state==='recording')audioRecorder.stop();recognition?.stop?.();recognition=null;backdrop.hidden=true;modal.className='modal'}
  function showAux(title,html,buttons){
    const host=document.getElementById('editor-aux');if(!host)return;
    document.getElementById('aux-title').textContent=title;document.getElementById('aux-content').innerHTML=html;document.getElementById('aux-footer').innerHTML=buttons;host.hidden=false;
    host.querySelector('input,textarea,select')?.focus()
  }
  function hideAux(){const a=document.getElementById('editor-aux');if(a)a.hidden=true}
  function createDialog(folderId=''){
    selectedDesign='minimal';
    const options='<option value="">Sin carpeta</option>'+state.folders.map(f=>`<option value="${esc(f.id)}" ${f.id===folderId?'selected':''}>${esc(f.name)}</option>`).join('');
    const cards=designDefs.map(d=>`<button class="template-card design-option design-option-${d.id} ${d.id==='minimal'?'selected':''}" data-template="${d.id}"><span class="design-preview preview-${d.id}" aria-hidden="true"><i></i><b></b><em></em></span><strong>${esc(d.name)}</strong><small>${esc(d.desc)}</small></button>`).join('');
    showModal('Crear artículo','<p class="help-text">Elige una apariencia visual. El artículo empezará vacío y podrás escribirlo y personalizarlo como quieras.</p><label class="form-label" for="new-title">Título</label><input class="form-input" id="new-title" maxlength="120" placeholder="Título del artículo"><label class="form-label" for="new-folder">Carpeta</label><select class="form-select" id="new-folder">'+options+'</select><label class="form-label">Diseño base · 8 estilos</label><div class="template-grid">'+cards+'</div>','<button class="outline-button" data-action="close">Cancelar</button><button class="primary-button" data-action="create-confirm">Crear y escribir →</button>')
  }
  function create(){
    const title=document.getElementById('new-title')?.value.trim();if(!title){toast('Escribe el título del artículo.');return}
    if(state.articles.some(a=>a.title.toLowerCase()===title.toLowerCase())){toast('Ya existe un artículo con ese título.');return}
    const a={id:id(),title,body:'',designId:selectedDesign,folderId:document.getElementById('new-folder')?.value||'',created:new Date().toISOString(),updated:new Date().toISOString()};state.articles.unshift(a);save();hideModal();edit(a.id)
  }
  function folderDialog(folder=null){
    const editing=!!folder;
    showModal(editing?'Editar carpeta':'Crear carpeta','<p class="help-text">Organiza artículos por temas, proyectos o comunidades del colegio.</p><label class="form-label">Nombre de la carpeta</label><input class="form-input" id="folder-name" maxlength="70" value="'+esc(folder?.name||'')+'" placeholder="Ej. Club de ciencias"><label class="form-label">Descripción</label><textarea class="form-textarea" id="folder-description" placeholder="Qué tipo de contenido reúne esta carpeta">'+esc(folder?.description||'')+'</textarea>', '<button class="outline-button" data-action="close">Cancelar</button><button class="primary-button" data-action="save-folder" data-id="'+(folder?.id||'')+'">Guardar carpeta</button>',true)
  }
  function saveFolder(folderIdValue=''){
    const name=document.getElementById('folder-name')?.value.trim();if(!name){toast('Escribe un nombre para la carpeta.');return}
    const description=document.getElementById('folder-description')?.value.trim()||'';
    const existing=state.folders.find(f=>f.id===folderIdValue);
    if(state.folders.some(f=>f.id!==folderIdValue&&f.name.toLowerCase()===name.toLowerCase())){toast('Ya existe una carpeta con ese nombre.');return}
    if(existing){existing.name=name;existing.description=description}else state.folders.push({id:id(),name,description});
    save();hideModal();render();toast(existing?'Carpeta actualizada.':'Carpeta creada.')
  }
  function edit(idValue){
    const a=state.articles.find(x=>x.id===idValue);if(!a)return;editorId=a.id;range=null;pickedMedia=null;
    const designId=designDefs.some(d=>d.id===a.designId)?a.designId:'minimal';
    const body=clean(a.body);
    const html=`<div class="editor-title-row"><input class="form-input" id="editor-title" value="${esc(a.title)}" aria-label="Título del artículo"></div>
      <div class="editor-toolbar" role="toolbar" aria-label="Herramientas de escritura">
      <button class="toolbar-button" data-command="undo" title="Deshacer">↶</button><button class="toolbar-button" data-command="redo" title="Rehacer">↷</button><span class="toolbar-divider"></span>
      <button class="toolbar-button" data-command="bold" title="Negrita"><b>B</b></button><button class="toolbar-button" data-command="italic" title="Cursiva"><i>I</i></button>
      <select class="toolbar-select" id="block-format" aria-label="Formato"><option value="P">Párrafo</option><option value="H1">Título</option><option value="H2">Encabezado</option><option value="H3">Subtítulo</option><option value="BLOCKQUOTE">Cita</option></select><span class="toolbar-divider"></span>
      <button class="toolbar-button" data-action="image" title="Insertar imagen">▧</button><button class="toolbar-button" data-action="video" title="Insertar video">▷</button><button class="toolbar-button" data-action="voice" title="Dictar o grabar audio">🎙</button><button class="toolbar-button" data-action="camera" title="Grabar con cámara">◉</button>
      <button class="toolbar-button" data-action="link" title="Insertar enlace">↗</button><button class="toolbar-button" data-action="unlink" title="Quitar enlace">⛓</button><button class="toolbar-button latex-button" data-action="latex" title="Escribir fórmula en LaTeX">∑ LaTeX</button>
      <div class="more-wrap"><button class="toolbar-button" data-action="more" title="Más opciones">···</button><div class="more-menu" id="more-menu" hidden>
      <button data-command="underline">Subrayado</button><button data-command="strikeThrough">Tachado</button><button data-command="insertUnorderedList">• Lista</button><button data-command="insertOrderedList">1. Lista numerada</button>
      <button data-action="align-left">Alinear izquierda</button><button data-action="align-center">Centrar</button><button data-action="align-right">Alinear derecha</button><button data-action="resize-media">Ajustar tamaño de imagen/video</button><button data-action="image-layout">Posición y marco de imagen</button>
      <button data-action="video-url">Insertar video por enlace</button><button data-action="record-audio">Grabar nota de audio</button><button data-command="removeFormat">Quitar formato</button>
      <label>Color del texto <input type="color" id="text-color" value="#20253a"></label><label>Resaltado <input type="color" id="highlight-color" value="#fff1a8"></label></div></div>
      <button class="toolbar-button" data-action="fullscreen-editor" title="Pantalla completa">⛶</button></div>
      <div class="editor-wrap"><div class="editor-canvas article-design article-design-${designId}" id="editor-canvas" contenteditable="true" spellcheck="true" data-placeholder="Empieza a escribir. No hay secciones obligatorias.">${body}</div></div>
      <div class="editor-status"><span id="word-count">0 palabras</span><span>Los cambios se guardan al pulsar «Guardar artículo»</span></div>
      <div class="editor-submodal" id="editor-aux" hidden><div class="submodal-card"><h3 id="aux-title"></h3><div id="aux-content"></div><div class="submodal-actions" id="aux-footer"></div></div></div>
      <div class="capture-panel" id="capture-panel" hidden><div class="capture-card"><h3>Grabar con la cámara</h3><video id="camera-preview" autoplay muted playsinline></video><p class="help-text" id="capture-status">Permite el acceso a la cámara y al micrófono.</p><div class="capture-actions"><button class="outline-button" data-action="close-camera">Cancelar</button><button class="primary-button" data-action="start-camera">● Grabar</button><button class="primary-button" data-action="stop-camera" hidden>Detener y añadir</button></div></div></div>`;
    showModal('Editor de artículo',html,'<button class="outline-button" data-action="close">Cerrar</button><button class="primary-button" data-action="save-article">Guardar artículo</button>',false,'editor-modal');
    const ed=editor();ed.addEventListener('keyup',saveRange);ed.addEventListener('mouseup',saveRange);ed.addEventListener('input',wordCount);wordCount()
  }
  function editor(){return document.getElementById('editor-canvas')}
  function saveRange(){const e=editor(),s=getSelection();if(e&&s?.rangeCount&&e.contains(s.anchorNode))range=s.getRangeAt(0).cloneRange()}
  function focusEditor(){const e=editor();if(!e)return null;e.focus();if(range&&e.contains(range.commonAncestorContainer)){const s=getSelection();s.removeAllRanges();s.addRange(range)}return e}
  function insert(html){const e=focusEditor();if(!e)return;document.execCommand('insertHTML',false,html);saveRange();wordCount()}
  function insertText(text){if(!focusEditor())return;document.execCommand('insertText',false,text);saveRange();wordCount()}
  function wordCount(){const e=editor(),w=document.getElementById('word-count');if(e&&w){const n=e.innerText.trim().split(/\s+/).filter(Boolean).length;w.textContent=n+' '+(n===1?'palabra':'palabras')}}
  function command(cmd){focusEditor();if(cmd==='formatBlock')document.execCommand(cmd,false,document.getElementById('block-format')?.value||'P');else document.execCommand(cmd,false,null);saveRange();wordCount()}
  function fileData(file,done){const r=new FileReader();r.onload=()=>done(String(r.result));r.onerror=()=>toast('No se pudo leer el archivo.');r.readAsDataURL(file)}
  function addImage(file){if(!file?.type.startsWith('image/'))return;if(file.size>3000000){toast('La imagen supera el límite local de 3 MB.');return}fileData(file,src=>{insert(`<img src="${src}" alt="${esc(file.name)}" title="${esc(file.name)}" style="width:45%;max-width:100%;height:auto;vertical-align:middle" draggable="true">`);toast('Imagen insertada. Ajusta su ancho desde «Más opciones».')})}
  function addVideo(file){if(!file?.type.startsWith('video/'))return;if(file.size>5000000){toast('El video supera el límite local de 5 MB.');return}fileData(file,src=>insert(`<video controls playsinline style="width:min(100%,640px)" src="${src}"></video>`))}
  function openLink(){
    saveRange();const label=getSelection()?.toString()||'';
    showAux('Insertar enlace','<p class="help-text">Asocia una dirección web al texto seleccionado o escribe el texto del enlace.</p><label class="form-label">Dirección web</label><input class="form-input" id="link-url" placeholder="https://…"><label class="form-label">Texto visible</label><input class="form-input" id="link-label" value="'+esc(label)+'" placeholder="Texto del enlace">','<button class="outline-button" data-action="close-aux">Cancelar</button><button class="primary-button" data-action="save-link">Insertar enlace</button>')
  }
  function saveLink(){
    const url=linkUrl(document.getElementById('link-url')?.value),label=document.getElementById('link-label')?.value.trim()||url;
    if(!url||!label){toast('Añade una dirección válida y el texto visible.');return}
    insert(`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`);hideAux()
  }
  function openLatex(){
    saveRange();showAux('Insertar LaTeX','<p class="help-text">Escribe la fórmula sin delimitadores. La verás renderizada al leer el artículo.</p><label class="form-label">Código LaTeX</label><textarea class="form-textarea" id="latex-input" placeholder="\\frac{a}{b}"></textarea><div class="preview-box"><strong>Vista previa</strong><div id="latex-preview" class="latex-preview">La expresión aparecerá aquí</div></div>','<button class="outline-button" data-action="close-aux">Cancelar</button><button class="primary-button" data-action="save-latex">Insertar fórmula</button>');
    document.getElementById('latex-input').addEventListener('input',previewLatex)
  }
  function previewLatex(){const src=document.getElementById('latex-input')?.value||'',p=document.getElementById('latex-preview');if(!p)return;p.innerHTML=src?'\\('+esc(src)+'\\)':'La expresión aparecerá aquí';if(window.MathJax?.typesetPromise){window.MathJax.typesetClear?.([p]);window.MathJax.typesetPromise([p]).catch(()=>{})}}
  function saveLatex(){const src=document.getElementById('latex-input')?.value.trim();if(!src){toast('Escribe una fórmula en LaTeX.');return}const v=src.replace(/[<>]/g,'');insert(`<span class="latex-inline" data-latex="${esc(v)}">\\(${esc(v)}\\)</span>`);hideAux()}
  function saveVideoUrl(){const url=linkUrl(document.getElementById('video-url')?.value);if(!url){toast('Escribe una URL válida.');return}insert(`<video controls playsinline style="width:min(100%,640px)" src="${esc(url)}"></video>`);hideAux()}
  function selected(){if(pickedMedia?.isConnected)return pickedMedia;const n=getSelection()?.anchorNode,e=n?.nodeType===1?n:n?.parentElement;return e?.closest?.('img,video,audio')||null}
  function resizeMedia(){const m=selected();if(!m||!m.matches('img,video')){toast('Selecciona primero una imagen o video.');return}const n=prompt('Ancho del elemento en porcentaje (20–100):',String(parseInt(m.style.width)||45));if(n===null)return;m.style.width=Math.max(20,Math.min(100,parseInt(n)||45))+'%';m.style.maxWidth='100%'}
  function alignMedia(where){const m=selected();if(!m){command(where==='center'?'justifyCenter':where==='right'?'justifyRight':'justifyLeft');return}m.style.display='block';m.style.marginLeft=where==='left'?'0':'auto';m.style.marginRight=where==='right'?'0':'auto'}
  function imageLayoutDialog(){const m=pickedMedia?.isConnected?pickedMedia:null;if(!m||!m.matches('img')){toast('Selecciona primero una imagen.');return}showAux('Posición y marco de imagen','<p class="help-text">Ajusta cómo se integra esta imagen con el texto.</p><label class="form-label">Posición</label><select class="form-select" id="image-position"><option value="inline">En línea</option><option value="left">Flotante a la izquierda</option><option value="right">Flotante a la derecha</option><option value="overlay">Superpuesta sobre el texto</option></select><div class="split-fields"><div><label class="form-label">Horizontal (%) para superposición</label><input class="form-input" id="image-x" type="number" min="0" max="90" value="20"></div><div><label class="form-label">Vertical (%) para superposición</label><input class="form-input" id="image-y" type="number" min="0" max="90" value="20"></div></div><label class="form-label">Marco</label><select class="form-select" id="image-frame"><option value="none">Sin marco</option><option value="simple">Borde sencillo</option><option value="card">Marco tipo tarjeta</option></select>','<button class="outline-button" data-action="close-aux">Cancelar</button><button class="primary-button" data-action="save-image-layout">Aplicar</button>')}
  function saveImageLayout(){const m=pickedMedia;if(!m?.isConnected){toast('Vuelve a seleccionar la imagen.');return}const p=document.getElementById('image-position').value,frame=document.getElementById('image-frame').value;m.style.float='';m.style.position='';m.style.top='';m.style.left='';m.style.zIndex='';m.style.transform='';m.style.display='';m.style.margin='';if(p==='left'){m.style.float='left';m.style.margin='4px 18px 12px 0'}else if(p==='right'){m.style.float='right';m.style.margin='4px 0 12px 18px'}else if(p==='overlay'){m.style.position='absolute';m.style.top=Math.max(0,Math.min(90,Number(document.getElementById('image-y').value)||20))+'%';m.style.left=Math.max(0,Math.min(90,Number(document.getElementById('image-x').value)||20))+'%';m.style.zIndex='2';m.style.transform='translate(-50%,-50%)'}else{m.style.display='inline-block';m.style.verticalAlign='middle'}m.style.border=frame==='none'?'':'1px solid var(--line)';m.style.padding=frame==='none'?'':frame==='card'?'12px':'5px';m.style.borderRadius=frame==='card'?'12px':'4px';m.style.background=frame==='none'?'':'var(--surface)';m.style.boxShadow=frame==='card'?'0 8px 24px rgba(20,30,50,.16)':'';hideAux()}
  async function voice(){
    if(audioRecorder?.state==='recording'){audioRecorder.stop();toast('Guardando nota de audio…');return}
    if(recognition){recognition.stop();recognition=null;toast('Dictado detenido.');return}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(SR){try{recognition=new SR();recognition.lang='es-CO';recognition.interimResults=false;recognition.onresult=e=>{const t=e.results?.[0]?.[0]?.transcript;if(t)insertText(t+' ')};recognition.onerror=()=>toast('No se pudo activar el dictado; revisa el permiso del micrófono.');recognition.onend=()=>{recognition=null};recognition.start();toast('Dictado activo. Pulsa 🎙 otra vez para terminar.')}catch(_){toast('El dictado no está disponible.')}return}
    startAudio()
  }
  async function startAudio(){
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('La grabación de audio no está disponible aquí.');return}
    try{audioStream=await navigator.mediaDevices.getUserMedia({audio:true});if(backdrop.hidden){audioStream.getTracks().forEach(t=>t.stop());audioStream=null;return}const parts=[];audioRecorder=new MediaRecorder(audioStream);audioRecorder.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};audioRecorder.onstop=()=>{audioStream?.getTracks().forEach(t=>t.stop());audioStream=null;const blob=new Blob(parts,{type:audioRecorder?.mimeType||'audio/webm'});audioRecorder=null;if(blob.size>4000000){toast('La nota supera el límite local de 4 MB.');return}fileData(blob,src=>insert(`<audio controls src="${src}"></audio>`))};audioRecorder.start();toast('Grabando. Pulsa 🎙 para detener.')}catch(_){toast('No se pudo acceder al micrófono. Comprueba los permisos.')}
  }
  async function openCamera(){
    const panel=document.getElementById('capture-panel');if(!panel)return;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('La cámara requiere permisos y un navegador compatible.');return}
    panel.hidden=false;
    try{cameraStream=await navigator.mediaDevices.getUserMedia({video:true,audio:true});if(backdrop.hidden){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;return}document.getElementById('camera-preview').srcObject=cameraStream;document.getElementById('capture-status').textContent='Vista previa lista. Pulsa Grabar para empezar.'}catch(_){panel.hidden=true;toast('No se pudo acceder a la cámara. Comprueba los permisos.')}
  }
  function startCamera(){
    if(!cameraStream)return;cameraParts=[];cancelCamera=false;
    try{cameraRecorder=new MediaRecorder(cameraStream);cameraRecorder.ondataavailable=e=>{if(e.data.size)cameraParts.push(e.data)};cameraRecorder.onstop=()=>{cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;if(cancelCamera)return;const blob=new Blob(cameraParts,{type:cameraRecorder?.mimeType||'video/webm'});cameraRecorder=null;if(blob.size>5000000){toast('El video supera el límite local de 5 MB.');return}fileData(blob,src=>insert(`<video controls playsinline style="width:min(100%,640px)" src="${src}"></video>`))};cameraRecorder.start();document.getElementById('capture-status').textContent='Grabando. Detén para insertar el video.';document.querySelector('[data-action="start-camera"]').hidden=true;document.querySelector('[data-action="stop-camera"]').hidden=false}catch(_){toast('No se pudo iniciar la grabación.')}
  }
  function stopCamera(cancel=false){if(cancel)cancelCamera=true;if(cameraRecorder?.state==='recording')cameraRecorder.stop();cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;const p=document.getElementById('capture-panel');if(p)p.hidden=true}

  function customize(){
    pendingWallpaper=undefined;const d=state.design;
    showModal('Apariencia y diseño','<p class="help-text">Cambia el tema, el color, el fondo y escribe CSS propio. Todo se guarda localmente.</p><div class="design-grid"><div><label class="form-label">Tema</label><select class="form-select" id="design-theme"><option value="light" '+(d.theme==='light'?'selected':'')+'>Claro</option><option value="dark" '+(d.theme==='dark'?'selected':'')+'>Oscuro</option></select></div><div><label class="form-label">Color de acento</label><div class="color-field"><input type="color" id="design-accent" value="'+esc(d.accent)+'"><span>Botones y enlaces</span></div></div><div class="full"><label class="form-label">Imagen de fondo</label><div class="split-fields"><input class="form-input" type="file" id="design-wallpaper" accept="image/*"><button class="outline-button" data-action="clear-wallpaper">Quitar fondo</button></div><label class="form-label">Velo de lectura: <span id="overlay-value">'+Math.round(d.overlay*100)+'%</span></label><input type="range" id="design-overlay" min="0" max="95" value="'+Math.round(d.overlay*100)+'" style="width:100%"><div class="wallpaper-preview" id="wallpaper-preview">'+(d.wallpaper?'Fondo seleccionado':'Vista previa del fondo')+'</div></div><div class="full"><label class="form-label">CSS personalizado</label><textarea class="form-textarea css-editor" id="design-css" placeholder=".hero { border-radius: 0; }&#10;.wiki-card { max-width: 900px; }">'+esc(d.customCss)+'</textarea><small class="muted-note">Puedes dar estilo a .app-frame, .hero, .wiki-card, .article-tile y las clases de la interfaz.</small></div></div>','<button class="outline-button" data-action="close">Cancelar</button><button class="primary-button" data-action="save-design">Guardar diseño</button>');
  }
  function updateWallpaperPreview(){const r=document.getElementById('design-overlay'),l=document.getElementById('overlay-value'),p=document.getElementById('wallpaper-preview');if(r&&l)l.textContent=r.value+'%';if(p){const img=pendingWallpaper===undefined?state.design.wallpaper:pendingWallpaper;p.style.backgroundImage=img?'url("'+img+'")':'';p.textContent=img?'Fondo seleccionado':'Vista previa del fondo'}}
  function saveDesign(){state.design.theme=document.getElementById('design-theme').value;state.design.accent=document.getElementById('design-accent').value;state.design.overlay=Number(document.getElementById('design-overlay').value)/100;state.design.customCss=document.getElementById('design-css').value;if(pendingWallpaper!==undefined)state.design.wallpaper=pendingWallpaper;save();hideModal();render();toast('Diseño guardado.')}
  function readingDialog(){showModal('Preferencias de lectura','<p class="help-text">Ajusta la lectura en todos los artículos. El valor estándar mantiene el diseño original.</p><label class="form-label">Tamaño del texto</label><select class="form-select" id="read-size"><option value="small">Pequeño</option><option value="normal">Estándar</option><option value="large">Grande</option><option value="xlarge">Muy grande</option></select><label class="form-label">Tipografía</label><select class="form-select" id="read-font"><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monoespaciada</option></select><label class="form-label">Espaciado entre líneas</label><select class="form-select" id="read-line"><option value="comfortable">Estándar</option><option value="relaxed">Amplio</option></select>','<button class="outline-button" data-action="close">Cancelar</button><button class="primary-button" data-action="save-reading">Guardar preferencias</button>',true);document.getElementById('read-size').value=state.reading.size;document.getElementById('read-font').value=state.reading.font;document.getElementById('read-line').value=state.reading.line}
  function saveReading(){state.reading={size:document.getElementById('read-size').value,font:document.getElementById('read-font').value,line:document.getElementById('read-line').value};save();hideModal();render();toast('Preferencias guardadas.')}
  function saveArticle(){
    const a=state.articles.find(x=>x.id===editorId),title=document.getElementById('editor-title')?.value.trim();if(!a)return;
    if(!title){toast('Escribe un título.');return}if(state.articles.some(x=>x.id!==a.id&&x.title.toLowerCase()===title.toLowerCase())){toast('Ya existe un artículo con ese título.');return}
    if(a.body!==clean(editor()?.innerHTML||'')||a.title!==title){state.revisions.unshift({id:id(),articleId:a.id,title:a.title,body:a.body,date:new Date().toISOString()});state.revisions=state.revisions.slice(0,50)}
    a.title=title;a.body=clean(editor()?.innerHTML||'');a.updated=new Date().toISOString();save();hideModal();articleId=a.id;articleTab='article';page='article';render();toast('Artículo guardado.')
  }
  function saveComment(targetId){const author=document.getElementById('comment-author')?.value.trim()||'Preludiano/a',body=document.getElementById('comment-body')?.value.trim();if(!body){toast('Escribe un comentario antes de publicarlo.');return}state.comments.unshift({id:id(),articleId:targetId,author,body,date:new Date().toISOString()});save();articleTab='discussion';render();toast('Comentario publicado.')}
  function restoreRevision(revisionId){const r=state.revisions.find(x=>x.id===revisionId),a=state.articles.find(x=>x.id===r?.articleId);if(!r||!a)return;state.revisions.unshift({id:id(),articleId:a.id,title:a.title,body:a.body,date:new Date().toISOString()});a.title=r.title;a.body=r.body;a.updated=new Date().toISOString();save();articleTab='article';render();toast('Se restauró esa versión.')}
  function enterPresent(idValue){articleId=idValue;slideIndex=0;page='present';render();document.getElementById('presentation-view')?.requestFullscreen?.().catch(()=>{})}
  function leavePresent(){if(document.fullscreenElement)document.exitFullscreen?.().catch?.(()=>{});page='article';render()}
  function moveSlide(d){const a=state.articles.find(x=>x.id===articleId);if(!a)return;slideIndex=Math.max(0,Math.min(slides(a).length-1,slideIndex+d));render()}
  function openArticle(idValue){if(!state.articles.some(a=>a.id===idValue))return;articleId=idValue;articleTab='article';page='article';render();document.getElementById('sidebar').classList.remove('open');document.getElementById('search-results').hidden=true;window.scrollTo({top:0,behavior:'smooth'})}

  document.addEventListener('mousedown',e=>{if(e.target.closest('.editor-toolbar button'))e.preventDefault()});
  document.addEventListener('click',e=>{
    const pg=e.target.closest('[data-page]');if(pg){page=pg.dataset.page;render();document.getElementById('sidebar').classList.remove('open');return}
    const folder=e.target.closest('[data-open-folder]');if(folder){activeFolderId=folder.dataset.openFolder;page='folder';render();document.getElementById('sidebar').classList.remove('open');return}
    const op=e.target.closest('[data-open]');if(op){openArticle(op.dataset.open);return}
    const template=e.target.closest('[data-template]');if(template){selectedDesign=template.dataset.template;document.querySelectorAll('[data-template]').forEach(card=>card.classList.toggle('selected',card===template));return}
    const cmd=e.target.closest('[data-command]');if(cmd){command(cmd.dataset.command);return}
    const b=e.target.closest('[data-action]');if(!b)return;
    switch(b.dataset.action){
      case 'go-home':page='home';render();break;
      case 'create':createDialog(b.dataset.folder||(page==='folder'?activeFolderId:''));break;
      case 'create-folder':folderDialog();break;
      case 'edit-folder':folderDialog(state.folders.find(f=>f.id===b.dataset.id)||null);break;
      case 'save-folder':saveFolder(b.dataset.id);break;
      case 'create-confirm':create();break;
      case 'close':case 'close-modal':hideModal();break;
      case 'close-aux':hideAux();break;
      case 'reading-settings':readingDialog();break;
      case 'save-reading':saveReading();break;
      case 'article-tab':articleTab=b.dataset.tab;render();break;
      case 'save-comment':saveComment(b.dataset.id);break;
      case 'restore-revision':restoreRevision(b.dataset.id);break;
      case 'edit':edit(b.dataset.id);break;
      case 'save-article':saveArticle();break;
      case 'customize':customize();break;
      case 'save-design':saveDesign();break;
      case 'clear-wallpaper':pendingWallpaper='';updateWallpaperPreview();break;
      case 'image':range=getSelection()?.rangeCount?getSelection().getRangeAt(0).cloneRange():range;document.getElementById('image-input').click();break;
      case 'video':range=getSelection()?.rangeCount?getSelection().getRangeAt(0).cloneRange():range;document.getElementById('video-input').click();break;
      case 'link':openLink();break;
      case 'save-link':saveLink();break;
      case 'unlink':command('unlink');break;
      case 'latex':openLatex();break;
      case 'save-latex':saveLatex();break;
      case 'image-layout':imageLayoutDialog();break;
      case 'save-image-layout':saveImageLayout();break;
      case 'video-url':showAux('Insertar video por enlace','<p class="help-text">Usa un enlace directo a un archivo compatible, como MP4 o WebM.</p><label class="form-label">URL del video</label><input class="form-input" id="video-url" placeholder="https://…/video.mp4">','<button class="outline-button" data-action="close-aux">Cancelar</button><button class="primary-button" data-action="save-video-url">Insertar</button>');break;
      case 'save-video-url':{const u=linkUrl(document.getElementById('video-url')?.value);if(!u){toast('Escribe una URL válida.');break}insert(`<video controls playsinline style="width:min(100%,640px)" src="${esc(u)}"></video>`);hideAux();break}
      case 'resize-media':{const m=pickedMedia?.isConnected?pickedMedia:(getSelection()?.anchorNode?.parentElement?.closest?.('img,video')||null);if(!m){toast('Selecciona primero una imagen o video.');break}const n=prompt('Ancho en porcentaje (20–100):',String(parseInt(m.style.width)||45));if(n!==null){m.style.width=Math.max(20,Math.min(100,parseInt(n)||45))+'%';m.style.maxWidth='100%'}break}
      case 'align-left':alignMedia('left');break;case 'align-center':alignMedia('center');break;case 'align-right':alignMedia('right');break;
      case 'voice':voice();break;case 'record-audio':startAudio();break;case 'camera':openCamera();break;case 'start-camera':startCamera();break;case 'stop-camera':stopCamera(false);break;case 'close-camera':stopCamera(true);break;
      case 'fullscreen-editor':if(document.fullscreenElement)document.exitFullscreen?.();else modal.requestFullscreen?.().catch(()=>toast('No se pudo activar pantalla completa.'));break;
      case 'more':{const m=document.getElementById('more-menu');m.hidden=!m.hidden;b.setAttribute('aria-expanded',String(!m.hidden));break}
      case 'present':enterPresent(b.dataset.id);break;case 'exit-present':leavePresent();break;case 'next':moveSlide(1);break;case 'prev':moveSlide(-1);break;
      case 'present-fullscreen':{const v=document.getElementById('presentation-view');if(document.fullscreenElement)document.exitFullscreen?.();else v?.requestFullscreen?.().catch(()=>{});break}
    }
  });
  document.addEventListener('change',e=>{
    if(e.target.id==='block-format')command('formatBlock');
    if(e.target.id==='image-input'){const f=e.target.files?.[0];e.target.value='';if(f){if(f.size>3000000){toast('La imagen supera 3 MB.');return}fileData(f,src=>insert(`<img src="${src}" alt="${esc(f.name)}" style="width:45%;max-width:100%;height:auto">`))}}
    if(e.target.id==='video-input'){const f=e.target.files?.[0];e.target.value='';if(f){if(f.size>5000000){toast('El video supera 5 MB.');return}fileData(f,src=>insert(`<video controls playsinline style="width:min(100%,640px)" src="${src}"></video>`))}}
    if(e.target.id==='design-wallpaper'){const f=e.target.files?.[0];if(!f)return;if(!f.type.startsWith('image/')||f.size>3000000){toast('Elige una imagen de hasta 3 MB.');return}fileData(f,src=>{pendingWallpaper=src;updateWallpaperPreview()})}
    if(e.target.id==='text-color'){focusEditor();document.execCommand('styleWithCSS',false,true);document.execCommand('foreColor',false,e.target.value)}
    if(e.target.id==='highlight-color'){focusEditor();document.execCommand('styleWithCSS',false,true);document.execCommand('hiliteColor',false,e.target.value)}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='article-filter'){const wrap=document.getElementById('article-results');if(wrap)wrap.innerHTML=articleResults(e.target.value)}
    if(e.target.id==='folder-filter'){const wrap=document.getElementById('folder-results');if(wrap)wrap.innerHTML=articleResults(e.target.value,activeFolderId)}
    if(e.target.id==='design-overlay')updateWallpaperPreview();
    if(e.target.id==='editor-canvas')wordCount()
  });
  document.addEventListener('paste',e=>{
    const ed=editor();if(!ed||!ed.contains(e.target))return;
    const items=[...(e.clipboardData?.items||[])],image=items.find(x=>x.type.startsWith('image/'));
    if(image){e.preventDefault();const f=image.getAsFile();if(f){if(f.size>3000000){toast('La imagen supera 3 MB.');return}fileData(f,src=>insert(`<img src="${src}" alt="Imagen pegada" style="width:45%;max-width:100%;height:auto">`))}return}
    const html=e.clipboardData?.getData('text/html');if(html){e.preventDefault();insert(clean(html))}else{const text=e.clipboardData?.getData('text/plain');if(text){e.preventDefault();insertText(text)}}
  });
  document.addEventListener('click',e=>{const m=e.target.closest('#editor-canvas img,#editor-canvas video,#editor-canvas audio');if(m)pickedMedia=m;if(!e.target.closest('.more-wrap')){const menu=document.getElementById('more-menu');if(menu)menu.hidden=true}});
  document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase(),box=document.getElementById('search-results');if(!q){box.hidden=true;return}const found=state.articles.filter(a=>a.title.toLowerCase().includes(q)).slice(0,7);box.innerHTML=found.length?found.map(a=>`<button class="search-result" data-open="${esc(a.id)}">${esc(a.title)}</button>`).join(''):'<div class="search-result">No hay artículos con ese título.</div>';box.hidden=false});
  document.getElementById('search').addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('search-results').hidden=true;if(e.key==='Enter')document.querySelector('#search-results [data-open]')?.click()});
  document.getElementById('theme-toggle').addEventListener('click',()=>{state.design.theme=state.design.theme==='dark'?'light':'dark';save();design()});
  document.getElementById('menu-toggle').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
  document.addEventListener('keydown',e=>{
    if(page==='present'){if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();moveSlide(1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();moveSlide(-1)}if(e.key==='Escape')leavePresent();return}
    if(e.key==='Escape'&&!backdrop.hidden){const aux=document.getElementById('editor-aux');if(aux&&!aux.hidden)hideAux();else hideModal()}
  });
  window.addEventListener('beforeunload',()=>{cameraStream?.getTracks().forEach(t=>t.stop());audioStream?.getTracks().forEach(t=>t.stop());recognition?.stop?.()});
  design();render();
})();


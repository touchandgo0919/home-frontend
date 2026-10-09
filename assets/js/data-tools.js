(() => {
 const lang=window.HomeI18n?.language || (/^zh/i.test(navigator.language)?'zh':'en');
 const L=(zh,en)=>lang==='zh'?zh:en;
 const el=(tag,text,props={})=>Object.assign(document.createElement(tag),{...(text!==undefined?{textContent:text}:{}),...props});
 const dialog=el('dialog',undefined,{id:'dataDialog',className:'data-dialog'});
 const head=el('div',undefined,{className:'data-head'}),title=el('h2',L('数据与备份','Data & backups')),close=el('button','×',{type:'button'});
 close.setAttribute('aria-label',L('关闭','Close'));close.onclick=()=>dialog.close();head.append(title,close);
 const tabs=el('div',undefined,{className:'data-tabs'}),body=el('div',undefined,{className:'data-body'}),status=el('p','',{className:'data-status'});status.setAttribute('role','status');
 dialog.append(head,tabs,body,status);document.body.append(dialog);
 let busy=false;const app=()=>window.homeApp;
 const run=async(fn)=>{if(busy)return;busy=true;status.textContent=L('处理中…','Working…');dialog.setAttribute('aria-busy','true');try{await fn();}catch(e){status.textContent=window.HomeI18n?.translate(e.message)||e.message;}finally{busy=false;dialog.removeAttribute('aria-busy');}};
 const api=(path,data)=>app().api(path,data===undefined?{}:{method:'POST',body:JSON.stringify(data)});
 const button=(label,fn)=>{const b=el('button',label,{type:'button'});b.onclick=()=>run(fn);return b;};
 const notice=text=>body.append(el('p',text));
 const reset=()=>{body.replaceChildren();status.textContent='';};
 function download(value,filename,type){const url=URL.createObjectURL(new Blob([value],{type})),a=el('a',undefined,{href:url,download:filename});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function asHtml(data){return '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n'+data.categories.map(g=>`<DT><H3>${esc(g.name)}</H3>\n<DL><p>\n${g.links.map(b=>`<DT><A HREF="${esc(b.url)}">${esc(b.title)}</A>`).join('\n')}\n</DL><p>`).join('\n')+'\n</DL><p>';
 }
 function parseFile(text,name){
  if(/\.json$/i.test(name)||/^\s*[{[]/.test(text)){const data=JSON.parse(text);if(!Array.isArray(data.categories))throw new Error(L('JSON 文件缺少 categories。','JSON must contain categories.'));return data;}
  const doc=new DOMParser().parseFromString(text,'text/html'),groups=new Map();
  for(const a of doc.querySelectorAll('dt > a[href]')){
   const path=[];let dl=a.closest('dl');
   while(dl){const holder=dl.parentElement;let heading=holder?.tagName==='DT'?holder.querySelector(':scope > h3'):null;
    if(!heading){const previous=dl.previousElementSibling;heading=previous?.tagName==='H3'?previous:previous?.tagName==='DT'?previous.querySelector(':scope > h3'):null;}
    if(heading)path.unshift(heading.textContent.trim());dl=holder?.closest('dl');
   }
   const group=path.join(' / ')||L('导入的收藏','Imported bookmarks');if(!groups.has(group))groups.set(group,[]);groups.get(group).push({title:a.textContent.trim()||a.getAttribute('href'),url:a.getAttribute('href')});
  }
  if(!groups.size)throw new Error(L('没有找到书签，请选择 Chrome 导出的 HTML 或本站 JSON。','No bookmarks found. Choose Chrome bookmark HTML or a navigation JSON export.'));
  return {categories:[...groups].map(([name,links])=>({name,links}))};
 }
 function importEditor(data,restore=false){
  reset();notice(restore?L('恢复仅合并本账号的收藏；现有书签和 Token 保留。','Recovery merges bookmarks into your account. Existing bookmarks and Tokens are preserved.'):L('可调整目标分组名称。先预览新增、重复及无效条目，再确认导入。每次最多 1000 条。','Edit destination collection names, then preview before importing. Up to 1,000 bookmarks per import.'));
  const mapping=el('div',undefined,{className:'data-mapping'}),editors=[];
  for(const group of data.categories){const row=el('label'),input=el('input',undefined,{value:group.name||group.category||'',maxLength:100});row.append(el('span',String((group.links||[]).length)+L(' 条 → ',' items → ')),input);mapping.append(row);editors.push([input,group]);}
  body.append(mapping);const results=el('div'),apply=button(L('确认合并','Confirm merge'),async()=>{
   const result=await api('data/import',pending);apply.disabled=true;
   status.textContent=result.replayed?L('这次导入已完成，没有重复添加。','This import already completed. No duplicates added.'):L(`已合并：新增 ${result.added} 条，跳过 ${result.duplicates} 条重复、${result.invalid} 条无效。`,`Merged: ${result.added} added, ${result.duplicates} duplicates and ${result.invalid} invalid entries skipped.`);
   await app().reload();
  });apply.disabled=true;let pending;
  for(const [input] of editors)input.oninput=()=>{apply.disabled=true;pending=null;results.replaceChildren();};
  const preview=button(L('预览导入','Preview import'),async()=>{
   const categories=editors.map(([input,group])=>({name:input.value,links:group.links}));
   const plan=await api('data/import/preview',{categories});pending={categories,request_id:crypto.randomUUID(),restore_deleted:restore};
   results.replaceChildren(el('p',L(`共 ${plan.total} 条：新增 ${plan.added}，重复 ${plan.duplicates}，无效 ${plan.invalid}。`,`Total ${plan.total}: ${plan.added} new, ${plan.duplicates} duplicate, ${plan.invalid} invalid.`)));
   results.append(el('p',L(`新增或恢复分组：${plan.collections_added}。`,`Collections to create or restore: ${plan.collections_added}.`)));
   apply.disabled=!plan.added&&!plan.collections_added;status.textContent=L('预览完成，尚未写入。','Preview ready. No data has been written.');
  });body.append(preview,results,apply);
 }
 async function exports(){reset();notice(L('导出仅包含自己的分组和书签，不含 Token。','Exports include only your collections and bookmarks, never Tokens.'));
  for(const format of ['JSON','HTML'])body.append(button(L(`导出 ${format}`,`Export ${format}`),async()=>{const data=await api('data/export');download(format==='JSON'?JSON.stringify(data,null,2):asHtml(data),`navigation-${new Date().toISOString().slice(0,10)}.${format.toLowerCase()}`,format==='JSON'?'application/json':'text/html');status.textContent=L('导出已下载。','Export downloaded.');}));
 }
 async function imports(){reset();notice(L('选择 Chrome 书签 HTML 或本站导出的 JSON。导入前会显示预览。','Choose Chrome bookmark HTML or a JSON export. Review a preview before importing.'));
  const input=el('input',undefined,{type:'file',accept:'.html,.htm,.json'});input.setAttribute('aria-label',L('选择书签文件','Choose bookmark file'));input.onchange=()=>run(async()=>{const file=input.files[0];if(!file)return;if(file.size>1048576)throw new Error(L('文件不得超过 1 MB。','File must be under 1 MB.'));importEditor(parseFile(await file.text(),file.name));});body.append(input);
 }
 async function trash(){reset();const data=await api('trash');notice(L('删除的书签和分组保留 30 天；恢复分组会恢复随它一起删除的书签。','Deleted bookmarks and collections are kept for 30 days. Restoring a collection restores bookmarks deleted with it.'));
  for(const [type,items] of [['categories',data.categories],['bookmarks',data.bookmarks]])for(const item of items){const row=el('div',undefined,{className:'data-row'});row.append(el('span',(type==='categories'?L('分组：','Collection: '):'')+(item.name||item.title)),el('small',new Date(item.deleted_at).toLocaleDateString()),button(L('恢复','Restore'),async()=>{await api('trash/restore',{type,id:item.id});await app().reload();await trash();status.textContent=L('已恢复。','Restored.');}));body.append(row);}
  if(!data.categories.length&&!data.bookmarks.length)notice(L('回收站为空。','Trash is empty.'));status.textContent='';
 }
 async function backups(){reset();notice(L('每天北京时间 03:00 自动备份，保留 35 天。恢复前可预览，并只合并当前账号的数据。','Daily backups at 03:00 Asia/Shanghai, retained for 35 days. Preview and merge only your account’s data.'));
  const data=await api('backups');
  if(app().role()==='platform')body.append(button(L('立即备份','Back up now'),async()=>{await api('backups/run',{});await backups();status.textContent=L('备份完成。','Backup completed.');}));
  if(!data.data.length)notice(L('尚无备份记录。','No backups yet.'));
  for(const item of data.data){const row=el('div',undefined,{className:'data-row'});row.append(el('span',new Date(item.created_at).toLocaleString()),el('small',item.status==='success'?L('成功','Success'):L('失败','Failed')));
   if(item.status==='success')row.append(button(L('预览恢复','Preview recovery'),async()=>importEditor(await api('backups/'+item.id),true)),button(L('下载','Download'),async()=>{download(JSON.stringify(await api('backups/'+item.id),null,2),'navigation-backup.json','application/json');status.textContent=L('备份已下载。','Backup downloaded.');}));body.append(row);
  }status.textContent='';
 }
 for(const [name,fn] of [[L('导出','Export'),exports],[L('导入','Import'),imports],[L('回收站','Trash'),trash],[L('自动备份','Backups'),backups]])tabs.append(button(name,fn));
 document.getElementById('dataToolsBtn').onclick=()=>{dialog.showModal();run(exports);};
 const undo=el('div',undefined,{className:'undo-notice',hidden:true});undo.setAttribute('role','status');document.body.append(undo);let undoTimer;
 window.NavTools={offerUndo(item){clearTimeout(undoTimer);undo.replaceChildren(el('span',L('已移入回收站。','Moved to Trash.')),button(L('撤销','Undo'),async()=>{await api('trash/restore',item);undo.hidden=true;await app().reload();}));undo.hidden=false;undoTimer=setTimeout(()=>undo.hidden=true,10000);}};
})();

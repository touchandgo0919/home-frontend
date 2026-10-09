(() => {
 const choice=localStorage.getItem('nav-language');const language=choice==='en'||choice==='zh'?choice:/^zh/i.test(navigator.language)?'zh':'en';
 const words={
 '我的导航':'My Navigation','个人书签中心':'Your bookmark collection','导':'N','搜索书签、网站或关键词':'Search bookmarks, websites or keywords','登录':'Sign in','编辑':'Edit','保存':'Save','管理':'Admin','复制 Token':'Copy Token','数据':'Data','备份':'Backups','数据与备份':'Data & backups','登出':'Sign out','全部收藏':'All bookmarks','新增分组':'New collection','收藏分类':'Collections','编辑模式已开启：拖动左侧分组可调整顺序，拖动书签图块可在同组或跨组移动。':'Editing: drag collections to reorder them, or drag bookmarks within or between collections.','没有找到匹配的收藏':'No matching bookmarks','换一个关键词试试。':'Try another search term.','登录后查看导航':'Sign in to your navigation','输入你的访问 token，即可加载所属租户的书签并进入管理。':'Enter your Token to load your personal bookmarks.','使用帮助':'Help','隐私政策':'Privacy policy','赞赏':'Support','关闭':'Close','编辑分组':'Edit collection','删除分组':'Move collection to Trash','新增书签':'New bookmark','编辑书签':'Edit bookmark','删除书签':'Move bookmark to Trash','名称':'Name','工作':'Work','图标':'Icon','取消':'Cancel','标题':'Title','分组':'Collection','网址':'URL','正在加载导航…':'Loading your navigation…','请求超时，请检查网络后重试。':'Request timed out. Check your connection and retry.','请求失败':'Request failed','导航数据格式错误':'Invalid navigation response','导航加载失败，请检查网络后重试。':'Unable to load navigation. Check your connection and retry.','请输入 token':'Enter your Token','正在登录…':'Signing in…','登录失败，请检查 token。':'Sign-in failed. Check your Token.','登录失败':'Sign-in failed','保存失败':'Save failed','登录凭据已失效，请重新登录。':'Your sign-in has expired. Please sign in again.','复制失败，请允许浏览器使用剪贴板后重试。':'Copy failed. Allow clipboard access and try again.','Token 已复制，请妥善保存。':'Token copied. Keep it safe.','复制失败，请重试。':'Copy failed. Please retry.','切换深色浅色模式':'Switch dark or light appearance','进入管理后台':'Open administration'
 };
 function translate(value){if(language==='zh')return value;if(words[value])return words[value];return value.replace(/^欢迎，(.*)$/,'Welcome, $1').replace(/^将分组「(.*)」及其中书签移入回收站？$/,'Move collection “$1” and its bookmarks to Trash?').replace(/^将书签「(.*)」移入回收站？$/,'Move bookmark “$1” to Trash?');}
 window.HomeI18n={language,translate};document.documentElement.lang=language==='zh'?'zh-CN':'en';
 const originalAlert=window.alert.bind(window),originalConfirm=window.confirm.bind(window);window.alert=text=>originalAlert(translate(text));window.confirm=text=>originalConfirm(translate(text));
 function localize(root){
  if(language==='zh')return;
  const skip='script,style,option,.nav-name,.card-title,.card-url,.section-title,.data-dialog,.undo-notice,[data-user-content]';
  const visit=node=>{if(node.parentElement?.closest(skip))return;const text=node.nodeValue.trim();if(text){const next=translate(text);if(next!==text)node.nodeValue=node.nodeValue.replace(text,next);}};
  if(root.nodeType===Node.TEXT_NODE){visit(root);return;}if(root.nodeType!==Node.ELEMENT_NODE)return;
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walk.nextNode())visit(walk.currentNode);
  const elements=[root,...root.querySelectorAll('[placeholder],[aria-label],[title]')];for(const element of elements){if(element.closest(skip))continue;for(const attr of ['placeholder','aria-label','title']){const value=element.getAttribute(attr);if(value)element.setAttribute(attr,translate(value));}}
 }
 document.addEventListener('DOMContentLoaded',()=>{
  document.title=translate(document.title);localize(document.body);
  const switcher=document.getElementById('siteLanguage');if(switcher){const next=language==='zh'?'en':'zh';switcher.textContent=next==='en'?'EN':'中';switcher.title=next==='en'?'Switch to English':'切换到中文';switcher.setAttribute('aria-label',switcher.title);switcher.onclick=()=>{localStorage.setItem('nav-language',next);location.reload();};}
  for(const a of document.querySelectorAll('a[href="/help/"],a[href="/privacy/"]'))a.href+=`?lang=${language}`;
  new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')localize(record.target);else for(const node of record.addedNodes)localize(node);}}).observe(document.body,{subtree:true,childList:true,characterData:true});
 });
})();

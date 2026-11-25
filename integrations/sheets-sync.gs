// Bound or standalone Google Apps Script. Set GITHUB_TOKEN and SHEET_ID in Script Properties.
function syncZamen() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const p = PropertiesService.getScriptProperties();
    const token = p.getProperty('GITHUB_TOKEN'), sheetId = p.getProperty('SHEET_ID');
    if (!token || !sheetId) throw new Error('Missing Script Properties');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Untitled');
    if (!sheet) throw new Error('Sheet Untitled not found');
    const rows = sheet.getDataRange().getValues();
    const fields = ['title','category','source','date','summary','url'];
    const headers = rows.shift().map(x=>String(x).trim().toLowerCase());
    const cols = fields.map(k=>headers.indexOf(k));
    if (cols.some(i=>i<0)) throw new Error('Invalid headers');
    const items = new Map();
    for (const row of rows) {
      const [title,category,source,date,summary,url] = cols.map(i=>row[i]);
      const s = x=>String(x??'').trim();
      const link=s(url);
      if (!/^https:\/\/[^\s]+$/i.test(link) || !s(title) || !s(summary) || !s(source)) continue;
      const published = date instanceof Date ? Utilities.formatDate(date,'Asia/Riyadh','yyyy-MM-dd') : s(date);
      if (!/^\d{4}-\d{2}-\d{2}/.test(published)) continue;
      const id=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,link,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('').slice(0,24);
      items.set(id,{id,category:s(category).slice(0,100)||'أخرى',source:s(source).slice(0,150),article_url:link,title_ar:s(title).slice(0,400),summary_ar:s(summary),published_at:published,model:'gemini-task-mode'});
    }
    if (!items.size) throw new Error('No valid articles');
    const endpoint='https://api.github.com/repos/NaifHarb/zamen-ai/contents/data/sheets-news.json';
    const headersApi={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    const get=UrlFetchApp.fetch(endpoint,{headers:headersApi,muteHttpExceptions:true});
    let sha, old=[];
    if(get.getResponseCode()===200){
      const file=JSON.parse(get.getContentText()); sha=file.sha;
      old=JSON.parse(Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\s/g,''))).getDataAsString('UTF-8')).items;
    } else if(get.getResponseCode()!==404) throw new Error('GitHub read HTTP '+get.getResponseCode());
    const merged=new Map(old.map(x=>[x.id,x]));
    for(const [id,item] of items) merged.set(id,item);
    const next=[...merged.values()].sort((a,b)=>b.published_at.localeCompare(a.published_at)).slice(0,500);
    if(JSON.stringify(old)===JSON.stringify(next)) return;
    const payload={message:'Sync Gemini news from Sheets',content:Utilities.base64Encode(JSON.stringify({updated_at:new Date().toISOString(),items:next},null,2),Utilities.Charset.UTF_8),branch:'main'};
    if(sha) payload.sha=sha;
    const put=UrlFetchApp.fetch(endpoint,{method:'put',contentType:'application/json',headers:headersApi,payload:JSON.stringify(payload),muteHttpExceptions:true});
    if(![200,201].includes(put.getResponseCode())) throw new Error('GitHub write HTTP '+put.getResponseCode());
    console.log('Synced '+next.length+' articles');
  } finally {lock.releaseLock();}
}
function installZamenTrigger(){
  syncZamen();
  for(const t of ScriptApp.getProjectTriggers()) if(t.getHandlerFunction()==='syncZamen') ScriptApp.deleteTrigger(t);
  ScriptApp.newTrigger('syncZamen').timeBased().everyMinutes(15).create();
}

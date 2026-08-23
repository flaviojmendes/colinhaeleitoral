import { TSE_PAGE_ORIGIN } from "@/lib/tse";

export function ponteInjectorSource(appOrigin: string): string {
  return `(()=>{var APP=${JSON.stringify(appOrigin)};var TSE=${JSON.stringify(TSE_PAGE_ORIGIN)};if(location.origin!==TSE){alert("Abra o DivulgaCandContas do TSE e ative a ponte de novo.");return;}if(document.getElementById("colinha-ponte-frame")){return;}var f=document.createElement("iframe");f.id="colinha-ponte-frame";f.src=APP+"/admin/sync?ponte=1";f.setAttribute("style","position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2147483647;background:#1c211f");document.documentElement.appendChild(f);window.addEventListener("message",async function(e){if(e.origin!==APP){return;}var d=e.data;if(!d||d.type!=="colinha-tse-fetch"){return;}try{var r=await fetch(d.url,{credentials:"omit"});var t=await r.text();f.contentWindow&&f.contentWindow.postMessage({type:"colinha-tse-result",id:d.id,ok:r.ok,status:r.status,text:t},APP);}catch(err){f.contentWindow&&f.contentWindow.postMessage({type:"colinha-tse-result",id:d.id,ok:false,status:0,error:String(err)},APP);}});})();`;
}

export function ponteBookmarklet(appOrigin: string): string {
  return `javascript:${ponteInjectorSource(appOrigin)}`;
}

export function ponteUserscript(appOrigin: string): string {
  return `// ==UserScript==
// @name         Colinha ponte TSE
// @namespace    https://colinha
// @match        ${TSE_PAGE_ORIGIN}/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==
${ponteInjectorSource(appOrigin)}
`;
}

export function shouldServePonteScript(request: Request): boolean {
  const url = new URL(request.url);
  if (url.searchParams.has("js")) {
    return true;
  }

  const dest = request.headers.get("sec-fetch-dest");
  return dest === "script";
}

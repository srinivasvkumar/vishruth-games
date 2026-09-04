const { firefox } = require('@playwright/test');
const fs=require('fs'),path=require('path'),os=require('os');
(async()=>{
  for (const [name,prefs] of [
    ['security.webgl.enable', {'security.webgl.enable':true}],
    ['dom.webgl.enabled', {'dom.webgl.enabled':true}],
    ['both', {'security.webgl.enable':true,'dom.webgl.enabled':true}],
    ['security+dom+allow-webgl2', {'security.webgl.enable':true,'dom.webgl.enabled':true,'dom.webgl.enabled-with-context-lost':true}]
  ]){
    let ctx; try{
      const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ffsec-'));
      fs.writeFileSync(path.join(dir,'user.js'),Object.entries(prefs).map(([k,v])=>`user_pref("${k}",${JSON.stringify(v)});`).join('\n'));
      ctx=await firefox.launchPersistentContext(dir,{headless:true});
      const page=await ctx.newPage(); await page.goto('about:blank');
      const r=await page.evaluate(()=>{
        const gl1=document.createElement('canvas').getContext('webgl');
        const gl2=document.createElement('canvas').getContext('webgl2');
        let ren=null; if(gl2){const e=gl2.getExtension('WEBGL_debug_renderer_info');ren=e?String(gl2.getParameter(e.UNMASKED_RENDERER_WEBGL)):'(no ext)';}
        return {webgl1:!!gl1,webgl2:!!gl2,ren};
      });
      console.log(name,'=>',JSON.stringify(r));
    }catch(e){console.log(name,'ERR',String(e).split('\n')[0]);}
    finally{if(ctx)await ctx.close();}
  }
})();

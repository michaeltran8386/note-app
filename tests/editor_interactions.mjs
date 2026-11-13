// Zero-dependency browser regression suite. Run: node tests/editor_interactions.mjs
// Uses an isolated Edge profile; all AI responses and IPC are test doubles.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
const root = resolve(import.meta.dirname, '../src/ui/assets');
const profile = await mkdtemp(join(tmpdir(), 'note-local-editor-'));
const tests = [];
const test = async (name, source, input) => tests.push({name,source,input});
let edge, ws, server;
try {
    await test('existing Gemini settings migrate without changing custom models', `
        for(const [stored,expected] of [['gemini-1.5-flash','gemini-2.5-flash'],['custom-model','custom-model']]){
            localStorage.setItem('note_local_ai_config',JSON.stringify({cloudModel:stored}));
            document.getElementById('btn-settings').click();
            assert(document.getElementById('ai-cloud-model').value===expected,'model migration');
            document.getElementById('btn-close-settings').click();
        }
        localStorage.removeItem('note_local_ai_config');`);
    await test('API key detection and visual mode saving', `
        document.getElementById('btn-settings').click();
        const input=document.getElementById('ai-cloud-key');
        for(const [key,provider] of [['AQ.test','gemini'],['AIzaSyTest','gemini'],['gsk_test','groq'],['sk-test','openai']]) {
            input.value=key; input.dispatchEvent(new Event('input',{bubbles:true}));
            assert(document.querySelector('.cloud-preset-btn.active').dataset.provider===provider,provider);
        }
        document.querySelector('[data-provider="deepseek"]').click();
        input.value='sk-test'; input.dispatchEvent(new Event('input'));
        assert(document.querySelector('.cloud-preset-btn.active').dataset.provider==='deepseek','keep DeepSeek');
        input.value='sk-ant-test';input.dispatchEvent(new Event('input'));
        assert(document.querySelector('.cloud-preset-btn.active').dataset.provider==='deepseek','exclude Anthropic');
        input.value='AQ.test';input.dispatchEvent(new Event('input'));
        document.querySelector('input[name="ai-provider"][value="local"]').checked=true;
        document.getElementById('btn-save-settings').click();
        const cfg=JSON.parse(localStorage.getItem('note_local_ai_config'));
        assert(cfg.provider==='cloud'&&cfg.cloudModel==='gemini-2.5-flash','save visual cloud mode');`);
    for (const [marker, selector] of [['- ','ul>li'],['* ','ul>li'],['1. ','ol>li'],['[] ','.todo-text'],['[ ] ','.todo-text'],['# ','h1'],['## ','h2'],['### ','h3'],['> ','blockquote'],['---','p']]) {
        await test(`expand ${JSON.stringify(marker)} with stable caret`, `
            const el=ed.querySelector(${JSON.stringify(selector)});
            assert(el,'expected block '+ed.innerHTML);assert(getSelection().isCollapsed&&el.contains(getSelection().anchorNode),'caret in block');
            assert(el.textContent==='','marker fully removed: '+el.textContent);
            if(${JSON.stringify(marker)}==='---')assert(ed.querySelector('hr'),'divider');`, marker);
    }
    await test('inline checkbox syntax stays text', `reset('<p>inline []</p>','p',9);ed.dispatchEvent(new InputEvent('input',{bubbles:true}));assert(!ed.querySelector('.todo-item'),'inline converted');`);
    await test('plain root text and inline formatting keep trailing content', `
        reset('# suffix',null,2);ed.dispatchEvent(new InputEvent('input',{bubbles:true}));
        assert(ed.querySelector('h1')?.textContent==='suffix','root heading content');
        reset('<p><b>## </b><i>suffix</i></p>','b',3);ed.dispatchEvent(new InputEvent('input',{bubbles:true}));
        assert(ed.querySelector('h2 i')?.textContent==='suffix','formatted suffix');
        assert(getSelection().anchorOffset===0,'caret starts at zero');`);
    await test('ordered expansion joins previous list', `reset('<ol><li>first</li></ol><p>1. </p>','p',3);ed.dispatchEvent(new InputEvent('input',{bubbles:true}));assert(ed.children.length===1&&ed.querySelectorAll('li').length===2,'join list');`);
    await test('table text and IME composition do not expand', `reset('<table><tbody><tr><td># </td></tr></tbody></table>','td',2);ed.dispatchEvent(new InputEvent('input',{bubbles:true}));assert(!ed.querySelector('h1'),'table conversion');reset('<p># </p>','p',2);ed.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));assert(!ed.querySelector('h1'),'composing conversion');`);
    await test('empty middle list item Backspace becomes paragraph', `reset('<ul><li>first</li><li><br></li><li>last</li></ul>','li:nth-child(2)');key('Backspace');assert(ed.children.length===3&&ed.children[1].tagName==='P','list split');assert(ed.textContent==='firstlast','text preserved');`);
    await test('empty first list item Enter leaves no empty list', `reset('<ul><li><br></li><li>last</li></ul>','li');key('Enter');assert(ed.firstElementChild.tagName==='P'&&ed.children.length===2,'list exit');`);
    await test('list Enter splits selected text', `reset('<ul><li>abcd</li></ul>','li',1);getSelection().extend(ed.querySelector('li').firstChild,3);key('Enter');assert(ed.querySelectorAll('li').length===2&&ed.textContent==='ad','selection replaced');`);
    await test('empty quote Backspace becomes paragraph', `reset('<blockquote><br></blockquote>','blockquote');key('Backspace');assert(ed.firstElementChild.tagName==='P','quote exit');`);
    await test('empty heading Backspace becomes paragraph', `reset('<h2><br></h2>','h2');key('Backspace');assert(ed.firstElementChild.tagName==='P','heading exit');`);
    await test('todo Enter splits and empty Enter exits', `reset('<p>[] </p>','p',3);ed.dispatchEvent(new InputEvent('input',{bubbles:true}));const text=ed.querySelector('.todo-text');text.textContent='abcd';getSelection().collapse(text.firstChild,2);key('Enter');assert(ed.querySelectorAll('.todo-item').length===2&&ed.lastElementChild.querySelector('.todo-text').textContent==='cd','split todo');ed.lastElementChild.querySelector('.todo-text').textContent='';getSelection().collapse(ed.lastElementChild.querySelector('.todo-text'),0);key('Enter');assert(ed.lastElementChild.tagName==='P','exit todo');`);
    await test('global context suppression', `for(const el of [ed,document.getElementById('tabs-list'),document.body])assert(!el.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})),'context default enabled');`);
    await test('bubble toolbar keeps selection', `reset('<p>selected</p>','p');getSelection().extend(ed.firstChild.firstChild,8);const btn=document.querySelector('.bubble-btn');assert(!btn.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true})),'blur allowed');assert(getSelection().toString()==='selected','selection lost');`);
    await test('block drag moves and autosaves, then cleans indicator', `
        reset('<p>first</p><p>second</p><p>third</p>','p');
        ed.firstChild.dispatchEvent(new MouseEvent('mousemove',{bubbles:true}));
        const handle=document.getElementById('block-drag-handle');handle.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));assert(handle.draggable,'handle draggable');
        const transfer=new DataTransfer();handle.dispatchEvent(new DragEvent('dragstart',{dataTransfer:transfer,bubbles:true}));
        const target=ed.lastChild,rect=target.getBoundingClientRect();
        target.dispatchEvent(new DragEvent('dragover',{dataTransfer:transfer,clientY:rect.bottom-1,bubbles:true,cancelable:true}));
        assert(!document.querySelector('.block-drop-line').classList.contains('hidden'),'indicator visible');
        target.dispatchEvent(new DragEvent('drop',{dataTransfer:transfer,clientY:rect.bottom-1,bubbles:true,cancelable:true}));
        assert(ed.textContent==='secondthirdfirst','block order');assert(document.querySelector('.block-drop-line').classList.contains('hidden'),'indicator cleared');
        await new Promise(r=>setTimeout(r,900));assert(testIPC.some(m=>m.action==='save_note'),'autosave');`);
    await test('AI endpoint, Bearer header and exact API errors', `
        window.fetch=async(url,options)=>{window.lastRequest={url,options};return new Response(JSON.stringify({error:{message:'Exact API error '+'.'.repeat(150)}}),{status:404})};
        ed.focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'j',ctrlKey:true,bubbles:true}));
        // The application shortcut is registered on window.
        if(document.getElementById('ai-prompt-bar').classList.contains('hidden'))window.dispatchEvent(new KeyboardEvent('keydown',{key:'j',ctrlKey:true,bubbles:true}));
        document.getElementById('ai-prompt-input').value='test';document.getElementById('btn-run-ai').click();
        await new Promise(r=>setTimeout(r,50));
        assert(lastRequest.url==='https://generativelanguage.googleapis.com/v1beta/openai/chat/completions','endpoint');
        assert(lastRequest.options.headers.Authorization==='Bearer AQ.test','Bearer key');
        assert(document.getElementById('toast').textContent.includes('Exact API error '+'.'.repeat(150)),'full error');`);
    await test('successful AI response inserts and autosaves', `
        reset('<p>before</p>','p',6);testIPC.length=0;
        window.fetch=async()=>new Response(JSON.stringify({choices:[{message:{content:'AI response'}}]}),{status:200});
        document.getElementById('ai-prompt-input').value='test';document.getElementById('btn-run-ai').click();
        await new Promise(r=>setTimeout(r,400));
        assert(ed.textContent.includes('AI response'),'response inserted');
        assert(testIPC.some(m=>m.action==='save_note'&&m.payload.markdown.includes('AI response')),'response saved');`);
    await test('slash-menu todos have working checkboxes and editable caret', `
        reset('<p>/</p>','p',0);key('/');getSelection().collapse(ed.firstChild.firstChild,1);await new Promise(r=>setTimeout(r,50));
        document.querySelector('#slash-menu [data-command="todo"]').click();
        const text=ed.querySelector('.todo-text'),check=ed.querySelector('.todo-check');
        assert(text&&check,'todo markup');assert(text.contains(getSelection().anchorNode),'todo caret');
        check.click();assert(ed.querySelector('.todo-item').classList.contains('checked'),'checkbox handler');`);
    let html = await readFile(join(root, 'index.html'), 'utf8');
    const override = process.argv.find(arg=>arg.startsWith('--editor-script='));
    const app = await readFile(override ? override.slice(16) : join(root, 'editor.js'), 'utf8');
    const css = await readFile(join(root, 'style.css'), 'utf8');
    const setup = `window.testIPC=[];window.chrome=window.chrome||{};window.chrome.webview={postMessage:m=>testIPC.push(JSON.parse(m)),addEventListener:()=>{}};`;
    html = html.replace(/<link[^>]+href="style.css[^>]*>/, () => `<style>${css}</style>`)
        .replace(/<script src="editor.js[^>]*><\/script>/, () => `<script>${setup}</script><script>${app}</script>`);
    server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const candidatePaths = [
        process.env.EDGE_PATH,
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Google/Chrome/Application/chrome.exe'
    ].filter(Boolean);
    const edgeExe = candidatePaths.find(p => existsSync(p)) || 'msedge';
    edge=spawn(edgeExe,[
        '--headless=new','--disable-gpu','--no-first-run',`--user-data-dir=${profile}`,
        '--remote-debugging-port=0','about:blank'
    ],{windowsHide:true,stdio:'ignore'});
    let port;
    for(let i=0;i<100;++i){
        try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];break}
        catch{await new Promise(r=>setTimeout(r,100))}
    }
    if(!port)throw Error('Edge debugging endpoint unavailable');
    const targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await once(ws,'open');
    let id=0, dragData;const pending=new Map();
    ws.addEventListener('message',({data})=>{const msg=JSON.parse(data);if(msg.method==='Input.dragIntercepted')dragData=msg.params.data;if(msg.id){const p=pending.get(msg.id);pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)}});
    const cdp=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
    const evaluate=async expression=>{
        const result=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
        if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
        return result.result.value;
    };
    await cdp('Page.enable');
    await cdp('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/`});
    for(let i=0;i<100;++i){
        if(await evaluate('Boolean(window.testIPC?.some(m=>m.action==="request_init"))'))break;
        await new Promise(r=>setTimeout(r,50));
    }
    await evaluate(`window.ed=document.getElementById('editor');
        window.assert=(ok,msg)=>{if(!ok)throw Error(msg)};
        window.reset=(html,selector,offset=0)=>{ed.innerHTML=html;const el=ed.querySelector(selector)||ed;el.focus();getSelection().collapse(el.firstChild||el,offset)};
        window.key=k=>ed.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));`);
    let failed=0;
    for(const {name,source,input} of tests){
        try{
            if(input!==undefined){await evaluate("reset('<p><br></p>','p')");for(const ch of input)await cdp('Input.insertText',{text:ch})}
            await evaluate(`(async()=>{${source}})()`);console.log('PASS '+name);
        }catch(e){++failed;console.error('FAIL '+name+': '+e.message)}
    }
    try {
        await evaluate("reset('<p>first</p><p>second</p><p>third</p>','p')");
        await evaluate("window.dragTrace=[];for(const type of ['mousedown','dragstart','dragend'])document.addEventListener(type,e=>dragTrace.push([type,e.target.id||e.target.tagName,e.defaultPrevented]),true)");
        const first=await evaluate('(()=>{const r=ed.firstChild.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
        await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',...first});
        const handle=await evaluate('(()=>{const r=document.getElementById("block-drag-handle").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
        const target=await evaluate('(()=>{const r=ed.lastChild.getBoundingClientRect();return {x:r.x+r.width/2,y:r.bottom-1}})()');
        await cdp('Input.setInterceptDrags',{enabled:true});
        await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',...handle});
        await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...handle,button:'left',clickCount:1});
        await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:handle.x+5,y:handle.y+5,buttons:1,button:'left'});
        await cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:handle.x+30,y:handle.y+30,buttons:1,button:'left'});
        for(let i=0;i<20&&!dragData;++i)await new Promise(r=>setTimeout(r,50));
        if(!dragData)throw Error('Native handle drag did not start: '+JSON.stringify(await evaluate('dragTrace')));
        await cdp('Input.dispatchDragEvent',{type:'dragEnter',...target,data:dragData});
        await cdp('Input.dispatchDragEvent',{type:'dragOver',...target,data:dragData});
        await cdp('Input.dispatchDragEvent',{type:'drop',...target,data:dragData});
        await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...target,button:'left',clickCount:1});
        await evaluate("assert(ed.textContent==='secondthirdfirst','native drag order')");
        console.log('PASS native mouse drag from gutter handle');
    } catch(e) { ++failed;console.error('FAIL native mouse drag from gutter handle: '+e.message); }
    console.log(`${tests.length+1-failed} passed, ${failed} failed`);process.exitCode=failed?1:0;
    await cdp('Browser.close').catch(()=>{});
} finally {
    ws?.close();edge?.kill();server?.close();
    await new Promise(r=>setTimeout(r,300));
    await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{});
}

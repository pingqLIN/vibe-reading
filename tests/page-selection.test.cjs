'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const pageSource = fs.readFileSync(path.join(root,'page-selection.js'),'utf8');
const viewerSource = fs.readFileSync(path.join(root,'viewer.js'),'utf8');
const sourceContext = {globalThis:{}};
vm.runInNewContext(pageSource,sourceContext);
const api = sourceContext.globalThis.VibePageSelection;

test('single pages, comma lists and overlapping ranges are parsed exactly',()=>{
  assert.deepEqual([...api.parse('1',110)],[1]);
  assert.deepEqual([...api.parse('1,3,4,78,102',110)],[1,3,4,78,102]);
  assert.deepEqual([...api.parse('2-20',110)],Array.from({length:19},(_,i)=>i+2));
  assert.deepEqual([...api.parse('2-5,6-10',110)],[2,3,4,5,6,7,8,9,10]);
  assert.deepEqual([...api.parse('3,1-3,2,4',10)],[3,1,2,4]);
  assert.deepEqual([...api.parse(' 1 ， 3 、 5–6 ',10)],[1,3,5,6]);
});
test('malformed, reversed, out-of-range or empty page expressions fail',()=>{
  for(const item of ['', '0', '2-1', '1-0', '1,,3', '1,', ',1',
    '1-', '-3', 'abc', '1a', '1.2', '1-20', '11', '1--3',
    '99999999999999999999999']) {
    assert.throws(()=>api.parse(item,10),/頁碼|範圍|PDF/,item);
  }
  assert.throws(()=>api.parse('1',0),/PDF/);
});
test('selected-page intersection handles cross-page merged paragraphs once',()=>{
  const paras=[
    {page:1,text:'first',parts:[{page:1}]},
    {page:2,text:'cross page',parts:[{page:2},{page:3}]},
    {page:3,text:'third',parts:[{page:3}]},
    {page:4,text:'legacy without parts'},
  ];
  assert.deepEqual(Array.from(api.selectIndices(paras,api.parse('3',4))),[1,2]);
  assert.deepEqual(Array.from(api.selectIndices(paras,api.parse('2-3',4))),[1,2]);
  assert.deepEqual(Array.from(api.selectIndices(paras,api.parse('4',4))),[3]);
  assert.deepEqual(Array.from(api.selectIndices(paras,null)),[0,1,2,3]);
});
test('viewer preserves the normal full-document default and loads selector before runtime',()=>{
  const html=fs.readFileSync(path.join(root,'viewer.html'),'utf8');
  assert.match(html,/<option value="all">全部頁面（預設）<\/option>/);
  assert.match(html,/<option value="selected">指定頁碼／範圍<\/option>/);
  assert.ok(html.indexOf('src="page-selection.js"')<html.indexOf('src="viewer.js"'));
});
function harness(expression,paras){
  const at=viewerSource.indexOf('function selectedTranslationIndices()');
  const end=viewerSource.indexOf('// ─── AI Summary',at);
  assert.ok(at>0&&end>at);
  const seen={created:[],filled:[],statuses:[],initCalls:0,validated:[],errors:[],cleared:0};
  const results={innerHTML:'Previously translated output'};
  const els={
    pageSelectionMode:{value:'selected'},
    pageSelectionInput:{value:expression,setCustomValidity(t){seen.validated.push(t);},reportValidity(){}},
    results,progressWrap:{style:{display:'none'}},
    targetLang:{value:'zh-TW'},aiBadge:{textContent:'',className:''},
  };
  const ctx={
    window:{VibePageSelection:api},els,
    pdfDoc:{numPages:12},paragraphs:paras,detectedSource:'en',
    abortCtrl:null,translatorObj:null,segEls:null,summaryDone:true,
    AbortController,
    clearError(){seen.cleared++;},
    showError(t){seen.errors.push(t);},
    setStatus(s){seen.statuses.push(s);},
    setProgress(){},
    setIndeterminate(){},
    swapButtons(){},
    engineLabel(){return 'mock';},
    initTranslator:async()=>{seen.initCalls++;return {type:'lm'};},
    doTranslate:async(_engine,t)=>'TRANSLATED:'+t,
    appendSegment:(_para,idx)=>{seen.created.push(idx);return {idx};},
    fillTranslation:(shell,t,isError)=>{seen.filled.push({idx:shell.idx,text:t,isError});},
    generateSummary(){throw Error('summary disabled for test');},
    isDownloadGestureError(){return false},
  };
  vm.runInNewContext(viewerSource.slice(at,end),ctx);
  return {ctx,seen,els,run:()=>vm.runInNewContext('startTranslation(true)',ctx)};
}
test('integration: selected cross-page paragraph translated once with original index',async()=>{
  const h=harness('3,3,4',[
    {page:1,text:'one',parts:[{page:1}]},
    {page:2,text:'over two pages',parts:[{page:2},{page:3}]},
    {page:4,text:'four',parts:[{page:4}]}
  ]);
  await h.run();
  assert.deepEqual(h.seen.created,[1,2]);
  assert.deepEqual(h.seen.filled.map(x=>x.idx),[1,2]);
  assert.equal(h.seen.initCalls,1);
  assert.equal(h.seen.errors.length,0);
  assert.equal(h.ctx.abortCtrl,null);
});
test('integration: invalid input cannot clear results or initialize model session',async()=>{
  const h=harness('999',[{page:1,text:'one'}]);
  await h.run();
  assert.equal(h.els.results.innerHTML,'Previously translated output');
  assert.equal(h.seen.initCalls,0);
  assert.equal(h.seen.cleared,0);
  assert.equal(h.seen.filled.length,0);
  assert.match(h.seen.errors[0],/頁碼/);
});
test('integration: cancelled async translation does not write a late result',async()=>{
  const h=harness('2',[{page:2,text:'async',parts:[{page:2}]}]);
  let resolve;
  h.ctx.doTranslate=()=>new Promise(r=>{resolve=r;});
  const running=h.run();
  // Yield to initTranslator and the worker before cancelling.
  for(let i=0;i<12&&!resolve;i++)await Promise.resolve();
  assert.equal(typeof resolve,'function');
  h.ctx.abortCtrl.abort();
  resolve('too late');
  await running;
  assert.equal(h.seen.filled.length,0);
  assert.equal(h.ctx.abortCtrl,null);
});

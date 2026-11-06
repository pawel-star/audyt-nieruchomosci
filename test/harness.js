// Uruchamia skrypt z index.html w node z atrapami DOM. Eksportuje fabrykę świeżego kontekstu.
// Użycie: const {fresh}=require('./harness.js'); const t=fresh('ścieżka/do/index.html'); t.run('viewStart()');
const fs=require('fs'), vm=require('vm');
function extract(htmlPath){
  const h=fs.readFileSync(htmlPath,'utf8');
  const i=h.indexOf('<script>\n'); const j=h.lastIndexOf('</script>');
  if(i<0||j<0)throw new Error('brak bloku script');
  return h.slice(i+'<script>\n'.length,j);
}
function makeEl(id){
  const el={id,value:'',innerHTML:'',textContent:'',style:{},dataset:{},children:[],
    classList:{_s:new Set(),add(c){this._s.add(c)},remove(c){this._s.delete(c)},toggle(c,f){(f===undefined?!this._s.has(c):f)?this._s.add(c):this._s.delete(c)},contains(c){return this._s.has(c)}},
    setAttribute(){},getAttribute(){return null},appendChild(c){return c},removeChild(){},addEventListener(){},
    querySelector(){return null},querySelectorAll(){return []},focus(){},select(){},click(){},scrollIntoView(){},
    getBoundingClientRect(){return {top:0,left:0,width:0,height:0}},insertAdjacentHTML(){} };
  return el;
}
function fresh(htmlPath,opts={}){
  const els={};
  const alerts=[];
  const store={};
  const document={
    getElementById(id){return els[id]||(els[id]=makeEl(id));},
    createElement(t){return makeEl('_'+t);},
    querySelector(s){const m=/^#([\w-]+)$/.exec(s);return m?document.getElementById(m[1]):makeEl(s);},querySelectorAll(){return []},
    body:makeEl('body'),documentElement:makeEl('html'),addEventListener(){},execCommand(){return true},
  };
  const localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
  const ctx={document,localStorage,console,alerts,
    alert:m=>alerts.push(String(m)),confirm:()=>true,prompt:()=>null,
    setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,
    navigator:{clipboard:{writeText:()=>Promise.resolve()},userAgent:'node'},
    location:{protocol:'file:',href:'file:///index.html',hash:'',search:''},
    fetch:()=>Promise.reject(new Error('offline')),
    URL:{createObjectURL:()=>'blob:',revokeObjectURL(){}},Blob:function(){},FileReader:function(){},
    L:new Proxy(function(){},{get:()=>new Proxy(function(){},{get:(t,k)=>k==='then'?undefined:(()=>ctx.L),apply:()=>ctx.L})}),
    atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),
    Math,Date,JSON,Promise,Object,Array,String,Number,Boolean,RegExp,Error,Set,Map,Int16Array,Uint8Array,Float32Array,Float64Array,
  };
  ctx.window=ctx; ctx.self=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(extract(htmlPath),ctx,{filename:'index.script.js'});
  const run=code=>vm.runInContext(code,ctx);
  return {ctx,run,els,alerts,store};
}
module.exports={fresh,extract};

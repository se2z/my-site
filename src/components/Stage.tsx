'use client';
import dynamic from 'next/dynamic';
import {Component,useCallback,useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {useReducedMotion} from 'motion/react';
import type {Category,CompanyConfig} from '@/lib/domain';
import type {SpeechAnchor} from './Scene';
import {Icon} from './ui';
const Scene=dynamic(()=>import('./Scene'),{ssr:false});
const LiquidControl=dynamic(()=>import('./LiquidControl'),{ssr:false});
class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode},{error:boolean}>{state={error:false};static getDerivedStateFromError(){return {error:true};}render(){return this.state.error?this.props.fallback:this.props.children;}}
const lines:Record<Exclude<Category,'other'>,string>={sofa:'Крошки — не часть моей обивки.',armchair:'Я держусь. Но пятна уже наглеют.',mattress:'Мне бы чистку. А потом — спать.',chair:'Я за чистоту. Сижу на своём.'};
export default function Stage({category,character='plush',quotes=false,reset:externalReset=0,cleaning=false,onProgress}:{category:Category;character?:CompanyConfig['character'];quotes?:boolean;reset?:number;cleaning?:boolean;onProgress?:(n:number)=>void}){
  const [readyKey,setReadyKey]=useState(''),[reset,setReset]=useState(0),[attempt,setAttempt]=useState(0),[support,setSupport]=useState<boolean|null>(null);const reduced=useReducedMotion();
  const wrap=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null),quote=useRef<HTMLParagraphElement>(null),tether=useRef<SVGSVGElement>(null),path=useRef<SVGPathElement>(null),dot=useRef<SVGCircleElement>(null);
  const metrics=useRef({left:0,top:0,width:0,height:0,quoteWidth:210,quoteHeight:48});
  useEffect(()=>{try{const c=document.createElement('canvas');setSupport(!!(c.getContext('webgl2')||c.getContext('webgl')));}catch{setSupport(false);}},[]);
  useEffect(()=>{if(category==='other')setReadyKey('');},[category]);
  useLayoutEffect(()=>{const measure=()=>{if(!wrap.current||!surface.current)return;const stage=wrap.current.getBoundingClientRect(),canvas=surface.current.getBoundingClientRect(),bubble=quote.current?.getBoundingClientRect();metrics.current={left:canvas.left-stage.left,top:canvas.top-stage.top,width:stage.width,height:stage.height,quoteWidth:bubble?.width??210,quoteHeight:bubble?.height??48};};measure();const observer=new ResizeObserver(measure);for(const n of [wrap.current,surface.current,quote.current])if(n)observer.observe(n);return ()=>observer.disconnect();},[support,readyKey,quotes,category]);
  const onReady=useCallback((key:string)=>setReadyKey(key),[]);
  const onAnchor=useCallback((anchor:SpeechAnchor)=>{
    if(!quote.current||!tether.current||!path.current||!dot.current)return;
    const m=metrics.current,x=anchor.x+m.left,y=anchor.y+m.top;
    let bx=Math.max(16,Math.min(m.width-m.quoteWidth-16,x-m.quoteWidth/2));
    const modelTop=anchor.top+m.top;
    const by=Math.max(12,Math.min(modelTop-m.quoteHeight-14,y-m.quoteHeight-32));
    if(by<76&&bx+m.quoteWidth>m.width-76)bx=Math.max(16,m.width-m.quoteWidth-76);
    const startX=Math.max(bx+18,Math.min(bx+m.quoteWidth-18,x)),startY=by+m.quoteHeight-1;
    quote.current.style.transform=`translate3d(${bx}px,${by}px,0)`;quote.current.style.opacity=String(anchor.opacity);quote.current.dataset.anchorX=x.toFixed(1);quote.current.dataset.anchorY=y.toFixed(1);quote.current.dataset.modelTop=modelTop.toFixed(1);
    tether.current.style.opacity=String(anchor.opacity);path.current.setAttribute('d',`M ${startX} ${startY} C ${startX} ${startY+16},${x} ${y-18},${x} ${y}`);dot.current.setAttribute('cx',String(x));dot.current.setAttribute('cy',String(y));
  },[]);
  if(category==='other')return <div className="other-stage"><span className="other-dot"><Icon name="other"/></span><h2>Нестандартная мебель</h2><p>Опишите предмет — стоимость оценим по фотографиям.</p></div>;
  const key=category+'-'+character,ready=readyKey===key,displayed=readyKey.split('-')[0] as Exclude<Category,'other'>,displayedCharacter=readyKey.split('-')[1];
  const line=displayed==='sofa'&&displayedCharacter==='sleepy'?'Сначала чистка. Потом вздремнём.':displayed==='sofa'&&displayedCharacter==='wink'?'Обнимемся? После чистки.':lines[displayed]??lines[category];
  const poster=<img className="poster" src={`/posters/${category}-clean-front.webp`} width={800} height={600} alt="Предмет мебели"/>;
  return <div ref={wrap} className="scene-wrap" aria-busy={!ready&&support!==false}>
    {support===false&&poster}
    {support&&<SceneBoundary key={attempt} fallback={<div className="scene-error">{poster}<button className="link" onClick={()=>{setReadyKey('');setAttempt(n=>n+1);}}>Повторить загрузку 3D</button></div>}><div ref={surface} className="scene" style={{opacity:0}}><Scene category={category} character={character} reset={reset+externalReset} reduced={!!reduced} onReady={onReady} surface={surface} onAnchor={quotes&&character!=='off'?onAnchor:undefined} cleaning={cleaning} onProgress={onProgress}/></div></SceneBoundary>}
    {quotes&&character!=='off'&&<><svg ref={tether} className="quote-tether" aria-hidden="true"><path ref={path}/><circle ref={dot} r="2.5"/></svg><p ref={quote} className="character-quote" style={{opacity:0}}>{line}</p></>}
    {!cleaning&&<div className="reset-wrap"><LiquidControl><button className="reset" aria-label="Вернуть ракурс" title="Вернуть ракурс" onClick={()=>setReset(n=>n+1)}><Icon name="refresh"/></button></LiquidControl></div>}
    {!ready&&support!==false&&<span className="loading-model" role="status"><span className="model-loader" aria-hidden="true"/>Готовим 3D…</span>}
  </div>;
}

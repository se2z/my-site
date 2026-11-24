'use client';
import {Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState,useCallback,type RefObject} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {ContactShadows,OrbitControls,useGLTF} from '@react-three/drei';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {AnimationMixer,Box3,Group,LoopOnce,Mesh,PerspectiveCamera,Vector3,CanvasTexture,SRGBColorSpace,MeshStandardMaterial} from 'three';
import type {OrbitControls as Controls} from 'three-stdlib';
import type {Category,CompanyConfig} from '@/lib/domain';
const greeted=new Set<string>();
const cameraOptions={position:[3,2.2,5] as [number,number,number],fov:36};
const rendererOptions={antialias:true,alpha:true,powerPreference:'high-performance' as const};
// Supersample standard displays too; the small, on-demand scene stays crisp at browser zoom.
const pixelRatio:[number,number]=[2,2.5];
type Model={category:Exclude<Category,'other'>;character:CompanyConfig['character']};
export type SpeechAnchor={x:number;y:number;top:number;opacity:number};
type Props=Model&{reset:number;reduced:boolean;onReady:(key:string)=>void;surface:RefObject<HTMLDivElement|null>;onAnchor?:(anchor:SpeechAnchor)=>void;cleaning?:boolean;onProgress?:(n:number)=>void};
const modelKey=(model:Model)=>model.category+'-'+model.character;
const modelPath=({category,character}:Model)=>category==='sofa'&&['sleepy','wink'].includes(character)?`/models/sofa-${character}.glb`:`/models/${category}-character.glb`;
function PrepareAsset({model,onPrepared}:{model:Model;onPrepared:(key:string)=>void}){
  const gltf=useGLTF(modelPath(model));const {gl,camera,scene}=useThree();const key=modelKey(model);
  useEffect(()=>{let current=true;gl.compileAsync(gltf.scene,camera,scene).then(()=>{if(current)onPrepared(key);}).catch(()=>{if(current)onPrepared(key);});return ()=>{current=false;};},[gltf.scene,gl,camera,scene,key,onPrepared]);
  return null;
}
function fitCamera(camera:PerspectiveCamera,bounds:Box3,width:number,height:number){
  if(!width||!height)return;
  const center=bounds.getCenter(new Vector3()),direction=new Vector3(.43,.3,1).normalize(),right=new Vector3().crossVectors(new Vector3(0,1,0),direction).normalize(),up=new Vector3().crossVectors(direction,right).normalize();
  const vertical=Math.tan(camera.fov*Math.PI/360),horizontal=vertical*width/height;let distance=0;
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const relative=new Vector3(x,y,z).sub(center),depth=relative.dot(direction);
    distance=Math.max(distance,depth+Math.abs(relative.dot(right))/horizontal,depth+Math.abs(relative.dot(up))/vertical);
  }
  camera.position.copy(direction.multiplyScalar(distance*1.18).add(center));camera.lookAt(center);camera.userData.target=center.toArray();camera.updateProjectionMatrix();
}
function Furniture({model,reduced,prepared,shown,onReady,onHidden,onFit,surface,onAnchor,cleaning,onProgress}:{model:Model;reduced:boolean;prepared:boolean;shown:boolean;onReady:(key:string)=>void;onHidden:(key:string)=>void;onFit:()=>void;surface:Props['surface'];onAnchor?:Props['onAnchor'];cleaning?:boolean;onProgress?:(n:number)=>void}){
  const path=modelPath(model),key=modelKey(model),gltf=useGLTF(path);const {invalidate,camera,size,gl}=useThree();const root=useRef<Group>(null);
  useEffect(()=>{const anisotropy=Math.min(8,gl.capabilities.getMaxAnisotropy());gltf.scene.traverse(obj=>{if(!(obj instanceof Mesh))return;for(const material of Array.isArray(obj.material)?obj.material:[obj.material])if(material instanceof MeshStandardMaterial)for(const texture of [material.map,material.normalMap,material.roughnessMap,material.metalnessMap])if(texture&&texture.anisotropy!==anisotropy){texture.anisotropy=anisotropy;texture.needsUpdate=true;}});invalidate();},[gltf.scene,gl,invalidate]);
  const remaining=useRef(0),welcome=useRef(false),brush=useRef(false),lastPaint=useRef<{x:number;y:number}|null>(null),reveal=useRef({value:reduced?1:0,velocity:0}),waveStarted=useRef(false);
  const {scene,bounds,face,faceNormal,faceFound}=useMemo(()=>{
    const scene=clone(gltf.scene);scene.traverse(obj=>{if(obj instanceof Mesh){obj.castShadow=true;obj.receiveShadow=true;if(model.character==='off'&&/Character|Greeting/.test(obj.name))obj.visible=false;}});
    const box=new Box3().setFromObject(scene),center=box.getCenter(new Vector3()),dims=box.getSize(new Vector3()),factor=2.8/Math.max(dims.x,dims.z);
    scene.scale.setScalar(factor);scene.position.set(-center.x*factor,-box.min.y*factor,-center.z*factor);
    scene.updateMatrixWorld(true);const bounds=new Box3().setFromObject(scene),eyes=new Box3(),openEyes=new Box3(),pupils=new Box3();
    scene.traverse(obj=>{if(obj instanceof Mesh){if(/soft[\s_]*eye/i.test(obj.name)){const box=new Box3().setFromObject(obj);eyes.union(box);openEyes.union(box);}else if(/relaxed[\s_]*closed[\s_]*eye/i.test(obj.name))eyes.union(new Box3().setFromObject(obj));if(/centered[\s_]*pupil/i.test(obj.name))pupils.union(new Box3().setFromObject(obj));}});
    const face=eyes.isEmpty()?bounds.getCenter(new Vector3()):eyes.getCenter(new Vector3());const faceNormal=pupils.isEmpty()||openEyes.isEmpty()?new Vector3(0,0,1):pupils.getCenter(new Vector3()).sub(openEyes.getCenter(new Vector3())).normalize();
    face.y+=eyes.isEmpty()?.12:eyes.getSize(new Vector3()).y*.7;
    return {scene,bounds,face,faceNormal,faceFound:!eyes.isEmpty()};
  },[gltf.scene,model.character]);
  const mixer=useMemo(()=>new AnimationMixer(scene),[scene]);const game=!!onProgress;
  const dirt=useMemo(()=>{
    if(!game)return null;const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const context=canvas.getContext('2d')!;
    context.clearRect(0,0,512,512);for(const [x,y,r] of [[130,180,75],[355,155,65],[270,360,90]]){const g=context.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(92,62,32,.9)');g.addColorStop(.6,'rgba(92,62,32,.8)');g.addColorStop(1,'rgba(92,62,32,0)');context.fillStyle=g;context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fill();}
    const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;const meter=document.createElement('canvas');meter.width=meter.height=64;const meterContext=meter.getContext('2d')!;meterContext.drawImage(canvas,0,0,64,64);const initial=meterContext.getImageData(0,0,64,64).data.reduce((s,v,i)=>i%4===3?s+v:s,0);return {canvas,context,texture,initial,meter,meterContext};
  },[game]);
  useEffect(()=>{
    const meshes:Mesh[]=[],overlays:Mesh[]=[];scene.traverse(obj=>{if(obj instanceof Mesh)meshes.push(obj);});
    for(const obj of meshes)if(dirt&&obj.geometry.attributes.uv1){const geometry=obj.geometry.clone();geometry.setAttribute('uv',geometry.attributes.uv1.clone());const material=new MeshStandardMaterial({color:'#765037',map:dirt.texture,transparent:true,opacity:.85,roughness:.95,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});const overlay=new Mesh(geometry,material);overlay.name='Cleaning surface';obj.add(overlay);overlays.push(overlay);}
    if(dirt)dirt.texture.needsUpdate=true;gl.domElement.dataset.cleanableMeshes=String(overlays.length);gl.domElement.dataset.model=model.category;gl.domElement.dataset.modelKey=key;gl.domElement.dataset.reveal='preparing';gl.domElement.dataset.speechAnchor=faceFound?'face':'bounds';
    const timer=setInterval(()=>{if(reduced||model.character==='off'||document.hidden)return;const blink=gltf.animations.find(a=>a.name==='GentleBlink');if(blink){const action=mixer.clipAction(blink);action.reset().setLoop(LoopOnce,1).play();remaining.current=blink.duration;invalidate();}},14000);
    return ()=>{clearInterval(timer);mixer.stopAllAction();mixer.uncacheRoot(scene);for(const overlay of overlays){overlay.removeFromParent();overlay.geometry.dispose();(overlay.material as MeshStandardMaterial).dispose();}dirt?.texture.dispose();};
  },[scene,mixer,model.category,model.character,key,reduced,dirt,gltf.animations,gl,invalidate,faceFound]);
  useLayoutEffect(()=>{fitCamera(camera as PerspectiveCamera,bounds,size.width,size.height);onFit();invalidate();},[camera,bounds,size.width,size.height,onFit,invalidate]);
  useEffect(()=>{if(!prepared)return;invalidate();const frame=requestAnimationFrame(()=>onReady(key));return ()=>cancelAnimationFrame(frame);},[prepared,key,onReady,invalidate]);
  useEffect(()=>{invalidate();},[shown,reduced,invalidate]);
  const projected=useMemo(()=>new Vector3(),[]),worldFace=useMemo(()=>new Vector3(),[]),worldNormal=useMemo(()=>new Vector3(),[]),toCamera=useMemo(()=>new Vector3(),[]);
  const silhouette=useMemo(()=>[bounds.min.x,bounds.max.x].flatMap(x=>[bounds.min.y,bounds.max.y].flatMap(y=>[bounds.min.z,bounds.max.z].map(z=>new Vector3(x,y,z)))),[bounds]);
  const projectedCorner=useMemo(()=>new Vector3(),[]);
  useFrame((_,delta)=>{
    const state=reveal.current,target=shown?1:0,step=Math.min(delta,.04),omega=shown?11:24;
    if(reduced){state.value=target;state.velocity=0;}else if(Math.abs(state.value-target)>.004||Math.abs(state.velocity)>.004){const offset=state.value-target,c=state.velocity+omega*offset,decay=Math.exp(-omega*step);state.value=target+(offset+c*step)*decay;state.velocity=(state.velocity-omega*c*step)*decay;invalidate();}else{state.value=target;state.velocity=0;}
    const p=Math.max(0,Math.min(1,state.value));if(surface.current)surface.current.style.opacity=String(p);
    if(root.current){root.current.scale.setScalar(.94+.06*p);root.current.position.y=.065*(1-p);root.current.rotation.y=-.09*(1-p);root.current.updateWorldMatrix(true,false);
      if(onAnchor){worldFace.copy(face).applyMatrix4(root.current.matrixWorld);projected.copy(worldFace).project(camera);worldNormal.copy(faceNormal).transformDirection(root.current.matrixWorld);toCamera.copy(camera.position).sub(worldFace).normalize();const facing=worldNormal.dot(toCamera),visibility=Math.max(0,Math.min(1,(facing+.05)/.25));let top=size.height;for(const corner of silhouette){projectedCorner.copy(corner).applyMatrix4(root.current.matrixWorld).project(camera);top=Math.min(top,(1-projectedCorner.y)*size.height/2);}onAnchor({x:(projected.x+1)*size.width/2,y:(1-projected.y)*size.height/2,top,opacity:p*visibility});}
    }
    gl.domElement.dataset.revealProgress=p.toFixed(3);gl.domElement.dataset.reveal=shown?(p===1?'ready':'entering'):'leaving';
    if(!shown&&p===0)onHidden(key);
    if(shown&&p>.85&&!waveStarted.current){waveStarted.current=true;const wave=gltf.animations.find(a=>a.name==='WelcomeWave');if(!reduced&&model.character!=='off'&&wave&&!greeted.has(path)){const action=mixer.clipAction(wave);action.reset().setLoop(LoopOnce,1);action.clampWhenFinished=true;action.play();remaining.current=wave.duration;welcome.current=true;gl.domElement.dataset.greeting='playing';}else{gl.domElement.dataset.greeting=reduced?'reduced':'already-greeted';}}
    if(remaining.current>0){mixer.update(Math.min(delta,.05));remaining.current-=Math.min(delta,.05);if(remaining.current<=0&&welcome.current){greeted.add(path);welcome.current=false;gl.domElement.dataset.greeting='complete';}invalidate();}
  });
  function paint(e:ThreeEvent<PointerEvent>){gl.domElement.dataset.brushHit=e.object.name;gl.domElement.dataset.brushUv=String(!!e.uv1);if(!cleaning||!dirt||!e.uv1||!(e.object instanceof Mesh)||!e.object.geometry.attributes.uv1)return;e.stopPropagation();const x=e.uv1.x*512,y=(1-e.uv1.y)*512;dirt.context.globalCompositeOperation='destination-out';dirt.context.lineWidth=68;dirt.context.lineCap='round';dirt.context.beginPath();dirt.context.moveTo(lastPaint.current?.x??x,lastPaint.current?.y??y);dirt.context.lineTo(x,y);dirt.context.stroke();dirt.context.beginPath();dirt.context.arc(x,y,34,0,Math.PI*2);dirt.context.fill();lastPaint.current={x,y};dirt.texture.needsUpdate=true;dirt.meterContext.clearRect(0,0,64,64);dirt.meterContext.drawImage(dirt.canvas,0,0,64,64);const left=dirt.meterContext.getImageData(0,0,64,64).data.reduce((s,v,i)=>i%4===3?s+v:s,0);onProgress?.(Math.min(100,Math.round((1-left/dirt.initial)*100)));invalidate();}
  return <group ref={root} scale={reduced?1:.94} position={[0,reduced?0:.065,0]} rotation={[0,reduced?0:-.09,0]}><primitive object={scene} onPointerDown={(e:ThreeEvent<PointerEvent>)=>{brush.current=true;lastPaint.current=null;paint(e);}} onPointerMove={(e:ThreeEvent<PointerEvent>)=>{if(brush.current&&e.buttons)paint(e);}} onPointerUp={()=>{brush.current=false;lastPaint.current=null;}}/></group>;
}
function CameraControls({reset,reduced,cleaning,fitId}:{reset:number;reduced:boolean;cleaning?:boolean;fitId:number}){
  const ref=useRef<Controls>(null);const {camera}=useThree();useLayoutEffect(()=>{const controls=ref.current;if(controls&&fitId){controls.target.fromArray(camera.userData.target??[0,.5,0]);controls.update();controls.saveState();}},[camera,fitId]);useEffect(()=>{ref.current?.reset();},[reset]);
  return <OrbitControls ref={ref} makeDefault enablePan={false} enableZoom={false} enabled={!cleaning} enableDamping={!reduced} dampingFactor={.09} minPolarAngle={.55} maxPolarAngle={1.48}/>;
}
export default function Scene(props:Props){
  const requestedKey=modelKey(props),[displayed,setDisplayed]=useState<Model>({category:props.category,character:props.character}),[preparedKey,setPreparedKey]=useState(''),[activeKey,setActiveKey]=useState(''),[shown,setShown]=useState(false),[fitId,setFitId]=useState(0);const displayedKey=modelKey(displayed);
  const prepared=useCallback((key:string)=>setPreparedKey(key),[]),fit=useCallback(()=>setFitId(n=>n+1),[]);
  const ready=useCallback((key:string)=>{setActiveKey(key);props.onReady(key);},[props.onReady]);
  useEffect(()=>{if(requestedKey===displayedKey){setShown(activeKey===displayedKey);return;}setShown(preparedKey!==requestedKey&&activeKey===displayedKey);},[requestedKey,displayedKey,activeKey,preparedKey]);
  const hidden=useCallback((key:string)=>{if(key!==requestedKey&&preparedKey===requestedKey)setDisplayed(current=>modelKey(current)===requestedKey?current:{category:props.category,character:props.character});},[requestedKey,preparedKey,props.category,props.character]);
  return <Canvas aria-label="Интерактивная модель мебели" onCreated={({gl})=>{gl.domElement.dataset.sceneInstance=crypto.randomUUID();}} frameloop="demand" dpr={pixelRatio} camera={cameraOptions} gl={rendererOptions} style={{touchAction:props.cleaning?'none':'pan-y'}}>
    <ambientLight intensity={1.1}/><hemisphereLight args={['#e8f4ff','#576b7d',1.3]}/><directionalLight position={[-3,6,5]} intensity={3.3}/><directionalLight position={[4,3,-3]} intensity={1.2}/>
    <Suspense fallback={null}><PrepareAsset model={props} onPrepared={prepared}/></Suspense>
    <Suspense fallback={null}><Furniture key={displayedKey} model={displayed} reduced={props.reduced} prepared={preparedKey===displayedKey} shown={shown} onReady={ready} onHidden={hidden} onFit={fit} surface={props.surface} onAnchor={props.onAnchor} cleaning={props.cleaning} onProgress={props.onProgress}/></Suspense>
    <ContactShadows position={[0,-.02,0]} opacity={.38} scale={6} blur={2.6} far={3} resolution={512} frames={Infinity}/>
    <CameraControls reset={props.reset} reduced={props.reduced} cleaning={props.cleaning} fitId={fitId}/>
  </Canvas>;
}

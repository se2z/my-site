'use client';
import {useState} from 'react';
import Stage from './Stage';
import {Button,ErrorMessage} from './ui';
import {api} from '@/lib/client';
export default function CleaningGame({token,onFinish,quotes=true}:{token:string;onFinish:()=>Promise<void>;quotes?:boolean}){
  const [mode,setMode]=useState<'clean'|'rotate'>('clean'),[progress,setProgress]=useState(0),[error,setError]=useState(''),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
  async function finish(){setBusy(true);setError('');try{await api('orders/'+token+'/game',{method:'POST',body:JSON.stringify({progress})});setDone(true);await onFinish();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="cleaning-game">{quotes&&<h3>{done?'Крошки сдались. Вы победили!':progress>70?'Ещё чуть-чуть — и можно обниматься.':'Я всё помню. Особенно тот кофе.'}</h3>}<div className="game-stage"><Stage category="sofa" cleaning={mode==='clean'} onProgress={setProgress}/></div><div className="segments"><button aria-pressed={mode==='clean'} onClick={()=>setMode('clean')}>Чистить</button><button aria-pressed={mode==='rotate'} onClick={()=>setMode('rotate')}>Повернуть</button></div><p className="muted small">{mode==='clean'?'Проведите по пятнам на сиденьях.':'Посмотрите на диван с другой стороны.'}</p><progress value={progress} max={100} aria-label="Диван очищен"/><p className="small">{progress}% чистоты</p><ErrorMessage error={error}/>{progress>=95&&!done&&<Button disabled={busy} onClick={finish}>{busy?'Сохраняем…':'Готово!'}</Button>}</div>;
}

'use client';
import LiquidGlass from 'liquid-glass-react';
import type {ReactNode} from 'react';
export default function LiquidControl({children}:{children:ReactNode}){return <div className="liquid-control"><LiquidGlass mode="standard" elasticity={0} displacementScale={14} blurAmount={.08} saturation={110} aberrationIntensity={.02} cornerRadius={22} padding="0" style={{position:'absolute',top:'50%',left:'50%',width:44,height:44}}>{children}</LiquidGlass></div>;}

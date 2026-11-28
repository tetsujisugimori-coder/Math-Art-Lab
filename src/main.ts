import {mountPrimeConstellation} from './prime-constellation-view';
import {mountApollonianBloom} from './apollonian-bloom-view';
import {mountModularHeart} from './modular-heart-view';
import {mountPenrose} from './penrose-view';
import {mountCooperation} from './cooperation-view';
import {mountSegregation} from './segregation-view';
import {mountCobweb} from './cobweb-view';
import {mountRipple} from './ripple-view';
import {mountSand} from './sand-view';
import {mountVoronoi} from './voronoi-view';
import {mountFourier} from './fourier-view';
import {mountReactionDiffusion} from './reaction-diffusion-view';
import {mountFractal} from './fractal-view';
import {mountHarmonograph} from './harmonograph-view';
import {mountGarden} from './garden-view';
import {mountKnot} from './knot-view';
import {mountLorenz} from './lorenz-view';
import {mountTwins} from './twins-view';
import {mountWave} from './wave-view';
import {mountFlowField} from './flow-field-view';
import './style.css';
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML='<nav class="experiment-picker" aria-label="作品の選択"><label for="experiment">作品<select id="experiment"><option value="harmonograph">002 · 光のハーモノグラフ</option><option value="fractal">001 · Fractal × Wave</option><option value="garden">003 · 光の花園</option><option value="knot">004 · 光の結び目</option><option value="lorenz">005 · カオスの蝶</option><option value="twins">006 · フラクタルの双子</option><option value="wave">007 · 波紋の対話</option><option value="flow">008 · 風の軌跡</option><option value="reaction">009 · チューリングの庭</option><option value="fourier">010 · フーリエの万華鏡</option></select></label></nav><div id="experiment-root"></div>';
const host=app.querySelector<HTMLElement>('#experiment-root')!;
const select=app.querySelector<HTMLSelectElement>('#experiment')!;
select.add(new Option('011 · 距離の結晶','voronoi'));
select.add(new Option('012 · 振動の砂絵','sand'));
select.add(new Option('013 · 波紋の万華鏡','ripple'));
select.add(new Option('014 · 需要と供給の蜘蛛の巣','cobweb'));
select.add(new Option('015 · 分断のモザイク','segregation'));
select.add(new Option('016 · 協力の格子','cooperation'));
select.add(new Option('018 · 黄金比の星屑','penrose'));
select.add(new Option('019 · 余りが描く心臓','modular-heart'));
select.add(new Option('020 · 無限に咲く円の花','apollonian-bloom'));
select.add(new Option('021 · 素数の星図','prime-constellation'));
const mounts={fractal:mountFractal,harmonograph:mountHarmonograph,garden:mountGarden,knot:mountKnot,lorenz:mountLorenz,twins:mountTwins,wave:mountWave,flow:mountFlowField,reaction:mountReactionDiffusion,fourier:mountFourier,voronoi:mountVoronoi,sand:mountSand,ripple:mountRipple,cobweb:mountCobweb,segregation:mountSegregation,cooperation:mountCooperation,penrose:mountPenrose,"modular-heart":mountModularHeart,"apollonian-bloom":mountApollonianBloom,"prime-constellation":mountPrimeConstellation};
let dispose:()=>void=()=>{};

function displayMountError(error:unknown) {
  const failure=document.createElement('section');
  failure.className='experiment-failure';
  failure.setAttribute('role','alert');
  const heading=document.createElement('h2');
  heading.textContent='作品を表示できませんでした';
  const message=document.createElement('p');
  message.textContent='この作品の起動に失敗しました。作品メニューから別の作品を選択できます。';
  const detail=document.createElement('p');
  detail.textContent=`原因：${error instanceof Error ? error.message : String(error)}`;
  failure.append(heading,message,detail);
  host.replaceChildren(failure);
}

function mountSelected() {
  const previousDispose=dispose;
  dispose=()=>{};
  try { previousDispose(); } catch(error) { console.error('作品の終了処理に失敗しました',error); }
  host.replaceChildren();
  try {
    dispose=(mounts[select.value as keyof typeof mounts]??mountHarmonograph)(host);
  } catch(error) {
    displayMountError(error);
  }
}

select.addEventListener('change',mountSelected);
mountSelected();
window.addEventListener('pagehide',event=>{
  if(!event.persisted){try{dispose();}catch(error){console.error('作品の終了処理に失敗しました',error);}}
});

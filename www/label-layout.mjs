// All dimensions use the same diagram coordinate system as the tracks.
const FONT='Arial,"Microsoft YaHei",sans-serif';
const fixedBreaks={
 '人民广场':['人民','广场'],'自然博物馆':['自然','博物馆'],
 '一大会址·黄陂南路':['一大会址','黄陂南路'],'一大会址·新天地':['一大会址','新天地'],
 '上海儿童医学中心':['上海儿童','医学中心'],'上海国际旅游度假区':['上海国际','旅游度假区'],
 '蟠祥路·国家会计学院':['蟠祥路','国家会计学院'],
 '浦东1号2号航站楼':['浦东1号2号','航站楼'],
};
const area=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
export function terminalBadges(data){
 const ends=new Map(),stations=new Map(data.stations.map(s=>[s.id,s]));
 for(const b of data.branches){if(b.loop)continue;for(const id of [b.stations[0],b.stations.at(-1)]){if(!ends.has(id))ends.set(id,new Set());ends.get(id).add(b.line)}}
 const result=[];for(const [id,lines] of ends){const [x,y]=stations.get(id).point;const items=[...lines].map(line=>({line,text:{'浦江线':'PJ','市域机场线':'AL','磁浮线':'M'}[line]||line.replace('号线','')}));const width=items.reduce((n,b)=>n+(b.text.length>2?30:24),0)+(items.length-1)*3;let left=x-width/2;for(const item of items){const w=item.text.length>2?30:24;result.push({...item,x:left,y:y-39,w,h:19});left+=w+3}}
 return result;
}
function crossingLength(a,b,r){
 const dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
 for(const [p,q] of [[-dx,a[0]-r.x],[dx,r.x+r.w-a[0]],[-dy,a[1]-r.y],[dy,r.y+r.h-a[1]]]){
  if(!p){if(q<0)return 0;continue}const t=q/p;
  if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return 0;
 }return Math.hypot(dx,dy)*(hi-lo);
}
export function layoutLabels(data){
 const ctx=document.createElement('canvas').getContext('2d');
 const measure=(text,size,weight=400)=>{ctx.font=`${weight} ${size}px ${FONT}`;return ctx.measureText(text).width};
 function englishLines(text,maxWidth=95){
  const lines=[];let line='';for(const word of text.split(/\s+/)){const next=line?line+' '+word:word;if(line&&measure(next,6.8)>maxWidth){lines.push(line);line=word}else line=next}if(line)lines.push(line);return lines;
 }
 const boxes=terminalBadges(data).map(b=>({x:b.x-3,y:b.y-3,w:b.w+6,h:b.h+6})),layouts=new Map(),tracks=[];
 for(const b of data.branches)for(let i=1;i<b.path.length;i++){const a=b.path[i-1],z=b.path[i];tracks.push({a,z,x:Math.min(a[0],z[0])-4,y:Math.min(a[1],z[1])-4,w:Math.abs(a[0]-z[0])+8,h:Math.abs(a[1]-z[1])+8})}
 const major=new Set(['上海火车站','上海南站','虹桥火车站','上海松江站']);
 const sorted=[...data.stations].sort((a,b)=>Number(major.has(b.name))-Number(major.has(a.name))||(b.lines.length>1)-(a.lines.length>1)||Math.hypot(a.point[0]-1671,a.point[1]-1204)-Math.hypot(b.point[0]-1671,b.point[1]-1204));
 for(const s of sorted){
  const name=s.name.replace(/\(原.*?\)/,'').replace(/\(\d+号线\)/,'');
  const cn=fixedBreaks[name]||(name.length<=4?[name]:name.match(/.{1,4}/g));
  const en=englishLines(s.english||s.pinyin);
  const fontSize=major.has(s.name)?14:12.5,weight=major.has(s.name)?650:550;
  const w=Math.max(...cn.map(t=>measure(t,fontSize,weight)),...en.map(t=>measure(t,6.8))),h=cn.length*15.5+en.length*8+1;
  const [x,y]=s.point,nearTracks=tracks.filter(t=>Math.abs(t.x+t.w/2-x)<t.w/2+160&&Math.abs(t.y+t.h/2-y)<t.h/2+160),nearStations=data.stations.filter(t=>t.id!==s.id&&Math.hypot(t.point[0]-x,t.point[1]-y)<180);
  const preferred={0:3,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8}[s.label]||3;
  const dirs=[preferred,...[1,2,3,4,5,6,7,8].filter(d=>d!==preferred)];let best=null,bestScore=Infinity;
  for(const gap of [10,17,26,38,54,72])for(const dir of dirs){
   let bx=x-w/2,by=y-h/2;
   if([2,3,4].includes(dir))bx=x+gap;if([6,7,8].includes(dir))bx=x-gap-w;
   if([8,1,2].includes(dir))by=y-gap-h;if([4,5,6].includes(dir))by=y+gap;
   const r={x:bx-3,y:by-2,w:w+6,h:h+4};
   const textOverlap=boxes.reduce((n,b)=>n+area(r,b),0);
   const stationOverlap=nearStations.reduce((n,t)=>n+area(r,{x:t.point[0]-7,y:t.point[1]-7,w:14,h:14}),0);
   const trackOverlap=nearTracks.reduce((n,t)=>n+(area(r,t)>0?crossingLength(t.a,t.z,r):0),0);
   const score=textOverlap*10000+stationOverlap*3000+trackOverlap*60+(gap-10)*3+(dir===preferred?0:12);
   if(score<bestScore){bestScore=score;best={x:bx,y:by,w,h,cn,en,fontSize,weight,gap,dir}}
  }
  boxes.push({x:best.x-3,y:best.y-2,w:w+6,h:h+4});layouts.set(s.id,best);
 }
 return layouts;
}

export type SwipeDecision = 'like' | 'pass';
export function swipeThreshold(width:number){return Math.max(90,Math.min(140,width*0.24));}
export function swipeDecision(dx:number,dy:number,vx:number,width:number):SwipeDecision|null {
  if(Math.abs(dx)<=Math.abs(dy)*1.15)return null;
  const distance=Math.abs(dx)>=swipeThreshold(width);
  const flick=Math.abs(dx)>=45&&Math.abs(vx)>=0.65&&Math.sign(vx)===Math.sign(dx);
  return distance||flick?(dx>0?'like':'pass'):null;
}

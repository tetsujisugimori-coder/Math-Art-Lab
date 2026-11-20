/** Retained DOM: never replace focused controls or recreate a table each frame. */
export function text(el:Element,value:string){if(el.textContent!==value)el.textContent=value;}
export function attribute(el:Element,key:string,value:string){if(el.getAttribute(key)!==value)el.setAttribute(key,value);}
const htmlValues=new WeakMap<Element,string>();
export function html(el:Element,value:string){if(htmlValues.get(el)!==value){el.innerHTML=value;htmlValues.set(el,value);}}
const rowValues=new WeakMap<Element,Element[][]>();
export function table(el:Element,rows:string[][],headers=false){
  let cells=rowValues.get(el);
  if(!cells){cells=[];rowValues.set(el,cells);}
  while(cells.length>rows.length){el.lastElementChild?.remove();cells.pop();}
  rows.forEach((row,i)=>{if(cells![i]?.length===row.length)return;const tr=document.createElement('tr');const columns=row.map((_,j)=>{const td=document.createElement(headers&&j===0?'th':'td');if(headers&&j===0)td.setAttribute('scope','row');tr.append(td);return td;});if(el.children[i])el.children[i].replaceWith(tr);else el.append(tr);cells![i]=columns;});
  rows.forEach((row,i)=>row.forEach((v,j)=>text(cells![i][j],v)));
}
export function paragraphs(el:Element,values:string[]){
  if(el.children.length!==values.length)el.replaceChildren(...values.map(()=>document.createElement('p')));
  values.forEach((v,i)=>text(el.children[i],v));
}

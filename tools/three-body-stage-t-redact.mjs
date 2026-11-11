// Review-copy anonymization only. Never applied to immutable originals.
const personalPath = () => /[A-Z]:[\\/]+Users[\\/]+[^\\/\s"']+/gi;
export function anonymous(value){
 if(typeof value==='string')return value.replace(personalPath(),'<user-home>');
 if(Array.isArray(value))return value.map(anonymous);
 return value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[key,anonymous(v)])):value;
}
export const personalPathCandidates=text=>[...text.matchAll(personalPath())].length;

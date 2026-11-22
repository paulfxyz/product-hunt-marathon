import type {Asset} from "../shared/schema";
export type KitFile={asset:Asset;name:string;resize?:number};
export type KitDownloader=(files:KitFile[],zipName?:string)=>Promise<void>;
const ext=(a:Asset)=>a.file.slice(a.file.lastIndexOf("."));
// Everything needed to post a Product Hunt launch by hand: full-square icon (PH applies its own rounding), a 240 px copy,
// the animated thumbnail where one exists, and the gallery in posting order, named so the order survives a download.
export function phKit(slug:string,icons:Asset[],gallery:Asset[],all:Asset[]=[]):KitFile[]{
  const files:KitFile[]=[],n=String(gallery.length).padStart(2,"0");
  for(const a of icons){
    if(a.file.endsWith(".gif"))files.push({asset:a,name:`${slug}-ph-thumbnail-animated-${a.width}.gif`});
    else{files.push({asset:a,name:`${slug}-ph-icon-${a.width}${ext(a)}`});if(a.width>240)files.push({asset:a,name:`${slug}-ph-icon-240.png`,resize:240});}
  }
  const still=gallery.map(a=>(a as any).source?all.find(x=>x.id===(a as any).source)||a:a);
  still.forEach((a,i)=>files.push({asset:a,name:`${slug}-ph-gallery-${String(i+1).padStart(2,"0")}-of-${n}${ext(a)}`}));
  gallery.forEach((a,i)=>{if(still[i]!==a)files.push({asset:a,name:`${slug}-ph-gallery-${String(i+1).padStart(2,"0")}-of-${n}-animated${ext(a)}`});});
  return files;
}

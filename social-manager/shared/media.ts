/** Manifest-only media resolution; never accepts an arbitrary URL or path. */
export function assetDelivery(file:string,download:boolean,poster:boolean) {
  if(file.endsWith(".gif"))return {file:poster?file.replace(/\.gif$/,".png"):file,type:poster?"image/png":"image/gif"};
  if(file.endsWith(".png"))return {file:download?file:file.replace(/\.png$/,".webp"),type:download?"image/png":"image/webp"};
  if(file.endsWith(".webp"))return {file,type:"image/webp"};
  if(file.endsWith(".mp4"))return {file:poster?file.replace(/\.mp4$/,".png"):file,type:poster?"image/png":"video/mp4"};
  throw new Error("Unsupported artwork format");
}

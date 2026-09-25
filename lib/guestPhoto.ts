export async function prepareGuestPhoto(file:File):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Choose a JPG, PNG or WebP photo up to 10 MB.');
 const bitmap=await createImageBitmap(file);try{
  const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Photo processing is unavailable.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/webp',0.8);if(!data.startsWith('data:image/webp;base64,')||data.length>1400000)throw Error('Try a smaller photo.');return data.split(',')[1];
 }finally{bitmap.close();}
}

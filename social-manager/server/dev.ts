import { app } from './app';
import { createServer } from 'vite';
const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
app.use(vite.middlewares);
app.listen(3100,'0.0.0.0',()=>console.log('PH Social Manager on port 3100'));

import {createServer} from 'vite';
const server=await createServer({root:process.argv[2],configFile:false,base:'/',server:{host:'127.0.0.1',port:4187,strictPort:true,fs:{allow:[process.cwd()]}},optimizeDeps:{noDiscovery:true}});
await server.listen();

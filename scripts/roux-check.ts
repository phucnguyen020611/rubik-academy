import { stateFromAlg } from '../src/cube/engine.ts'
// left block = cubies with home x=-2 and y<=0 ; right block x=2,y<=0
const ok = (alg: string, pred: (h: number[]) => boolean) => stateFromAlg(3, alg).cubies.filter(c => pred(c.home) && c.home.filter(v=>v).length>1).every(c => c.pos.join() === c.home.join() && c.rot.join() === '1,0,0,0,1,0,0,0,1')
console.log('FB final', ok("R U r' U2 M' U R' U' r2 U", h => h[0] === -2 && h[1] <= 0))
console.log('SB final', ok("U M' U2 M U' M2 U", h => h[0] !== 0 && h[1] <= 0))
console.log('CMLL final corners', ok("M U2 M' U2", h => h.every(v => v !== 0)))

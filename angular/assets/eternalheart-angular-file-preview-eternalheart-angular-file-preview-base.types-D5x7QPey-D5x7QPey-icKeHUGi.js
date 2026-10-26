class e{constructor(){this.listeners=new Set}subscribe(s){return this.listeners.add(s),()=>{this.listeners.delete(s)}}notify(){this.listeners.forEach(s=>s())}}export{e as T};

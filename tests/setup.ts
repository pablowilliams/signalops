import "@testing-library/jest-dom/vitest";

class StorageMock implements Storage { private values=new Map<string,string>();get length(){return this.values.size}clear(){this.values.clear()}getItem(key:string){return this.values.get(key)??null}key(index:number){return [...this.values.keys()][index]??null}removeItem(key:string){this.values.delete(key)}setItem(key:string,value:string){this.values.set(key,String(value))} }
Object.defineProperty(window,"localStorage",{value:new StorageMock(),configurable:true});
Object.defineProperty(HTMLCanvasElement.prototype,"getContext",{value:()=>null,configurable:true});

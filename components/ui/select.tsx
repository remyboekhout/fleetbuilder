// select.tsx (minimal stub for the prototype)
import React from "react";
export function Select({ value, onValueChange, children }: any){ return <div data-select>{children}</div>; }
export function SelectTrigger(p:any){return <button {...p} className={`h-9 w-full rounded-xl border px-3 text-left ${p.className||""}`}>{p.children}</button>}
export function SelectValue({placeholder}:any){return <span>{placeholder||""}</span>}
export function SelectContent({children}:any){return <div className="mt-2 grid gap-1">{children}</div>}
export function SelectItem({ value, children, onSelect, ...p }: any){
  return <button {...p} className="rounded-xl border px-3 py-2 text-left hover:bg-gray-50" onClick={()=>onSelect?onSelect(value):null}>{children}</button>
}

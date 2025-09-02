// button.tsx
export function Button({variant, className="", ...p}:any){
  const base="px-3 py-2 rounded-2xl text-sm shadow-sm transition";
  const style=variant==="outline"?"border bg-white":variant==="secondary"?"bg-gray-100":"bg-black text-white";
  return <button {...p} className={`${base} ${style} ${className}`} />;
}

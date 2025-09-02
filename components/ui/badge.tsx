// badge.tsx
export function Badge({variant,className="",...p}:any){
  const style=variant==="outline"?"border":"bg-gray-100";
  return <span {...p} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${style} ${className}`} />;
}

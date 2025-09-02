// card.tsx
export function Card(p:any){return <div {...p} className={`rounded-2xl border ${p.className||""}`}/>}
export function CardHeader(p:any){return <div {...p} className={`p-4 border-b ${p.className||""}`}/>}
export function CardTitle(p:any){return <h3 {...p} className={`text-lg font-medium ${p.className||""}`}/>}
export function CardContent(p:any){return <div {...p} className={`p-4 ${p.className||""}`}/>}

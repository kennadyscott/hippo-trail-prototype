// Prototype stand-in for next/navigation: refresh re-reads the in-browser store instead of the server.
let refresh=()=>{}
export function setRefresh(f:()=>void){refresh=f}
export function useRouter(){return {refresh:()=>refresh(),push:(_:string)=>{},replace:(_:string)=>{}}}
export function usePathname(){return '/'}
export function useSearchParams(){return new URLSearchParams()}

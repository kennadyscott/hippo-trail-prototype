// Prototype stand-in for next/link: the CMS breadcrumb has no page to go to here, so it shows as plain text.
export default function Link({children}:{href:string;children?:React.ReactNode}){return <span>{children}</span>}

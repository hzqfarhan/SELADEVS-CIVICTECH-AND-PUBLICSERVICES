import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/space-grotesk';
import './globals.css';
export const metadata: Metadata = { title: 'GERAK — A better way to move', description: 'Your city, connected. Live Malaysian mobility, considered journeys and a voice for every neighbourhood.', applicationName:'GERAK', manifest:'/manifest.webmanifest', appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'GERAK'}, icons:{icon:'/icon.svg',apple:'/icons/icon-192.png'} };
export const viewport: Viewport = { width:'device-width', initialScale:1, themeColor:'#111b1b' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }

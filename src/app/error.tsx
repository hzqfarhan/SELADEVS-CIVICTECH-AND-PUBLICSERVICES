'use client';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}) {return <main className="error-page"><h1>Let’s get moving again.</h1><p>We couldn’t load this view. Your saved favourites are still on this device.</p><button className="primary-button" onClick={reset}>Try again</button></main>;}

"use client";

import Script from "next/script";

export function GoogleScripts() {
    return (
        <>
            <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
            <Script
                src="https://apis.google.com/js/api.js"
                strategy="lazyOnload"
                onLoad={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (window as any).gapi?.load('picker', () => {
                        console.log('Google Picker API loaded');
                    });
                }}
            />
        </>
    );
}

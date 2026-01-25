"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/PdfViewer").then(mod => mod.PdfViewer), {
    ssr: false
});

export function PdfViewerWrapper({ url }: { url: string }) {
    const [pageNum, setPageNum] = useState(1);
    return <PdfViewer url={url} pageNum={pageNum} onPageChange={setPageNum} />;
}

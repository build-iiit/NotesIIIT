"use client";

import { useState } from "react";
import { PdfViewer } from "@/components/PdfViewer";

export function PdfViewerWrapper({ url }: { url: string }) {
    const [pageNum, setPageNum] = useState(1);
    return <PdfViewer url={url} pageNum={pageNum} onPageChange={setPageNum} />;
}

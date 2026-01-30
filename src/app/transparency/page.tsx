import fs from "fs";
import path from "path";
import React from "react";
import ReactMarkdown from "react-markdown";

export default async function TransparencyPage() {
    const filePath = path.join(process.cwd(), "src/app/transparency/TRANSPARENCY.md");
    const content = await fs.promises.readFile(filePath, "utf8");

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500">
                        Transparency Disclosure
                    </h1>
                </div>

                <section className="bg-card/50 backdrop-blur-sm border rounded-2xl p-8">
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="hidden" {...props} />, // Hide h1 as we check it above
                            h2: ({ node, ...props }) => (
                                <div className="flex items-center gap-3 mt-8 mb-4">
                                    <h2 className="text-2xl font-semibold" {...props} />
                                </div>
                            ),
                            p: ({ node, ...props }) => <p className="text-muted-foreground leading-relaxed mb-4" {...props} />,
                            ul: ({ node, ...props }) => <ul className="grid gap-3 sm:grid-cols-1 mb-4 list-disc pl-5 text-muted-foreground" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-2" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                        }}
                    >
                        {content}
                    </ReactMarkdown>
                </section>

                <div className="text-center pt-8 text-sm text-muted-foreground">
                    <p>Community Driven • Secure</p>
                </div>
            </div>
        </div>
    );
}

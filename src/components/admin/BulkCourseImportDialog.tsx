"use client";

import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { X, Upload, AlertCircle, CheckCircle } from "lucide-react";

interface BulkCourseImportDialogProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface CourseData {
    name: string;
    code: string;
    branch: string;
    description?: string;
}

export function BulkCourseImportDialog({ onClose, onSuccess }: BulkCourseImportDialogProps) {
    const [jsonInput, setJsonInput] = useState("");
    const [parsedCourses, setParsedCourses] = useState<CourseData[]>([]);
    const [parseError, setParseError] = useState("");
    const [skipDuplicates, setSkipDuplicates] = useState(true);
    const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

    const importMutation = api.admin.bulkCreateCourses.useMutation({
        onSuccess: (data) => {
            setImportResult(data);
            if (data.created > 0) {
                setTimeout(() => {
                    onSuccess();
                }, 2000);
            }
        },
        onError: (error) => {
            setParseError(error.message);
        },
    });

    const handleParse = () => {
        setParseError("");
        setParsedCourses([]);

        try {
            const parsed = JSON.parse(jsonInput);

            if (!Array.isArray(parsed)) {
                setParseError("Input must be a JSON array");
                return;
            }

            const courses: CourseData[] = parsed.map((item, index) => {
                if (!item.name || !item.code || !item.branch) {
                    throw new Error(`Course at index ${index} is missing required fields (name, code, or branch)`);
                }
                return {
                    name: item.name,
                    code: item.code,
                    branch: item.branch,
                    description: item.description || undefined,
                };
            });

            setParsedCourses(courses);
        } catch (error) {
            setParseError(error instanceof Error ? error.message : "Invalid JSON");
        }
    };

    const handleImport = () => {
        if (parsedCourses.length === 0) return;

        importMutation.mutate({
            courses: parsedCourses,
            skipDuplicates,
        });
    };

    const sampleData = `[
  {
    "code": "CS101",
    "name": "Introduction to Programming",
    "branch": "CSE",
    "description": "Fundamentals of programming"
  },
  {
    "code": "MA101",
    "name": "Linear Algebra",
    "branch": "MTH",
    "description": "Matrices and vector spaces"
  }
]`;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-lg max-w-3xl w-full shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-800">
                    <div>
                        <h2 className="text-xl font-semibold">Bulk Import Courses</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Import multiple courses from JSON
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Success Message */}
                    {importResult && importResult.created > 0 && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="font-medium text-green-900 dark:text-green-100">
                                        Import Successful!
                                    </p>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                        Created {importResult.created} course{importResult.created !== 1 ? 's' : ''}
                                        {importResult.skipped > 0 && `, skipped ${importResult.skipped} duplicate${importResult.skipped !== 1 ? 's' : ''}`}
                                    </p>
                                    {importResult.errors.length > 0 && (
                                        <details className="mt-2 text-xs">
                                            <summary className="cursor-pointer text-green-700 dark:text-green-300">
                                                View skipped courses ({importResult.errors.length})
                                            </summary>
                                            <ul className="mt-2 space-y-1 list-disc list-inside">
                                                {importResult.errors.map((err, i) => (
                                                    <li key={i} className="text-green-600 dark:text-green-400">{err}</li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Instructions */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Format</h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                            Paste a JSON array of course objects. Each course must have:
                        </p>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                            <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">code</code> - Unique course code</li>
                            <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">name</code> - Course name</li>
                            <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">branch</code> - Branch (e.g., CSE, ECE)</li>
                            <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">description</code> - Optional description</li>
                        </ul>
                    </div>

                    {/* Sample */}
                    <details className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                        <summary className="cursor-pointer font-medium text-sm">View Sample Format</summary>
                        <pre className="mt-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded text-xs overflow-x-auto">
                            {sampleData}
                        </pre>
                    </details>

                    {/* Input */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            JSON Input
                        </label>
                        <textarea
                            value={jsonInput}
                            onChange={(e) => {
                                setJsonInput(e.target.value);
                                setParseError("");
                                setParsedCourses([]);
                                setImportResult(null);
                            }}
                            placeholder="Paste JSON array here..."
                            rows={10}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Parse Error */}
                    {parseError && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-600 dark:text-red-400">{parseError}</p>
                        </div>
                    )}

                    {/* Preview */}
                    {parsedCourses.length > 0 && (
                        <div className="border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                            <h3 className="font-medium mb-3">
                                Preview ({parsedCourses.length} course{parsedCourses.length !== 1 ? 's' : ''})
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {parsedCourses.map((course, index) => (
                                    <div key={index} className="text-sm p-2 bg-gray-50 dark:bg-zinc-800 rounded">
                                        <span className="font-mono font-medium">{course.code}</span>
                                        {" - "}
                                        <span>{course.name}</span>
                                        {" "}
                                        <span className="text-gray-600 dark:text-gray-400">({course.branch})</span>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={skipDuplicates}
                                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                                        className="rounded border-gray-300 dark:border-zinc-600"
                                    />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        Skip duplicate course codes (recommended)
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-2 justify-end p-6 border-t border-gray-200 dark:border-zinc-800">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    {parsedCourses.length === 0 ? (
                        <button
                            onClick={handleParse}
                            disabled={!jsonInput.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Parse JSON
                        </button>
                    ) : (
                        <button
                            onClick={handleImport}
                            disabled={importMutation.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            {importMutation.isPending ? "Importing..." : `Import ${parsedCourses.length} Course${parsedCourses.length !== 1 ? 's' : ''}`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

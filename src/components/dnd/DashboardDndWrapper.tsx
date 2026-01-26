"use client";

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { api } from "@/app/_trpc/client";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

interface DashboardDndWrapperProps {
    children: React.ReactNode;
}

export function DashboardDndWrapper({ children }: DashboardDndWrapperProps) {
    const [activeItem, setActiveItem] = useState<{ type: "NOTE" | "FOLDER"; data: any } | null>(null);
    const router = useRouter();
    const utils = api.useUtils();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const moveNoteMutation = api.notes.moveToFolder.useMutation({
        onSuccess: () => {
            utils.notes.getAll.invalidate();
            utils.folders.getAll.invalidate();
            router.refresh();
        }
    });

    const moveFolderMutation = api.folders.move.useMutation({
        onSuccess: () => {
            utils.folders.getAll.invalidate();
            router.refresh();
        }
    });

    function handleDragStart(event: DragStartEvent) {
        if (event.active.data.current?.type === "NOTE") {
            setActiveItem({ type: "NOTE", data: event.active.data.current.note });
        } else if (event.active.data.current?.type === "FOLDER") {
            setActiveItem({ type: "FOLDER", data: event.active.data.current.folder });
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        if (active.id !== over.id) {
            // Note -> Folder
            if (activeType === "NOTE" && overType === "FOLDER") {
                const noteId = active.id as string;
                const folderId = over.id as string;
                moveNoteMutation.mutate({ noteId, folderId });
            }
            // Folder -> Folder
            else if (activeType === "FOLDER" && overType === "FOLDER") {
                const folderId = active.id as string;
                const parentId = over.id as string;
                moveFolderMutation.mutate({ id: folderId, parentId });
            }
        }
    }

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {children}
            <DragOverlay>
                {activeItem?.type === "NOTE" ? (
                    <div className="w-64 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-orange-500 shadow-2xl flex items-center gap-3 opacity-90 backdrop-blur-md cursor-grabbing">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                            <FileText className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate text-gray-900 dark:text-white">{activeItem.data.title}</h4>
                            <p className="text-xs text-gray-500">Moving note...</p>
                        </div>
                    </div>
                ) : activeItem?.type === "FOLDER" ? (
                    <div className="w-40 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-yellow-500 shadow-2xl flex items-center gap-3 opacity-90 backdrop-blur-md cursor-grabbing">
                        {/* Simple folder preview */}
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <FileText className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate text-gray-900 dark:text-white">{activeItem.data.name}</h4>
                            <p className="text-xs text-gray-500">Moving folder...</p>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

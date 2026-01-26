"use client";

import { DndContext, DndContextProps } from "@dnd-kit/core";

export function DndContextWrapper(props: DndContextProps) {
    return <DndContext {...props} />;
}

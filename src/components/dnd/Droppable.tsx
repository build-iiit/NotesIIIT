"use client";

import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableProps {
    id: string;
    data?: any;
    children: ReactNode;
    className?: string;
}

export function Droppable({ id, data, children, className }: DroppableProps) {
    const { isOver, setNodeRef } = useDroppable({
        id,
        data,
    });

    const style = {
        opacity: isOver ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={className}>
            {children}
        </div>
    );
}

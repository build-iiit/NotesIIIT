import React from'react';
import {
 Keyboard,
 PenLine,
 Highlighter,
 Eraser,
 Lasso,
 Minus,
 Undo2,
 Redo2,
 Wand2,
 Pen,
 Palette,
 Type,
 ArrowUpDown,
 Shapes,
 Lock,
 LayoutGrid
} from'lucide-react';

interface UnifiedAnnotationToolbarProps {
 activeTool: string;
 setActiveTool: (tool: string) => void;
 activeColor: string;
 setActiveColor: (color: string) => void;
 onUndo?: () => void;
 onRedo?: () => void;
 onSettingsClick?: () => void;
}

const IconButton = ({ 
 icon: Icon, 
 isActive = false, 
 onClick 
 }: { 
 icon: React.ElementType, 
 isActive?: boolean, 
 onClick?: () => void 
 }) => (
 <button
 onClick={onClick}
 className={`p-2 rounded-full transition-colors flex items-center justify-center ${
 isActive ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
 }`}
 >
 <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
 </button>
 );

const ColorButton = ({ colorValue, bgClass, activeColor, setActiveColor }: { colorValue: string, bgClass: string, activeColor: string, setActiveColor: (color: string) => void }) => {
 const isActive = activeColor === colorValue;
 return (
 <button
 onClick={() => setActiveColor(colorValue)}
 className={`p-2 rounded-full transition-colors flex items-center justify-center hover:bg-zinc-800 ${
 isActive ? 'bg-zinc-700' : ''
 }`}
 >
 <div className={`w-5 h-5 rounded-full ${bgClass} ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`} />
 </button>
 );
};

export function UnifiedAnnotationToolbar({
 activeTool,
 setActiveTool,
 activeColor,
 setActiveColor,
 onUndo,
 onRedo,
 onSettingsClick
}: UnifiedAnnotationToolbarProps) {
 return (
 <div className="flex flex-col items-center gap-3 bg-zinc-900 p-3 rounded-2xl shadow-xl w-14">
 {/* 1-5 Top Tools */}
 <IconButton icon={Keyboard} isActive={activeTool ==='keyboard'} onClick={() => setActiveTool('keyboard')} />
 <IconButton icon={PenLine} isActive={activeTool ==='pen'} onClick={() => setActiveTool('pen')} />
 <IconButton icon={Highlighter} isActive={activeTool ==='highlighter'} onClick={() => setActiveTool('highlighter')} />
 <IconButton icon={Eraser} isActive={activeTool ==='eraser'} onClick={() => setActiveTool('eraser')} />
 <IconButton icon={Lasso} isActive={activeTool ==='lasso'} onClick={() => setActiveTool('lasso')} />

 <hr className="w-8 border-t border-zinc-700 my-1" />

 {/* 6-8 Color Presets */}
 <ColorButton colorValue="#ef4444" bgClass="bg-red-500" activeColor={activeColor} setActiveColor={setActiveColor} />
 <ColorButton colorValue="#22c55e" bgClass="bg-green-500" activeColor={activeColor} setActiveColor={setActiveColor} />
 <ColorButton colorValue="#3b82f6" bgClass="bg-blue-400" activeColor={activeColor} setActiveColor={setActiveColor} />

 {/* 9. Thickness */}
 <IconButton icon={Minus} isActive={activeTool ==='thickness'} onClick={() => setActiveTool('thickness')} />

 {/* 10-11 Undo/Redo */}
 <IconButton icon={Undo2} onClick={onUndo} />
 <IconButton icon={Redo2} onClick={onRedo} />

 {/* 12-18 More Tools */}
 <IconButton icon={Wand2} isActive={activeTool ==='magic'} onClick={() => setActiveTool('magic')} />
 <IconButton icon={Pen} isActive={activeTool ==='text-pen'} onClick={() => setActiveTool('text-pen')} />
 <IconButton icon={Palette} isActive={activeTool ==='rainbow'} onClick={() => setActiveTool('rainbow')} />
 <IconButton icon={Type} isActive={activeTool ==='text'} onClick={() => setActiveTool('text')} />
 <IconButton icon={ArrowUpDown} isActive={activeTool ==='spacing'} onClick={() => setActiveTool('spacing')} />
 <IconButton icon={Shapes} isActive={activeTool ==='shapes'} onClick={() => setActiveTool('shapes')} />
 <IconButton icon={Lock} isActive={activeTool ==='lock'} onClick={() => setActiveTool('lock')} />

 <hr className="w-8 border-t border-zinc-700 my-1" />

 {/* 19. Settings */}
 <IconButton icon={LayoutGrid} onClick={onSettingsClick} />
 </div>
 );
}

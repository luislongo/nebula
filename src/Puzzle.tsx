import React, { useState, useCallback } from 'react'

export type PuzzleProps = {
    size: number;
    blocks: {
        x: number;
        y: number;
        isHorizontal: boolean;
        length: number;
        }[];
    }

const px = 40;

const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'magenta', 'lime'];

export const Puzzle = (props: PuzzleProps) => {
    const [blocks, setBlocks] = useState(props.blocks);
    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        blockIndex: number;
        startMousePos: { x: number; y: number };
        startBlockPos: { x: number; y: number };
    } | null>(null);

    // Helper function to check if a position is valid for a block
    const isValidPosition = useCallback((blockIndex: number, newX: number, newY: number) => {
        const block = blocks[blockIndex];
        
        // Check bounds
        if (newX < 0 || newY < 0) return false;
        if (block.isHorizontal && newX + block.length > props.size) return false;
        if (!block.isHorizontal && newY + block.length > props.size) return false;
        if (block.isHorizontal && newY >= props.size) return false;
        if (!block.isHorizontal && newX >= props.size) return false;
        
        // Check collision with other blocks
        const testBlocks = blocks.map((b, i) => i === blockIndex ? { ...b, x: newX, y: newY } : b);
        
        // Create a grid to check occupancy
        const grid = Array(props.size * props.size).fill(false);
        
        for (let i = 0; i < testBlocks.length; i++) {
            const testBlock = testBlocks[i];
            for (let j = 0; j < testBlock.length; j++) {
                const gridX = testBlock.isHorizontal ? testBlock.x + j : testBlock.x;
                const gridY = testBlock.isHorizontal ? testBlock.y : testBlock.y + j;
                const gridIndex = gridY * props.size + gridX;
                
                if (grid[gridIndex]) return false; // Collision detected
                grid[gridIndex] = true;
            }
        }
        
        return true;
    }, [blocks, props.size]);

    const handleMouseDown = useCallback((e: React.MouseEvent, blockIndex: number) => {
        e.preventDefault();
        const parentRect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
        
        setDragState({
            isDragging: true,
            blockIndex,
            startMousePos: { 
                x: e.clientX - parentRect.left, 
                y: e.clientY - parentRect.top 
            },
            startBlockPos: { 
                x: blocks[blockIndex].x, 
                y: blocks[blockIndex].y 
            }
        });
    }, [blocks]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragState?.isDragging) return;
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const currentMouseX = e.clientX - rect.left;
        const currentMouseY = e.clientY - rect.top;
        
        const deltaX = currentMouseX - dragState.startMousePos.x;
        const deltaY = currentMouseY - dragState.startMousePos.y;
        
        const newX = Math.round((dragState.startBlockPos.x * px + deltaX) / px);
        const newY = Math.round((dragState.startBlockPos.y * px + deltaY) / px);
        
        if (isValidPosition(dragState.blockIndex, newX, newY)) {
            setBlocks(prevBlocks => 
                prevBlocks.map((block, i) => 
                    i === dragState.blockIndex 
                        ? { ...block, x: newX, y: newY }
                        : block
                )
            );
        }
    }, [dragState, isValidPosition]);

    const handleMouseUp = useCallback(() => {
        setDragState(null);
    }, []);

    return <div style={{ width: px * props.size, height: px * props.size }} className="absolute top-0 left-0"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
    >
        {
            Array.from({ length: props.size * props.size }).map((_, i) => (
                <div key={i} className="border border-black box-border inline-block"
                style={{ position: 'absolute', top: Math.floor(i / props.size) * px, left: (i % props.size) * px, width: px, height: px }}></div>  
            ))
        }
        {
            blocks.map((block, index) => (
                <div 
                    key={index} 
                    className={`absolute border border-black box-border cursor-move ${dragState?.blockIndex === index ? 'z-10' : ''}`}
                    style={{ 
                        top: block.y * px, 
                        left: block.x * px, 
                        width: (block.isHorizontal ? block.length * px : px), 
                        height: (block.isHorizontal ? px : block.length * px), 
                        backgroundColor: colors[index % colors.length],
                        opacity: dragState?.blockIndex === index ? 0.8 : 1
                    }}
                    onMouseDown={(e) => handleMouseDown(e, index)}
                >
                </div>
            ))
        }
    </div>
}

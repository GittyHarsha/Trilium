/**
 * Specialized tools for manipulating Mermaid, Canvas, and MindMap notes
 */

import becca from "../../../becca/becca.ts";
import log from "../../log.ts";

/**
 * Update Mermaid diagram content
 */
export const updateMermaidTool = {
    name: "update_mermaid_diagram",
    description: "Update a Mermaid diagram with new diagram syntax. Use Mermaid syntax to define flowcharts, sequence diagrams, gantt charts, etc.",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the mermaid note to update"
            },
            mermaidCode: {
                type: "string",
                description: "Mermaid diagram syntax (e.g., 'graph TD; A-->B; B-->C;')"
            }
        },
        required: ["noteId", "mermaidCode"]
    },
    handler: async (params: { noteId: string; mermaidCode: string }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            if (note.type !== "mermaid") {
                return { error: `Note is not a mermaid diagram. Type: ${note.type}` };
            }

            // Set the mermaid code as plain text content
            note.setContent(params.mermaidCode);
            note.save();

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                contentLength: params.mermaidCode.length
            };
        } catch (error) {
            log.error(`Error updating mermaid diagram: ${error}`);
            return { error: `Failed to update mermaid diagram: ${error}` };
        }
    }
};

/**
 * Update Canvas (Excalidraw) content
 */
export const updateCanvasTool = {
    name: "update_canvas",
    description: "Update a Canvas note with new Excalidraw elements. Canvas uses JSON format with drawing elements.",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the canvas note to update"
            },
            elements: {
                type: "array",
                description: "Array of Excalidraw elements to add/replace",
                items: {
                    type: "object"
                }
            },
            appState: {
                type: "object",
                description: "Optional Excalidraw app state (zoom, scroll position, etc.)"
            },
            merge: {
                type: "boolean",
                description: "If true, merge with existing elements. If false, replace all elements.",
                default: false
            }
        },
        required: ["noteId", "elements"]
    },
    handler: async (params: {
        noteId: string;
        elements: any[];
        appState?: any;
        merge?: boolean;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            if (note.type !== "canvas") {
                return { error: `Note is not a canvas. Type: ${note.type}` };
            }

            // Get existing content
            let canvasData: any = {
                type: "excalidraw",
                version: 2,
                elements: [],
                files: {},
                appState: {}
            };

            const existingContent = note.getContent();
            if (existingContent) {
                try {
                    canvasData = JSON.parse(existingContent.toString());
                } catch (e) {
                    log.warn("Could not parse existing canvas content, starting fresh");
                }
            }

            // Update elements
            if (params.merge) {
                canvasData.elements = [...canvasData.elements, ...params.elements];
            } else {
                canvasData.elements = params.elements;
            }

            // Update app state if provided
            if (params.appState) {
                canvasData.appState = { ...canvasData.appState, ...params.appState };
            }

            // Save updated content
            note.setContent(JSON.stringify(canvasData));
            note.save();

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                elementCount: canvasData.elements.length
            };
        } catch (error) {
            log.error(`Error updating canvas: ${error}`);
            return { error: `Failed to update canvas: ${error}` };
        }
    }
};

/**
 * Update MindMap content
 */
export const updateMindMapTool = {
    name: "update_mindmap",
    description: "Update a MindMap note with new mind map data structure. MindMap uses JSON format with hierarchical node structure.",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the mindmap note to update"
            },
            mindMapData: {
                type: "object",
                description: "MindElixir data structure with nodes, topics, and connections"
            },
            rootTopic: {
                type: "string",
                description: "Optional: Set root topic text"
            }
        },
        required: ["noteId", "mindMapData"]
    },
    handler: async (params: {
        noteId: string;
        mindMapData: any;
        rootTopic?: string;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            if (note.type !== "mindMap") {
                return { error: `Note is not a mindmap. Type: ${note.type}` };
            }

            // Update root topic if provided
            if (params.rootTopic && params.mindMapData.nodeData) {
                params.mindMapData.nodeData.topic = params.rootTopic;
            }

            // Save mind map data as JSON
            note.setContent(JSON.stringify(params.mindMapData));
            note.save();

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                rootTopic: params.mindMapData.nodeData?.topic || "Unknown"
            };
        } catch (error) {
            log.error(`Error updating mindmap: ${error}`);
            return { error: `Failed to update mindmap: ${error}` };
        }
    }
};

/**
 * Add a node to MindMap
 */
export const addMindMapNodeTool = {
    name: "add_mindmap_node",
    description: "Add a new node to an existing MindMap at a specific parent node",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the mindmap note"
            },
            parentNodeId: {
                type: "string",
                description: "ID of the parent node to attach this node to"
            },
            topic: {
                type: "string",
                description: "Text content of the new node"
            },
            direction: {
                type: "string",
                description: "Direction relative to parent (left, right, top, bottom)",
                enum: ["left", "right", "top", "bottom"],
                default: "right"
            }
        },
        required: ["noteId", "parentNodeId", "topic"]
    },
    handler: async (params: {
        noteId: string;
        parentNodeId: string;
        topic: string;
        direction?: string;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            if (note.type !== "mindMap") {
                return { error: `Note is not a mindmap. Type: ${note.type}` };
            }

            // Get existing mind map data
            const existingContent = note.getContent();
            if (!existingContent) {
                return { error: "MindMap has no content" };
            }

            let mindMapData: any;
            try {
                mindMapData = JSON.parse(existingContent.toString());
            } catch (e) {
                return { error: "Could not parse mindmap content" };
            }

            // Create new node
            const newNode = {
                id: `node-${Date.now()}`,
                topic: params.topic,
                direction: params.direction || "right",
                children: []
            };

            // Find parent node and add child
            function addNodeToParent(node: any, parentId: string): boolean {
                if (node.id === parentId) {
                    if (!node.children) {
                        node.children = [];
                    }
                    node.children.push(newNode);
                    return true;
                }
                if (node.children) {
                    for (const child of node.children) {
                        if (addNodeToParent(child, parentId)) {
                            return true;
                        }
                    }
                }
                return false;
            }

            const added = addNodeToParent(mindMapData.nodeData, params.parentNodeId);
            if (!added) {
                return { error: `Parent node not found: ${params.parentNodeId}` };
            }

            // Save updated mind map
            note.setContent(JSON.stringify(mindMapData));
            note.save();

            return {
                success: true,
                noteId: note.noteId,
                nodeId: newNode.id,
                topic: newNode.topic,
                parentNodeId: params.parentNodeId
            };
        } catch (error) {
            log.error(`Error adding mindmap node: ${error}`);
            return { error: `Failed to add mindmap node: ${error}` };
        }
    }
};

/**
 * Add element to Canvas
 */
export const addCanvasElementTool = {
    name: "add_canvas_element",
    description: "Add a simple element (rectangle, text, arrow, etc.) to a Canvas note",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the canvas note"
            },
            elementType: {
                type: "string",
                description: "Type of element to add",
                enum: ["rectangle", "diamond", "ellipse", "arrow", "line", "text", "freedraw"]
            },
            x: {
                type: "number",
                description: "X coordinate"
            },
            y: {
                type: "number",
                description: "Y coordinate"
            },
            width: {
                type: "number",
                description: "Width of element",
                default: 100
            },
            height: {
                type: "number",
                description: "Height of element",
                default: 100
            },
            text: {
                type: "string",
                description: "Text content (for text elements)"
            },
            strokeColor: {
                type: "string",
                description: "Stroke color (hex)",
                default: "#000000"
            },
            backgroundColor: {
                type: "string",
                description: "Background color (hex)",
                default: "transparent"
            }
        },
        required: ["noteId", "elementType", "x", "y"]
    },
    handler: async (params: {
        noteId: string;
        elementType: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        text?: string;
        strokeColor?: string;
        backgroundColor?: string;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            if (note.type !== "canvas") {
                return { error: `Note is not a canvas. Type: ${note.type}` };
            }

            // Get existing content
            let canvasData: any = {
                type: "excalidraw",
                version: 2,
                elements: [],
                files: {},
                appState: {}
            };

            const existingContent = note.getContent();
            if (existingContent) {
                try {
                    canvasData = JSON.parse(existingContent.toString());
                } catch (e) {
                    log.warn("Could not parse existing canvas content");
                }
            }

            // Create new element
            const elementId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const newElement: any = {
                type: params.elementType,
                id: elementId,
                x: params.x,
                y: params.y,
                width: params.width || 100,
                height: params.height || 100,
                strokeColor: params.strokeColor || "#000000",
                backgroundColor: params.backgroundColor || "transparent",
                fillStyle: "solid",
                strokeWidth: 2,
                roughness: 1,
                opacity: 100,
                angle: 0,
                locked: false,
                seed: Math.floor(Math.random() * 1000000),
                version: 1,
                versionNonce: Math.floor(Math.random() * 1000000),
                isDeleted: false,
                groupIds: [],
                frameId: null,
                roundness: null,
                boundElements: null,
                updated: Date.now(),
                link: null
            };

            if (params.text) {
                newElement.text = params.text;
                newElement.fontSize = 20;
                newElement.fontFamily = 1;
                newElement.textAlign = "center";
                newElement.verticalAlign = "middle";
                newElement.baseline = 18;
            }

            // Add element to canvas
            canvasData.elements.push(newElement);

            // Save updated content
            note.setContent(JSON.stringify(canvasData));
            note.save();

            return {
                success: true,
                noteId: note.noteId,
                elementId: elementId,
                elementType: params.elementType,
                elementCount: canvasData.elements.length
            };
        } catch (error) {
            log.error(`Error adding canvas element: ${error}`);
            return { error: `Failed to add canvas element: ${error}` };
        }
    }
};

/**
 * Export all specialized tools
 */
export const specializedTools = [
    updateMermaidTool,
    updateCanvasTool,
    updateMindMapTool,
    addMindMapNodeTool,
    addCanvasElementTool
];

export function getSpecializedTool(name: string) {
    return specializedTools.find(tool => tool.name === name);
}

export function getSpecializedToolDefinitions() {
    return specializedTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
    }));
}

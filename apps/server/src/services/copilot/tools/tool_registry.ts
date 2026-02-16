/**
 * Tool Registry for GitHub Copilot SDK
 * Registers all available tools that Copilot can use to interact with Trilium
 */

import becca from "../../../becca/becca.ts";
import noteService from "../../notes.ts";
import searchService from "../../search/services/search.ts";
import log from "../../log.ts";
import type { BNote } from "../../../becca/entities/bnote.ts";

/**
 * Read a note's content
 */
export const readNoteTool = {
    name: "read_note",
    description: "Read the full content of a note by its ID. Returns the note's title, type, content, and optionally attributes.",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "The unique ID of the note to read"
            },
            includeAttributes: {
                type: "boolean",
                description: "Whether to include note attributes (labels and relations)",
                default: false
            }
        },
        required: ["noteId"]
    },
    handler: async (params: { noteId: string; includeAttributes?: boolean }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            const content = note.getContent();
            const result: any = {
                noteId: note.noteId,
                title: note.title,
                type: note.type,
                mime: note.mime,
                content: content?.toString() || "",
                dateCreated: note.dateCreated,
                dateModified: note.dateModified
            };

            if (params.includeAttributes) {
                result.attributes = note.getOwnedAttributes().map(attr => ({
                    type: attr.type,
                    name: attr.name,
                    value: attr.value,
                    isInheritable: attr.isInheritable
                }));
            }

            return result;
        } catch (error) {
            log.error(`Error reading note: ${error}`);
            return { error: `Failed to read note: ${error}` };
        }
    }
};

/**
 * Create a new note
 */
export const createNoteTool = {
    name: "create_note",
    description: "Create a new note with specified title, type, and content. Can be placed under a parent note.",
    parameters: {
        type: "object",
        properties: {
            parentNoteId: {
                type: "string",
                description: "ID of the parent note. Use 'root' for top-level notes."
            },
            title: {
                type: "string",
                description: "Title of the new note"
            },
            type: {
                type: "string",
                description: "Note type (text, code, mermaid, canvas, mindMap, etc.)",
                enum: ["text", "code", "mermaid", "canvas", "mindMap", "file", "image", "book", "relationMap", "render", "doc"]
            },
            content: {
                type: "string",
                description: "Content of the note"
            },
            mime: {
                type: "string",
                description: "MIME type for the note (e.g., 'text/html' for text notes, 'application/json' for canvas/mermaid)",
                default: "text/html"
            }
        },
        required: ["parentNoteId", "title", "type"]
    },
    handler: async (params: {
        parentNoteId: string;
        title: string;
        type: string;
        content?: string;
        mime?: string;
    }) => {
        try {
            const { note, branch } = noteService.createNewNote({
                parentNoteId: params.parentNoteId,
                title: params.title,
                type: params.type as any,
                mime: params.mime || "text/html",
                content: params.content || ""
            });

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                type: note.type,
                branchId: branch.branchId
            };
        } catch (error) {
            log.error(`Error creating note: ${error}`);
            return { error: `Failed to create note: ${error}` };
        }
    }
};

/**
 * Update a note's content or title
 */
export const updateNoteTool = {
    name: "update_note",
    description: "Update an existing note's title and/or content",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the note to update"
            },
            title: {
                type: "string",
                description: "New title for the note (optional)"
            },
            content: {
                type: "string",
                description: "New content for the note (optional)"
            }
        },
        required: ["noteId"]
    },
    handler: async (params: {
        noteId: string;
        title?: string;
        content?: string;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            if (params.title !== undefined) {
                note.title = params.title;
            }

            if (params.content !== undefined) {
                note.setContent(params.content);
            }

            note.save();

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                dateModified: note.dateModified
            };
        } catch (error) {
            log.error(`Error updating note: ${error}`);
            return { error: `Failed to update note: ${error}` };
        }
    }
};

/**
 * Search for notes
 */
export const searchNotesTool = {
    name: "search_notes",
    description: "Search for notes using Trilium's search syntax. Supports full-text search, labels, and advanced queries.",
    parameters: {
        type: "object",
        properties: {
            searchString: {
                type: "string",
                description: "Search query (e.g., 'note.title *=* meeting', '#important', 'note.text *=* project')"
            },
            limit: {
                type: "number",
                description: "Maximum number of results to return",
                default: 50
            }
        },
        required: ["searchString"]
    },
    handler: async (params: { searchString: string; limit?: number }) => {
        try {
            const searchResults = searchService.searchNotes(params.searchString);
            const limit = params.limit || 50;
            const results = searchResults.slice(0, limit);

            return {
                success: true,
                count: results.length,
                totalCount: searchResults.length,
                notes: results.map((note: BNote) => ({
                    noteId: note.noteId,
                    title: note.title,
                    type: note.type,
                    dateCreated: note.dateCreated,
                    dateModified: note.dateModified
                }))
            };
        } catch (error) {
            log.error(`Error searching notes: ${error}`);
            return { error: `Failed to search notes: ${error}` };
        }
    }
};

/**
 * Add an attribute (label or relation) to a note
 */
export const addAttributeTool = {
    name: "add_attribute",
    description: "Add a label or relation attribute to a note",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the note to add attribute to"
            },
            type: {
                type: "string",
                description: "Type of attribute: 'label' or 'relation'",
                enum: ["label", "relation"]
            },
            name: {
                type: "string",
                description: "Name of the attribute"
            },
            value: {
                type: "string",
                description: "Value of the attribute (for labels) or target note ID (for relations)"
            },
            isInheritable: {
                type: "boolean",
                description: "Whether the attribute should be inherited by child notes",
                default: false
            }
        },
        required: ["noteId", "type", "name", "value"]
    },
    handler: async (params: {
        noteId: string;
        type: "label" | "relation";
        name: string;
        value: string;
        isInheritable?: boolean;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            if (params.type === "label") {
                note.setLabel(params.name, params.value);
            } else if (params.type === "relation") {
                note.setRelation(params.name, params.value);
            }

            if (params.isInheritable) {
                const attr = note.getOwnedAttribute(params.type, params.name);
                if (attr) {
                    attr.isInheritable = true;
                    attr.save();
                }
            }

            return {
                success: true,
                noteId: note.noteId,
                attribute: {
                    type: params.type,
                    name: params.name,
                    value: params.value
                }
            };
        } catch (error) {
            log.error(`Error adding attribute: ${error}`);
            return { error: `Failed to add attribute: ${error}` };
        }
    }
};

/**
 * Get note children (sub-notes)
 */
export const getChildNotesTool = {
    name: "get_child_notes",
    description: "Get all child notes of a specified note",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the parent note"
            },
            includeContent: {
                type: "boolean",
                description: "Whether to include note content in results",
                default: false
            }
        },
        required: ["noteId"]
    },
    handler: async (params: { noteId: string; includeContent?: boolean }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            const children = note.getChildNotes();
            
            return {
                success: true,
                count: children.length,
                children: children.map(child => {
                    const result: any = {
                        noteId: child.noteId,
                        title: child.title,
                        type: child.type,
                        dateCreated: child.dateCreated,
                        dateModified: child.dateModified
                    };

                    if (params.includeContent) {
                        result.content = child.getContent()?.toString() || "";
                    }

                    return result;
                })
            };
        } catch (error) {
            log.error(`Error getting child notes: ${error}`);
            return { error: `Failed to get child notes: ${error}` };
        }
    }
};

/**
 * Delete a note
 */
export const deleteNoteTool = {
    name: "delete_note",
    description: "Delete a note and optionally its children",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the note to delete"
            },
            deleteChildren: {
                type: "boolean",
                description: "Whether to delete child notes as well",
                default: false
            }
        },
        required: ["noteId"]
    },
    handler: async (params: { noteId: string; deleteChildren?: boolean }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            // Get first branch
            const branches = note.getBranches();
            if (branches.length === 0) {
                return { error: "Note has no branches to delete" };
            }

            // Delete the note via its branch
            const branch = branches[0];
            branch.deleteBranch(params.deleteChildren !== false);

            return {
                success: true,
                noteId: params.noteId,
                deleted: true
            };
        } catch (error) {
            log.error(`Error deleting note: ${error}`);
            return { error: `Failed to delete note: ${error}` };
        }
    }
};

/**
 * Export all tools as an array
 */
export const allTools = [
    readNoteTool,
    createNoteTool,
    updateNoteTool,
    searchNotesTool,
    addAttributeTool,
    getChildNotesTool,
    deleteNoteTool
];

/**
 * Get tool by name
 */
export function getTool(name: string) {
    return allTools.find(tool => tool.name === name);
}

/**
 * Get all tool definitions (for SDK registration)
 */
export function getToolDefinitions() {
    return allTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
    }));
}

/**
 * Execute a tool by name
 */
export async function executeTool(name: string, params: any) {
    const tool = getTool(name);
    if (!tool) {
        throw new Error(`Tool not found: ${name}`);
    }

    return await tool.handler(params);
}

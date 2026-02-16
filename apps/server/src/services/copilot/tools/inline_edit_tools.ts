/**
 * Inline Edit Tool for Copilot
 * Allows AI to propose inline edits with diff preview
 */

import becca from "../../../becca/becca.js";
import log from "../../log.js";

/**
 * Propose an inline edit to a note
 * This returns the proposed changes without applying them immediately,
 * allowing the UI to show a diff preview
 */
export const proposeInlineEditTool = {
    name: "propose_inline_edit",
    description: "Propose an inline edit to a note's content. Returns the proposed changes for review and application. Use this when you want to edit a note and show the user what will change.",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the note to edit"
            },
            proposedContent: {
                type: "string",
                description: "The new proposed content for the note"
            },
            changeDescription: {
                type: "string",
                description: "Brief description of what changes were made (e.g., 'Added introduction paragraph', 'Fixed typos', 'Restructured sections')"
            }
        },
        required: ["noteId", "proposedContent"]
    },
    handler: async (params: {
        noteId: string;
        proposedContent: string;
        changeDescription?: string;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            const originalContent = note.getContent()?.toString() || "";

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                type: note.type,
                originalContent: originalContent,
                proposedContent: params.proposedContent,
                changeDescription: params.changeDescription || "Content updated",
                // Don't actually apply yet - let frontend show diff first
                applied: false
            };
        } catch (error) {
            log.error(`Error proposing inline edit: ${error}`);
            return { error: `Failed to propose edit: ${error}` };
        }
    }
};

/**
 * Apply an inline edit immediately (for streaming or auto-apply)
 */
export const applyInlineEditTool = {
    name: "apply_inline_edit",
    description: "Apply an inline edit to a note immediately. Use this for streaming edits or when you want changes applied automatically without preview.",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the note to edit"
            },
            newContent: {
                type: "string",
                description: "The new content to apply"
            },
            streaming: {
                type: "boolean",
                description: "Whether this is part of a streaming edit (default: false)",
                default: false
            }
        },
        required: ["noteId", "newContent"]
    },
    handler: async (params: {
        noteId: string;
        newContent: string;
        streaming?: boolean;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            // Apply the edit
            note.setContent(params.newContent);
            note.save();

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                applied: true,
                streaming: params.streaming || false,
                contentLength: params.newContent.length
            };
        } catch (error) {
            log.error(`Error applying inline edit: ${error}`);
            return { error: `Failed to apply edit: ${error}` };
        }
    }
};

/**
 * Apply a partial edit (for line-by-line updates)
 */
export const applyPartialEditTool = {
    name: "apply_partial_edit",
    description: "Apply a partial edit to specific lines in a note. Useful for editing only part of a document.",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "ID of the note to edit"
            },
            lineStart: {
                type: "number",
                description: "Starting line number (0-indexed)"
            },
            lineEnd: {
                type: "number",
                description: "Ending line number (0-indexed)"
            },
            newContent: {
                type: "string",
                description: "New content for the specified line range"
            }
        },
        required: ["noteId", "lineStart", "lineEnd", "newContent"]
    },
    handler: async (params: {
        noteId: string;
        lineStart: number;
        lineEnd: number;
        newContent: string;
    }) => {
        try {
            const note = becca.getNote(params.noteId);
            if (!note) {
                return { error: `Note not found: ${params.noteId}` };
            }

            const originalContent = note.getContent()?.toString() || "";
            const lines = originalContent.split('\n');

            // Validate line range
            if (params.lineStart < 0 || params.lineEnd >= lines.length || params.lineStart > params.lineEnd) {
                return { error: `Invalid line range: ${params.lineStart}-${params.lineEnd}` };
            }

            // Replace specified lines
            lines.splice(params.lineStart, params.lineEnd - params.lineStart + 1, params.newContent);

            const newContent = lines.join('\n');

            // Apply the edit
            note.setContent(newContent);
            note.save();

            return {
                success: true,
                noteId: note.noteId,
                title: note.title,
                linesAffected: params.lineEnd - params.lineStart + 1,
                applied: true
            };
        } catch (error) {
            log.error(`Error applying partial edit: ${error}`);
            return { error: `Failed to apply partial edit: ${error}` };
        }
    }
};

export const inlineEditTools = [
    proposeInlineEditTool,
    applyInlineEditTool,
    applyPartialEditTool
];

export function getInlineEditToolDefinitions() {
    return inlineEditTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
    }));
}

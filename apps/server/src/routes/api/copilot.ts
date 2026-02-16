/**
 * API routes for GitHub Copilot SDK integration
 * Provides endpoints for creating sessions, sending messages, and managing copilot interactions
 */

import type { Request, Response } from "express";
import copilotService from "../../services/copilot/copilot_service.js";
import { allTools, executeTool, getToolDefinitions } from "../../services/copilot/tools/tool_registry.js";
import { specializedTools, getSpecializedToolDefinitions } from "../../services/copilot/tools/specialized_tools.js";
import { inlineEditTools, getInlineEditToolDefinitions } from "../../services/copilot/tools/inline_edit_tools.js";
import log from "../../services/log.js";

/**
 * Create a new copilot session
 * POST /api/copilot/sessions
 */
export async function createSession(req: Request, res: Response) {
    try {
        const { model, name, isGlobal } = req.body;
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const session = await copilotService.createSession(sessionId, model, name, isGlobal);

        res.json({
            success: true,
            sessionId: sessionId,
            model: model || "default",
            name: name || sessionId,
            isGlobal: isGlobal || false,
            availableTools: [...getToolDefinitions(), ...getSpecializedToolDefinitions(), ...getInlineEditToolDefinitions()]
        });
    } catch (error) {
        log.error(`Error creating copilot session: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to create session: ${error}`
        });
    }
}

/**
 * Send a message to a copilot session
 * POST /api/copilot/sessions/:sessionId/send
 */
export async function sendMessage(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;
        const { prompt, streaming, context, tools } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: "Prompt is required"
            });
        }

        // Build enhanced context with note contents
        let enhancedPrompt = prompt;
        if (context && context.contextNoteIds && Array.isArray(context.contextNoteIds) && context.contextNoteIds.length > 0) {
            const { executeTool } = await import("../../services/copilot/tools/tool_registry.js");
            
            let contextContent = "\n\n=== CONTEXT NOTES ===\n";
            for (const noteId of context.contextNoteIds) {
                try {
                    const noteData = await executeTool("read_note", { noteId, includeAttributes: false });
                    if (noteData && noteData.title) {
                        contextContent += `\n--- Note: ${noteData.title} (${noteData.type}) ---\n`;
                        contextContent += noteData.content || "";
                        contextContent += "\n";
                    }
                } catch (error) {
                    log.info(`Could not read context note ${noteId}: ${error}`);
                }
            }
            contextContent += "\n=== END CONTEXT NOTES ===\n\n";
            
            enhancedPrompt = contextContent + "User Query: " + prompt;
        }

        // Prepare tools - merge requested tools with all available tools
        const availableTools = [...allTools, ...specializedTools, ...inlineEditTools];
        const toolsToUse = tools || availableTools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }));

        // Send message with tools
        const response = await copilotService.send(sessionId, enhancedPrompt, {
            streaming: streaming || false,
            tools: toolsToUse,
            context: context,
            onChunk: streaming ? (chunk: string) => {
                // For streaming, we'd use Server-Sent Events (SSE)
                // This is a simplified version
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            } : undefined
        });

        if (streaming) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } else {
            // Process tool calls if any
            if (response.toolCalls && response.toolCalls.length > 0) {
                const toolResults: Array<{toolCall: string; result: any}> = [];
                for (const toolCall of response.toolCalls) {
                    const result = await executeTool(toolCall.function.name, toolCall.function.arguments);
                    toolResults.push({
                        toolCall: toolCall.function.name,
                        result: result
                    });
                }

                res.json({
                    success: true,
                    response: response.message || response.text || "",
                    toolCalls: toolResults,
                    sessionId: sessionId
                });
            } else {
                res.json({
                    success: true,
                    response: response.message || response.text || response,
                    sessionId: sessionId
                });
            }
        }
    } catch (error) {
        log.error(`Error sending message to copilot: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to send message: ${error}`
        });
    }
}

/**
 * Execute a tool directly (for testing)
 * POST /api/copilot/tools/:toolName/execute
 */
export async function executeToolDirectly(req: Request, res: Response) {
    try {
        const { toolName } = req.params;
        const params = req.body;

        const result = await executeTool(toolName, params);

        res.json({
            success: true,
            tool: toolName,
            result: result
        });
    } catch (error) {
        log.error(`Error executing tool: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to execute tool: ${error}`
        });
    }
}

/**
 * Get available tools
 * GET /api/copilot/tools
 */
export function getTools(req: Request, res: Response) {
    try {
        const allToolDefs = [...getToolDefinitions(), ...getSpecializedToolDefinitions(), ...getInlineEditToolDefinitions()];

        res.json({
            success: true,
            count: allToolDefs.length,
            tools: allToolDefs
        });
    } catch (error) {
        log.error(`Error getting tools: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to get tools: ${error}`
        });
    }
}

/**
 * Close a copilot session
 * DELETE /api/copilot/sessions/:sessionId
 */
export async function closeSession(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;

        await copilotService.closeSession(sessionId);

        res.json({
            success: true,
            sessionId: sessionId,
            message: "Session closed successfully"
        });
    } catch (error) {
        log.error(`Error closing copilot session: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to close session: ${error}`
        });
    }
}

/**
 * Get copilot status
 * GET /api/copilot/status
 */
export function getStatus(req: Request, res: Response) {
    try {
        const isReady = copilotService.isReady();
        const activeSessions = copilotService.getActiveSessions();

        res.json({
            success: true,
            ready: isReady,
            activeSessions: activeSessions,
            sessionCount: activeSessions.length
        });
    } catch (error) {
        log.error(`Error getting copilot status: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to get status: ${error}`
        });
    }
}

/**
 * Chat with context (selected notes)
 * POST /api/copilot/chat-with-context
 */
export async function chatWithContext(req: Request, res: Response) {
    try {
        const { prompt, noteIds, sessionId, streaming } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: "Prompt is required"
            });
        }

        // Build context from selected notes
        let context = "";
        if (noteIds && Array.isArray(noteIds)) {
            const noteContents: Array<{noteId: any; title: any; type: any; content: any}> = [];
            for (const noteId of noteIds) {
                const readResult = await executeTool("read_note", { noteId, includeAttributes: true });
                if (readResult.noteId) {
                    noteContents.push({
                        noteId: readResult.noteId,
                        title: readResult.title,
                        type: readResult.type,
                        content: readResult.content
                    });
                }
            }

            context = `Context Notes:\n${noteContents.map(n => 
                `\n=== ${n.title} (${n.type}) ===\n${n.content}`
            ).join('\n\n')}`;
        }

        // Use existing session or create new one
        const effectiveSessionId = sessionId || `temp-${Date.now()}`;
        if (!copilotService.getSession(effectiveSessionId)) {
            await copilotService.createSession(effectiveSessionId);
        }

        // Send message with context
        const fullPrompt = context ? `${context}\n\nUser Query: ${prompt}` : prompt;
        const response = await copilotService.send(effectiveSessionId, fullPrompt, {
            streaming: streaming || false,
            tools: [...getToolDefinitions(), ...getSpecializedToolDefinitions()],
            onChunk: streaming ? (chunk: string) => {
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            } : undefined
        });

        if (streaming) {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } else {
            res.json({
                success: true,
                response: response.message || response.text || response,
                sessionId: effectiveSessionId,
                contextNoteCount: noteIds?.length || 0
            });
        }
    } catch (error) {
        log.error(`Error in chat with context: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to process chat: ${error}`
        });
    }
}

/**
 * Get list of all sessions with metadata
 * GET /api/copilot/sessions
 */
export function listSessions(req: Request, res: Response) {
    try {
        const sessions = copilotService.getAllSessionsMetadata();
        const globalSessionId = copilotService.getGlobalSession() ? 
            sessions.find(s => s.isGlobal)?.sessionId : null;

        res.json({
            success: true,
            sessions: sessions,
            globalSessionId: globalSessionId,
            count: sessions.length
        });
    } catch (error) {
        log.error(`Error listing sessions: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to list sessions: ${error}`
        });
    }
}

/**
 * Get session details
 * GET /api/copilot/sessions/:sessionId/info
 */
export function getSessionInfo(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;
        const metadata = copilotService.getSessionMetadata(sessionId);

        if (!metadata) {
            return res.status(404).json({
                success: false,
                error: `Session not found: ${sessionId}`
            });
        }

        res.json({
            success: true,
            session: {
                sessionId: metadata.sessionId,
                model: metadata.model,
                name: metadata.name,
                createdAt: metadata.createdAt,
                lastActivityAt: metadata.lastActivityAt,
                messageCount: metadata.messageCount,
                isGlobal: metadata.isGlobal
            }
        });
    } catch (error) {
        log.error(`Error getting session info: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to get session info: ${error}`
        });
    }
}

/**
 * Update session (rename or set as global)
 * PATCH /api/copilot/sessions/:sessionId
 */
export function updateSession(req: Request, res: Response) {
    try {
        const { sessionId } = req.params;
        const { name, setAsGlobal } = req.body;

        if (name !== undefined) {
            copilotService.updateSessionName(sessionId, name);
        }

        if (setAsGlobal === true) {
            copilotService.setGlobalSession(sessionId);
        }

        const metadata = copilotService.getSessionMetadata(sessionId);

        res.json({
            success: true,
            session: metadata ? {
                sessionId: metadata.sessionId,
                model: metadata.model,
                name: metadata.name,
                isGlobal: metadata.isGlobal
            } : null
        });
    } catch (error) {
        log.error(`Error updating session: ${error}`);
        res.status(500).json({
            success: false,
            error: `Failed to update session: ${error}`
        });
    }
}

export default {
    createSession,
    sendMessage,
    executeToolDirectly,
    getTools,
    closeSession,
    getStatus,
    chatWithContext,
    listSessions,
    getSessionInfo,
    updateSession
};

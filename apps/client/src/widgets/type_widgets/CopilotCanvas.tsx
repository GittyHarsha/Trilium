/**
 * Copilot Canvas Widget
 * Canvas-like interface for AI-assisted editing (similar to Gemini/ChatGPT Canvas)
 */

import { useEffect, useRef, useState } from "preact/hooks";
import type { TypeWidgetProps } from "./type_widget";
import server from "../../services/server";
import toastService from "../../services/toast";
import copilotSelection from "../../services/copilot_selection";
import copilotInlineEditor from "../../services/copilot_inline_editor";
import type { SelectionInfo } from "../../services/copilot_selection";
import type { InlineEditSession } from "../../services/copilot_inline_editor";

interface SessionOption {
    sessionId: string;
    name: string;
    isGlobal: boolean;
}

export default function CopilotCanvas({ note, noteContext }: TypeWidgetProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [availableSessions, setAvailableSessions] = useState<SessionOption[]>([]);
    const [useExistingSession, setUseExistingSession] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [response, setResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [contextNotes, setContextNotes] = useState<string[]>([]);
    const [activeSelection, setActiveSelection] = useState<SelectionInfo | null>(null);
    const [useSelection, setUseSelection] = useState(true);
    const [inlineEditMode, setInlineEditMode] = useState(true);
    const [pendingEdit, setPendingEdit] = useState<InlineEditSession | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Load available sessions
    useEffect(() => {
        loadSessions();
    }, []);

    // Subscribe to selection changes
    useEffect(() => {
        const unsubscribe = copilotSelection.onSelectionChange((selection) => {
            setActiveSelection(selection);
        });

        // Set initial selection if any
        setActiveSelection(copilotSelection.getSelection());

        return unsubscribe;
    }, []);

    // Subscribe to inline edit changes
    useEffect(() => {
        const unsubscribe = copilotInlineEditor.onEditChange((edit) => {
            setPendingEdit(edit);
        });

        return unsubscribe;
    }, []);

    const loadSessions = async () => {
        try {
            const resp = await server.get("copilot/sessions");
            if (resp.success && resp.sessions) {
                setAvailableSessions(resp.sessions.map((s: any) => ({
                    sessionId: s.sessionId,
                    name: s.name,
                    isGlobal: s.isGlobal
                })));
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    // Initialize copilot session or use existing
    useEffect(() => {
        if (!useExistingSession || !sessionId) {
            initSession();
        }
    }, [useExistingSession]);

    const initSession = async () => {
        if (useExistingSession && sessionId) {
            // Using an existing session, no need to create new one
            return;
        }

        try {
            const resp = await server.post("copilot/sessions", { 
                model: "gpt-5",
                name: `Note: ${note.title}`
            });
            if (resp.success && resp.sessionId) {
                setSessionId(resp.sessionId);
            }
        } catch (error) {
            console.error("Failed to initialize copilot session:", error);
            toastService.showError("Failed to initialize Copilot");
        }
    };

    const handleSendMessage = async () => {
        if (!prompt.trim() || !sessionId || isProcessing) {
            return;
        }

        setIsProcessing(true);
        setResponse("");

        try {
            // Build prompt with selection context if enabled
            let fullPrompt = prompt.trim();
            if (useSelection && activeSelection) {
                const selectionContext = copilotSelection.formatAsContext();
                fullPrompt = selectionContext + "User Query: " + fullPrompt;
            }

            const resp = await server.post(`copilot/sessions/${sessionId}/send`, {
                prompt: fullPrompt,
                context: contextNotes.length > 0 ? { notes: contextNotes } : undefined
            });

            if (resp.success) {
                // Check if response contains inline edit proposal
                if (resp.toolCalls && resp.toolCalls.length > 0) {
                    const inlineEditCall = resp.toolCalls.find((tc: any) => 
                        tc.result?.proposedContent && tc.result?.originalContent
                    );

                    if (inlineEditCall && inlineEditCall.result) {
                        // Start inline edit session
                        await copilotInlineEditor.startInlineEdit(
                            note.noteId,
                            inlineEditCall.result.originalContent,
                            inlineEditCall.result.proposedContent
                        );
                        
                        toastService.showMessage("Inline edit proposed - review changes below");
                        setResponse(inlineEditCall.result.changeDescription || "Changes proposed");
                    } else {
                        setResponse(resp.response || "");
                    }
                } else {
                    setResponse(resp.response || "");
                }
                
                setPrompt("");
            } else {
                toastService.showError(resp.error || "Failed to send message");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toastService.showError("Failed to communicate with Copilot");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleChatWithContext = async () => {
        if (!prompt.trim() || isProcessing) {
            return;
        }

        setIsProcessing(true);
        setResponse("");

        try {
            // Build prompt with selection context if enabled
            let fullPrompt = prompt.trim();
            if (useSelection && activeSelection) {
                const selectionContext = copilotSelection.formatAsContext();
                fullPrompt = selectionContext + "User Query: " + fullPrompt;
            }

            const resp = await server.post("copilot/chat-with-context", {
                prompt: fullPrompt,
                noteIds: [note.noteId, ...contextNotes],
                sessionId: sessionId || undefined
            });

            if (resp.success) {
                // Check for inline edit proposals in tool calls
                if (resp.toolCalls && resp.toolCalls.length > 0) {
                    const inlineEditCall = resp.toolCalls.find((tc: any) => 
                        tc.result?.proposedContent && tc.result?.originalContent
                    );

                    if (inlineEditCall && inlineEditCall.result) {
                        await copilotInlineEditor.startInlineEdit(
                            note.noteId,
                            inlineEditCall.result.originalContent,
                            inlineEditCall.result.proposedContent
                        );
                        
                        toastService.showMessage("Inline edit proposed - review changes below");
                        setResponse(inlineEditCall.result.changeDescription || "Changes proposed");
                    } else {
                        setResponse(resp.response || "");
                    }
                } else {
                    setResponse(resp.response || "");
                }
                
                setPrompt("");
                
                if (resp.sessionId && !sessionId) {
                    setSessionId(resp.sessionId);
                }
            } else {
                toastService.showError(resp.error || "Failed to send message");
            }
        } catch (error) {
            console.error("Error in chat with context:", error);
            toastService.showError("Failed to communicate with Copilot");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (contextNotes.length > 0 || note.noteId) {
                handleChatWithContext();
            } else {
                handleSendMessage();
            }
        }
    };

    const applyResponseToNote = async () => {
        if (!response) {
            return;
        }

        try {
            await server.put(`notes/${note.noteId}/data`, {
                content: response
            });

            toastService.showMessage("Response applied to note");
            setResponse("");
        } catch (error) {
            console.error("Error applying response:", error);
            toastService.showError("Failed to apply response to note");
        }
    };

    return (
        <div className="copilot-canvas-container" style={{ display: "flex", height: "100%", flexDirection: "column" }}>
            {/* Header */}
            <div style={{ padding: "10px", borderBottom: "1px solid var(--main-border-color)", backgroundColor: "var(--accented-background-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "5px" }}>
                    <div>
                        <h3 style={{ margin: 0 }}>🤖 Copilot Canvas</h3>
                        <p style={{ margin: "5px 0 0 0", fontSize: "0.9em", color: "var(--muted-text-color)" }}>
                            AI-assisted editing for {note.title}
                        </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <label style={{ fontSize: "0.85em", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                            title="When enabled, AI edits will show inline diff preview before applying">
                            <input
                                type="checkbox"
                                checked={inlineEditMode}
                                onChange={(e) => setInlineEditMode((e.target as HTMLInputElement).checked)}
                            />
                            <span style={{ color: inlineEditMode ? "var(--primary-color)" : "var(--muted-text-color)" }}>
                                ✨ Inline Edit Mode
                            </span>
                        </label>
                    </div>
                </div>
                
                {/* Active Selection Indicator */}
                {activeSelection && (
                    <div style={{
                        marginTop: "10px",
                        padding: "8px",
                        backgroundColor: "var(--main-background-color)",
                        border: "1px solid var(--main-border-color)",
                        borderRadius: "4px",
                        borderLeft: "3px solid var(--primary-color)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                            <div style={{ fontSize: "0.85em", fontWeight: "bold", color: "var(--primary-color)" }}>
                                📝 Selection Active
                            </div>
                            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                <label style={{ fontSize: "0.85em", display: "flex", alignItems: "center", gap: "3px" }}>
                                    <input
                                        type="checkbox"
                                        checked={useSelection}
                                        onChange={(e) => setUseSelection((e.target as HTMLInputElement).checked)}
                                    />
                                    Use
                                </label>
                                <button
                                    className="btn btn-sm"
                                    onClick={() => {
                                        copilotSelection.clearSelection();
                                        setActiveSelection(null);
                                    }}
                                    style={{ padding: "2px 6px", fontSize: "0.8em" }}
                                    title="Clear selection"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div style={{ fontSize: "0.8em", color: "var(--muted-text-color)", marginBottom: "3px" }}>
                            From: <strong>{activeSelection.noteTitle}</strong>
                        </div>
                        <div style={{
                            fontSize: "0.8em",
                            fontStyle: "italic",
                            color: "var(--main-text-color)",
                            maxHeight: "60px",
                            overflowY: "auto",
                            padding: "5px",
                            backgroundColor: "var(--accented-background-color)",
                            borderRadius: "2px"
                        }}>
                            "{copilotSelection.formatSelection()}"
                        </div>
                    </div>
                )}
                
                {/* Session Selector */}
                <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.9em" }}>
                        <input
                            type="checkbox"
                            checked={useExistingSession}
                            onChange={(e) => setUseExistingSession((e.target as HTMLInputElement).checked)}
                        />
                        Use existing session
                    </label>
                    {useExistingSession && availableSessions.length > 0 && (
                        <select
                            style={{
                                flex: 1,
                                padding: "4px 8px",
                                border: "1px solid var(--main-border-color)",
                                borderRadius: "4px",
                                backgroundColor: "var(--main-background-color)",
                                color: "var(--main-text-color)"
                            }}
                            value={sessionId || ""}
                            onChange={(e) => setSessionId((e.target as HTMLSelectElement).value)}
                        >
                            <option value="">Select a session...</option>
                            {availableSessions.map(sess => (
                                <option key={sess.sessionId} value={sess.sessionId}>
                                    {sess.isGlobal ? "🌍 " : ""}{sess.name}
                                </option>
                            ))}
                        </select>
                    )}
                    {useExistingSession && availableSessions.length === 0 && (
                        <span style={{ fontSize: "0.9em", color: "var(--muted-text-color)" }}>
                            No sessions available
                        </span>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto", padding: "15px", backgroundColor: "var(--main-background-color)" }}>
                {/* Pending Inline Edit Preview */}
                {pendingEdit && !pendingEdit.applied && (
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{ 
                            padding: "15px", 
                            backgroundColor: "var(--accented-background-color)", 
                            borderRadius: "8px",
                            border: "2px solid var(--primary-color)"
                        }}>
                            <div style={{ marginBottom: "10px", fontWeight: "bold", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "10px" }}>
                                <span>✨ Proposed Changes</span>
                                <span style={{ 
                                    fontSize: "0.8em", 
                                    padding: "2px 8px", 
                                    backgroundColor: "var(--primary-color)", 
                                    color: "white", 
                                    borderRadius: "12px" 
                                }}>
                                    {(() => {
                                        const summary = copilotInlineEditor.getChangeSummary();
                                        const total = summary.added + summary.removed + summary.modified;
                                        return `${total} change${total !== 1 ? 's' : ''}`;
                                    })()}
                                </span>
                            </div>
                            
                            {/* Diff Preview */}
                            <div 
                                style={{ 
                                    marginBottom: "15px",
                                    padding: "10px",
                                    backgroundColor: "var(--main-background-color)",
                                    borderRadius: "4px",
                                    maxHeight: "300px",
                                    overflowY: "auto",
                                    fontSize: "0.85em",
                                    fontFamily: "monospace",
                                    whiteSpace: "pre-wrap"
                                }}
                                dangerouslySetInnerHTML={{ __html: copilotInlineEditor.formatChangesAsHTML() }}
                            />

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button
                                    className="btn btn-sm btn-success"
                                    onClick={async () => {
                                        const applied = await copilotInlineEditor.applyChanges(note.noteId);
                                        if (applied) {
                                            setPendingEdit(null);
                                            toastService.showMessage("Changes applied to note");
                                        }
                                    }}
                                >
                                    ✓ Accept Changes
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => {
                                        copilotInlineEditor.rejectChanges();
                                        setPendingEdit(null);
                                    }}
                                >
                                    ✕ Reject Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {response && !pendingEdit && (
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{ 
                            padding: "15px", 
                            backgroundColor: "var(--accented-background-color)", 
                            borderRadius: "8px",
                            borderLeft: "4px solid var(--main-text-color)"
                        }}>
                            <div style={{ marginBottom: "10px", fontWeight: "bold", color: "var(--main-text-color)" }}>
                                Copilot Response:
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.9em" }}>
                                {response}
                            </div>
                            <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={applyResponseToNote}
                                    title="Apply this content to the current note"
                                >
                                    ✓ Apply to Note
                                </button>
                                <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => {
                                        navigator.clipboard.writeText(response);
                                        toastService.showMessage("Copied to clipboard");
                                    }}
                                    title="Copy to clipboard"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {isProcessing && (
                    <div style={{ textAlign: "center", padding: "20px" }}>
                        <div className="spinner-border" role="status">
                            <span className="sr-only">Processing...</span>
                        </div>
                        <p style={{ marginTop: "10px", color: "var(--muted-text-color)" }}>
                            Copilot is thinking...
                        </p>
                    </div>
                )}

                {!response && !isProcessing && (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--muted-text-color)" }}>
                        <div style={{ fontSize: "3em", marginBottom: "20px" }}>🤖</div>
                        <p>Start a conversation with Copilot</p>
                        <p style={{ fontSize: "0.9em", marginTop: "10px" }}>
                            Ask questions, request edits, or get suggestions for your note
                        </p>
                    </div>
                )}
            </div>

            {/* Context Notes Selector */}
            {contextNotes.length > 0 && (
                <div style={{ padding: "10px", backgroundColor: "var(--accented-background-color)", borderTop: "1px solid var(--main-border-color)" }}>
                    <div style={{ fontSize: "0.9em", marginBottom: "5px", color: "var(--muted-text-color)" }}>
                        Context: {contextNotes.length} note(s)
                    </div>
                    <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        {contextNotes.map((noteId, idx) => (
                            <span key={idx} style={{ 
                                padding: "2px 8px", 
                                backgroundColor: "var(--main-background-color)", 
                                borderRadius: "4px",
                                fontSize: "0.85em"
                            }}>
                                {noteId}
                                <button 
                                    onClick={() => setContextNotes(contextNotes.filter((_, i) => i !== idx))}
                                    style={{ 
                                        marginLeft: "5px", 
                                        border: "none", 
                                        background: "none", 
                                        cursor: "pointer",
                                        color: "var(--muted-text-color)"
                                    }}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div style={{ padding: "15px", borderTop: "1px solid var(--main-border-color)", backgroundColor: "var(--accented-background-color)" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            activeSelection && useSelection
                                ? "Ask about the selected text... (selection will be included automatically)"
                                : "Ask Copilot to help with this note... (Ctrl/Cmd+Enter to send)"
                        }
                        style={{
                            flex: 1,
                            minHeight: "80px",
                            padding: "10px",
                            border: "1px solid var(--main-border-color)",
                            borderRadius: "4px",
                            resize: "vertical",
                            fontFamily: "inherit",
                            fontSize: "1em",
                            backgroundColor: "var(--main-background-color)",
                            color: "var(--main-text-color)"
                        }}
                        disabled={isProcessing}
                    />
                </div>
                <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "0.85em", color: "var(--muted-text-color)" }}>
                        {sessionId ? "✓ Connected" : "Initializing..."}
                        {activeSelection && useSelection && (
                            <span style={{ marginLeft: "10px", color: "var(--primary-color)" }}>
                                • Selection will be included
                            </span>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            className="btn btn-primary"
                            onClick={contextNotes.length > 0 ? handleChatWithContext : handleSendMessage}
                            disabled={!prompt.trim() || !sessionId || isProcessing}
                        >
                            {isProcessing ? "Processing..." : activeSelection && useSelection ? "Send with Selection" : "Send"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

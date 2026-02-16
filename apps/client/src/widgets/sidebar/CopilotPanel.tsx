/**
 * Universal Copilot Panel
 * Right panel widget for AI assistance on ANY note type
 * Replaces the separate copilotCanvas note type with integrated assistant
 */

import { useEffect, useRef, useState } from "preact/hooks";
import server from "../../services/server";
import toastService from "../../services/toast";
import copilotSelection from "../../services/copilot_selection";
import copilotInlineEditor from "../../services/copilot_inline_editor";
import RightPanelWidget from "./RightPanelWidget";
import ActionButton from "../react/ActionButton";
import { useActiveNoteContext, useNoteProperty } from "../react/hooks";
import type { SelectionInfo } from "../../services/copilot_selection";
import type { InlineEditSession } from "../../services/copilot_inline_editor";

interface SessionOption {
    sessionId: string;
    name: string;
    isGlobal: boolean;
}

export default function CopilotPanel() {
    const { note } = useActiveNoteContext();
    const noteTitle = useNoteProperty(note, "title");
    const noteType = useNoteProperty(note, "type");
    
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [availableSessions, setAvailableSessions] = useState<SessionOption[]>([]);
    const [prompt, setPrompt] = useState("");
    const [response, setResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeSelection, setActiveSelection] = useState<SelectionInfo | null>(null);
    const [useSelection, setUseSelection] = useState(true);
    const [inlineEditMode, setInlineEditMode] = useState(true);
    const [pendingEdit, setPendingEdit] = useState<InlineEditSession | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Load sessions and find global session
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const resp = await server.get("copilot/sessions");
            if (resp.success && resp.sessions) {
                const sessions = resp.sessions.map((s: any) => ({
                    sessionId: s.sessionId,
                    name: s.name,
                    isGlobal: s.isGlobal
                }));
                setAvailableSessions(sessions);
                
                // Auto-select global session if exists and no session selected
                if (!sessionId && resp.globalSessionId) {
                    setSessionId(resp.globalSessionId);
                }
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    // Subscribe to selection changes
    useEffect(() => {
        const unsubscribe = copilotSelection.onSelectionChange((selection) => {
            setActiveSelection(selection);
        });
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

    // Create session if needed
    const ensureSession = async () => {
        if (sessionId) return sessionId;
        
        // Try to find global session
        const globalSession = availableSessions.find(s => s.isGlobal);
        if (globalSession) {
            setSessionId(globalSession.sessionId);
            return globalSession.sessionId;
        }
        
        // Create new session
        try {
            const resp = await server.post("copilot/sessions", {
                model: "gpt-5",
                name: "Auto Session",
                isGlobal: false
            });
            if (resp.success && resp.sessionId) {
                setSessionId(resp.sessionId);
                await loadSessions();
                return resp.sessionId;
            }
        } catch (error) {
            console.error("Failed to create session:", error);
            toastService.showError("Failed to create Copilot session");
        }
        return null;
    };

    const handleSendMessage = async () => {
        if (!prompt.trim() || isProcessing || !note) {
            return;
        }

        const activeSessionId = await ensureSession();
        if (!activeSessionId) return;

        setIsProcessing(true);
        setResponse("");

        try {
            // Build prompt with context
            let fullPrompt = prompt.trim();
            
            // Add selection context if available
            if (useSelection && activeSelection) {
                const selectionContext = copilotSelection.formatAsContext();
                fullPrompt = selectionContext + "User Query: " + fullPrompt;
            }
            
            // Add instruction for inline editing if enabled
            if (inlineEditMode) {
                fullPrompt = `[INLINE EDIT MODE] Please use the 'propose_inline_edit' tool to suggest changes to the note.\n\nCurrent note type: ${noteType}\nCurrent note title: ${noteTitle}\n\n` + fullPrompt;
            }

            const resp = await server.post(`copilot/sessions/${activeSessionId}/send`, {
                prompt: fullPrompt,
                context: { currentNoteId: note.noteId }
            });

            if (resp.success) {
                // Check for inline edit proposals
                if (resp.toolCalls && resp.toolCalls.length > 0) {
                    const inlineEditCall = resp.toolCalls.find((tc: any) => 
                        tc.result?.proposedContent && tc.result?.originalContent
                    );

                    if (inlineEditCall && inlineEditCall.result && inlineEditMode) {
                        await copilotInlineEditor.startInlineEdit(
                            note.noteId,
                            inlineEditCall.result.originalContent,
                            inlineEditCall.result.proposedContent
                        );
                        
                        setResponse(inlineEditCall.result.changeDescription || "Changes proposed");
                    } else {
                        setResponse(resp.response || JSON.stringify(resp.toolCalls));
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

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!note) {
        return (
            <RightPanelWidget id="copilot-panel" title="Copilot Assistant">
                <div style={{ padding: "20px", textAlign: "center", color: "var(--muted-text-color)" }}>
                    <p>No note selected</p>
                </div>
            </RightPanelWidget>
        );
    }

    return (
        <RightPanelWidget 
            id="copilot-panel" 
            title="Copilot Assistant"
            buttons={
                <ActionButton
                    icon="bx bx-refresh"
                    text=""
                    title="Refresh sessions"
                    onClick={loadSessions}
                />
            }
        >
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: "400px" }}>
                {/* Current Note Info */}
                <div style={{ padding: "10px", backgroundColor: "var(--main-background-color)", borderBottom: "1px solid var(--main-border-color)" }}>
                    <div style={{ fontSize: "0.85em", color: "var(--muted-text-color)", marginBottom: "5px" }}>
                        Working on:
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "0.95em" }}>
                        {noteTitle} <span style={{ color: "var(--muted-text-color)", fontSize: "0.9em" }}>({noteType})</span>
                    </div>
                </div>

                {/* Settings Bar */}
                <div style={{ padding: "8px 10px", backgroundColor: "var(--accented-background-color)", borderBottom: "1px solid var(--main-border-color)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Session Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "0.85em", minWidth: "55px" }}>Session:</span>
                        <select
                            style={{
                                flex: 1,
                                padding: "3px 6px",
                                border: "1px solid var(--main-border-color)",
                                borderRadius: "4px",
                                backgroundColor: "var(--main-background-color)",
                                color: "var(--main-text-color)",
                                fontSize: "0.85em"
                            }}
                            value={sessionId || ""}
                            onChange={(e) => setSessionId((e.target as HTMLSelectElement).value)}
                        >
                            <option value="">Auto (create if needed)</option>
                            {availableSessions.map(sess => (
                                <option key={sess.sessionId} value={sess.sessionId}>
                                    {sess.isGlobal ? "🌍 " : "💬 "}{sess.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Inline Edit Mode Toggle */}
                    <label style={{ fontSize: "0.85em", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}
                        title="Show diff preview before applying changes">
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

                {/* Active Selection */}
                {activeSelection && (
                    <div style={{ padding: "8px 10px", backgroundColor: "var(--info-background-color)", borderBottom: "1px solid var(--main-border-color)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontSize: "0.85em", fontWeight: "bold", color: "var(--primary-color)" }}>
                                📝 Selection Active
                            </span>
                            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                                <label style={{ fontSize: "0.8em", display: "flex", alignItems: "center", gap: "3px" }}>
                                    <input
                                        type="checkbox"
                                        checked={useSelection}
                                        onChange={(e) => setUseSelection((e.target as HTMLInputElement).checked)}
                                    />
                                    Use
                                </label>
                                <button
                                    className="btn btn-sm"
                                    onClick={() => copilotSelection.clearSelection()}
                                    style={{ padding: "1px 4px", fontSize: "0.75em" }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div style={{ fontSize: "0.75em", fontStyle: "italic", color: "var(--muted-text-color)" }}>
                            "{copilotSelection.formatSelection()}"
                        </div>
                    </div>
                )}

                {/* Chat Area */}
                <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                    {/* Pending Inline Edit */}
                    {pendingEdit && !pendingEdit.applied && (
                        <div style={{ marginBottom: "10px" }}>
                            <div style={{ 
                                padding: "10px", 
                                backgroundColor: "var(--accented-background-color)", 
                                borderRadius: "4px",
                                border: "2px solid var(--primary-color)"
                            }}>
                                <div style={{ marginBottom: "8px", fontWeight: "bold", color: "var(--primary-color)", fontSize: "0.9em" }}>
                                    ✨ Proposed Changes {(() => {
                                        const summary = copilotInlineEditor.getChangeSummary();
                                        const total = summary.added + summary.removed + summary.modified;
                                        return `(${total})`;
                                    })()}
                                </div>
                                
                                <div 
                                    style={{ 
                                        marginBottom: "10px",
                                        padding: "8px",
                                        backgroundColor: "var(--main-background-color)",
                                        borderRadius: "2px",
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                        fontSize: "0.75em",
                                        fontFamily: "monospace"
                                    }}
                                    dangerouslySetInnerHTML={{ __html: copilotInlineEditor.formatChangesAsHTML() }}
                                />

                                <div style={{ display: "flex", gap: "5px" }}>
                                    <button
                                        className="btn btn-sm btn-success"
                                        onClick={async () => {
                                            const applied = await copilotInlineEditor.applyChanges(note!.noteId);
                                            if (applied) {
                                                setPendingEdit(null);
                                            }
                                        }}
                                        style={{ fontSize: "0.8em" }}
                                    >
                                        ✓ Accept
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => {
                                            copilotInlineEditor.rejectChanges();
                                            setPendingEdit(null);
                                        }}
                                        style={{ fontSize: "0.8em" }}
                                    >
                                        ✕ Reject
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Response Area */}
                    {response && !pendingEdit && (
                        <div style={{ marginBottom: "10px" }}>
                            <div style={{ 
                                padding: "10px", 
                                backgroundColor: "var(--accented-background-color)", 
                                borderRadius: "4px",
                                borderLeft: "3px solid var(--main-text-color)"
                            }}>
                                <div style={{ marginBottom: "5px", fontWeight: "bold", fontSize: "0.85em" }}>
                                    Response:
                                </div>
                                <div style={{ whiteSpace: "pre-wrap", fontSize: "0.85em", lineHeight: "1.4" }}>
                                    {response}
                                </div>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div style={{ textAlign: "center", padding: "20px" }}>
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            <p style={{ marginTop: "8px", fontSize: "0.85em", color: "var(--muted-text-color)" }}>
                                Thinking...
                            </p>
                        </div>
                    )}

                    {!response && !isProcessing && !pendingEdit && (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--muted-text-color)" }}>
                            <div style={{ fontSize: "2em", marginBottom: "10px" }}>🤖</div>
                            <p style={{ fontSize: "0.85em" }}>Ask me anything about this note</p>
                            <p style={{ fontSize: "0.75em", marginTop: "5px" }}>
                                {activeSelection ? "Selection will be included" : "Select text for context"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div style={{ padding: "10px", borderTop: "1px solid var(--main-border-color)", backgroundColor: "var(--accented-background-color)" }}>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            activeSelection && useSelection
                                ? "Ask about selection..."
                                : inlineEditMode
                                ? "Request edits (will show diff)..."
                                : "Ask me anything..."
                        }
                        style={{
                            width: "100%",
                            minHeight: "60px",
                            padding: "8px",
                            border: "1px solid var(--main-border-color)",
                            borderRadius: "4px",
                            resize: "vertical",
                            fontFamily: "inherit",
                            fontSize: "0.9em",
                            backgroundColor: "var(--main-background-color)",
                            color: "var(--main-text-color)",
                            marginBottom: "8px"
                        }}
                        disabled={isProcessing}
                    />
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: "0.75em", color: "var(--muted-text-color)" }}>
                            {sessionId ? (
                                <>
                                    ✓ {availableSessions.find(s => s.sessionId === sessionId)?.name || "Connected"}
                                </>
                            ) : "No session"}
                        </div>
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={handleSendMessage}
                            disabled={!prompt.trim() || isProcessing}
                            style={{ fontSize: "0.85em" }}
                        >
                            {isProcessing ? "..." : activeSelection && useSelection ? "Send with Selection" : "Send"}
                        </button>
                    </div>
                </div>
            </div>
        </RightPanelWidget>
    );
}

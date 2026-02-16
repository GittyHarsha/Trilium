/**
 * Universal Copilot Panel
 * Right panel widget for AI assistance on ANY note type
 * Replaces the separate copilotCanvas note type with integrated assistant
 */

import "./CopilotPanel.css";

import { useEffect, useRef, useState } from "preact/hooks";
import server from "../../services/server";
import toastService from "../../services/toast";
import copilotSelection from "../../services/copilot_selection";
import copilotInlineEditor from "../../services/copilot_inline_editor";
import RightPanelWidget from "./RightPanelWidget";
import ActionButton from "../react/ActionButton";
import NoteAutocomplete from "../react/NoteAutocomplete";
import { useActiveNoteContext, useNoteProperty } from "../react/hooks";
import type { SelectionInfo } from "../../services/copilot_selection";
import type { InlineEditSession } from "../../services/copilot_inline_editor";
import froca from "../../services/froca";
import clsx from "clsx";

interface SessionOption {
    sessionId: string;
    name: string;
    isGlobal: boolean;
}

interface ContextNote {
    noteId: string;
    title: string;
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
    const [contextNotes, setContextNotes] = useState<ContextNote[]>([]);
    const [noteSearchText, setNoteSearchText] = useState("");
    const [copilotEnabled, setCopilotEnabled] = useState<boolean | null>(null); // null = checking, true/false = known
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Check copilot status on mount
    useEffect(() => {
        checkCopilotStatus();
    }, []);

    const checkCopilotStatus = async () => {
        try {
            const resp = await server.get("copilot/status");
            if (resp.success) {
                setCopilotEnabled(resp.enabled === true);
                if (resp.enabled) {
                    // Only load sessions if copilot is enabled
                    loadSessions();
                }
            }
        } catch (error) {
            console.error("Failed to check copilot status:", error);
            setCopilotEnabled(false);
        }
    };

    // Load sessions and find global session
    useEffect(() => {
        if (copilotEnabled) {
            loadSessions();
        }
    }, [copilotEnabled]);

    const loadSessions = async () => {
        if (!copilotEnabled) return;
        
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
        if (!copilotEnabled) {
            toastService.showError("Copilot feature is not enabled. Please enable it in Options.");
            return null;
        }
        
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

    // Add note to context
    const addContextNote = async (noteId: string) => {
        if (!noteId) return;
        
        // Check if already in context
        if (contextNotes.some(n => n.noteId === noteId)) {
            toastService.showMessage("Note already in context");
            return;
        }

        // Get note details
        const contextNote = await froca.getNote(noteId);
        if (!contextNote) {
            toastService.showError("Note not found");
            return;
        }

        setContextNotes([...contextNotes, {
            noteId: noteId,
            title: contextNote.title
        }]);
        
        // Clear the search text to reset autocomplete
        setNoteSearchText("");
        
        toastService.showMessage(`Added "${contextNote.title}" to context`);
    };

    // Remove note from context
    const removeContextNote = (noteId: string) => {
        setContextNotes(contextNotes.filter(n => n.noteId !== noteId));
    };

    // Clear all context notes
    const clearContextNotes = () => {
        setContextNotes([]);
        toastService.showMessage("Context cleared");
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
                context: { 
                    currentNoteId: note.noteId,
                    contextNoteIds: contextNotes.map(n => n.noteId)
                }
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
                <div className="copilot-empty-state">
                    <p>No note selected</p>
                </div>
            </RightPanelWidget>
        );
    }

    // Show checking state
    if (copilotEnabled === null) {
        return (
            <RightPanelWidget id="copilot-panel" title="Copilot Assistant">
                <div className="copilot-empty-state">
                    <p>Checking Copilot status...</p>
                </div>
            </RightPanelWidget>
        );
    }

    // Show disabled state with instructions
    if (copilotEnabled === false) {
        return (
            <RightPanelWidget id="copilot-panel" title="Copilot Assistant">
                <div className="copilot-empty-state">
                    <h3>Copilot Feature Not Enabled</h3>
                    <p>The GitHub Copilot integration is currently disabled.</p>
                    <p><strong>To enable:</strong></p>
                    <ol style={{ textAlign: "left", marginLeft: "20px" }}>
                        <li>Go to <strong>Options</strong> → <strong>Advanced</strong></li>
                        <li>Find the <strong>copilotEnabled</strong> option</li>
                        <li>Set it to <strong>true</strong></li>
                        <li>Restart or reload Trilium</li>
                    </ol>
                    <ActionButton
                        icon="bx bx-refresh"
                        text="Check Again"
                        title="Check if copilot is now enabled"
                        onClick={checkCopilotStatus}
                    />
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
            <div className="copilot-panel">
                {/* Current Note Info */}
                <div className="copilot-panel-header">
                    <div className="copilot-panel-header-content">
                        <div>
                            <div className="copilot-panel-note-info">
                                Working on:
                            </div>
                            <div className="copilot-panel-note-title">
                                {noteTitle} <span className="copilot-panel-note-type">({noteType})</span>
                            </div>
                        </div>
                        <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => note && addContextNote(note.noteId)}
                            disabled={!note || contextNotes.some(n => n.noteId === note.noteId)}
                            title="Add current note to context"
                        >
                            + Context
                        </button>
                    </div>
                </div>


                {/* Settings Bar */}
                <div className="copilot-panel-settings">
                    {/* Session Selector */}
                    <div className="copilot-panel-session-selector">
                        <label>Session:</label>
                        <select
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
                    <label 
                        className={clsx("copilot-panel-inline-mode-toggle", {
                            enabled: inlineEditMode,
                            disabled: !inlineEditMode
                        })}
                        title="Show diff preview before applying changes"
                    >
                        <input
                            type="checkbox"
                            checked={inlineEditMode}
                            onChange={(e) => setInlineEditMode((e.target as HTMLInputElement).checked)}
                        />
                        <span>✨ Inline Edit Mode</span>
                    </label>
                </div>


                {/* Active Selection */}
                {activeSelection && (
                    <div className="copilot-selection-info">
                        <div className="copilot-selection-header">
                            <span className="copilot-selection-label">
                                📝 Selection Active
                            </span>
                            <div className="copilot-selection-controls">
                                <label>
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
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="copilot-selection-text">
                            "{copilotSelection.formatSelection()}"
                        </div>
                    </div>
                )}

                {/* Context Notes Selector */}
                <div className="copilot-context-section">
                    <div className="copilot-context-header">
                        <span className="copilot-context-title">
                            📚 Context Notes ({contextNotes.length})
                        </span>
                        {contextNotes.length > 0 && (
                            <button
                                className="btn btn-sm"
                                onClick={clearContextNotes}
                                title="Clear all context"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Add Note to Context */}
                    <div className="copilot-context-search">
                        <div className="copilot-context-search-input">
                            <NoteAutocomplete
                                placeholder="Search notes to add as context..."
                                text={noteSearchText}
                                onTextChange={setNoteSearchText}
                                noteIdChanged={(selectedNoteId) => {
                                    if (selectedNoteId) {
                                        addContextNote(selectedNoteId);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* List of Context Notes */}
                    {contextNotes.length > 0 && (
                        <div className="copilot-context-notes">
                            {contextNotes.map(ctxNote => (
                                <div key={ctxNote.noteId} className="copilot-context-note">
                                    <span className="copilot-context-note-title">
                                        📄 {ctxNote.title}
                                    </span>
                                    <button
                                        className="copilot-context-note-remove"
                                        onClick={() => removeContextNote(ctxNote.noteId)}
                                        title="Remove from context"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Chat Area */}
                <div ref={chatContainerRef} className="copilot-chat-area">
                    {/* Pending Inline Edit */}
                    {pendingEdit && !pendingEdit.applied && (
                        <div className="copilot-diff-preview">
                            {(() => {
                                const summary = copilotInlineEditor.getChangeSummary();
                                const totalChanges = summary.added + summary.removed + summary.modified;
                                return (
                                    <div className="copilot-diff-header">
                                        ✨ Proposed Changes ({totalChanges})
                                    </div>
                                );
                            })()}
                            
                            <div 
                                className="copilot-diff-content"
                                dangerouslySetInnerHTML={{ __html: copilotInlineEditor.formatChangesAsHTML() }}
                            />

                            <div className="copilot-diff-buttons">
                                <button
                                    className="btn btn-sm btn-success"
                                    onClick={async () => {
                                        const applied = await copilotInlineEditor.applyChanges(note!.noteId);
                                        if (applied) {
                                            setPendingEdit(null);
                                        }
                                    }}
                                >
                                    ✓ Accept
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => {
                                        copilotInlineEditor.rejectChanges();
                                        setPendingEdit(null);
                                    }}
                                >
                                    ✕ Reject
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Response Area */}
                    {response && !pendingEdit && (
                        <div className="copilot-response">
                            <div className="copilot-response-header">
                                Response:
                            </div>
                            <div className="copilot-response-content">
                                {response}
                            </div>
                        </div>
                    )}


                    {isProcessing && (
                        <div className="copilot-processing">
                            <div className="spinner-border spinner-border-sm" role="status"></div>
                            <p className="copilot-processing-text">
                                Thinking...
                            </p>
                        </div>
                    )}

                    {!response && !isProcessing && !pendingEdit && (
                        <div className="copilot-empty-state">
                            <div className="copilot-empty-state-icon">🤖</div>
                            <p className="copilot-empty-state-text">Ask me anything about this note</p>
                            <p className="copilot-empty-state-hint">
                                {activeSelection ? "Selection will be included" : "Select text for context"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="copilot-input-area">
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
                        disabled={isProcessing}
                    />
                    
                    <div className="copilot-input-footer">
                        <div className="copilot-input-status">
                            {sessionId ? (
                                <>
                                    ✓ {availableSessions.find(s => s.sessionId === sessionId)?.name || "Connected"}
                                    {contextNotes.length > 0 && (
                                        <span className="context-count">
                                            • {contextNotes.length} context note{contextNotes.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </>
                            ) : "No session"}
                        </div>
                        <button
                            className="btn btn-sm btn-primary"
                            onClick={handleSendMessage}
                            disabled={!prompt.trim() || isProcessing}
                        >
                            {isProcessing ? "..." : activeSelection && useSelection ? "Send with Selection" : "Send"}
                        </button>
                    </div>
                </div>
            </div>
        </RightPanelWidget>
    );
}

/**
 * Copilot Canvas Widget
 * Canvas-like interface for AI-assisted editing (similar to Gemini/ChatGPT Canvas)
 */

import { useEffect, useRef, useState } from "preact/hooks";
import type { TypeWidgetProps } from "./type_widget";
import server from "../../services/server";
import toastService from "../../services/toast";

export default function CopilotCanvas({ note, noteContext }: TypeWidgetProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const [response, setResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [contextNotes, setContextNotes] = useState<string[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Initialize copilot session
    useEffect(() => {
        initSession();
    }, []);

    const initSession = async () => {
        try {
            const resp = await server.post("copilot/sessions", { model: "gpt-5" });
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
            const resp = await server.post(`copilot/sessions/${sessionId}/send`, {
                prompt: prompt.trim(),
                context: contextNotes.length > 0 ? { notes: contextNotes } : undefined
            });

            if (resp.success) {
                setResponse(resp.response || "");
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
            const resp = await server.post("copilot/chat-with-context", {
                prompt: prompt.trim(),
                noteIds: [note.noteId, ...contextNotes],
                sessionId: sessionId || undefined
            });

            if (resp.success) {
                setResponse(resp.response || "");
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
                <h3 style={{ margin: 0 }}>🤖 Copilot Canvas</h3>
                <p style={{ margin: "5px 0 0 0", fontSize: "0.9em", color: "var(--muted-text-color)" }}>
                    AI-assisted editing for {note.title}
                </p>
            </div>

            {/* Chat Area */}
            <div ref={chatContainerRef} style={{ flex: 1, overflowY: "auto", padding: "15px", backgroundColor: "var(--main-background-color)" }}>
                {response && (
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
                        placeholder="Ask Copilot to help with this note... (Ctrl/Cmd+Enter to send)"
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
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button
                            className="btn btn-primary"
                            onClick={contextNotes.length > 0 ? handleChatWithContext : handleSendMessage}
                            disabled={!prompt.trim() || !sessionId || isProcessing}
                        >
                            {isProcessing ? "Processing..." : "Send"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Copilot Session Manager
 * Right panel widget for managing Copilot sessions
 */

import "./CopilotSessionManager.css";

import { useEffect, useState } from "preact/hooks";
import server from "../../services/server";
import toastService from "../../services/toast";
import RightPanelWidget from "./RightPanelWidget";
import ActionButton from "../react/ActionButton";
import clsx from "clsx";

interface SessionMetadata {
    sessionId: string;
    model: string;
    name: string;
    createdAt: number;
    lastActivityAt: number;
    messageCount: number;
    isGlobal: boolean;
}

interface SessionsResponse {
    success: boolean;
    sessions: SessionMetadata[];
    globalSessionId: string | null;
    count: number;
}

function formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

export default function CopilotSessionManager() {
    const [sessions, setSessions] = useState<SessionMetadata[]>([]);
    const [globalSessionId, setGlobalSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loadSessions = async () => {
        try {
            const response = await server.get<SessionsResponse>("copilot/sessions");
            if (response.success) {
                setSessions(response.sessions);
                setGlobalSessionId(response.globalSessionId);
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    useEffect(() => {
        loadSessions();
        // Refresh sessions every 10 seconds
        const interval = setInterval(loadSessions, 10000);
        return () => clearInterval(interval);
    }, []);

    const createGlobalSession = async () => {
        setLoading(true);
        try {
            const response = await server.post("copilot/sessions", {
                model: "gpt-5",
                name: "Global Session",
                isGlobal: true
            });

            if (response.success) {
                toastService.showMessage("Global session created");
                await loadSessions();
            } else {
                toastService.showError(response.error || "Failed to create session");
            }
        } catch (error) {
            console.error("Error creating session:", error);
            toastService.showError("Failed to create session");
        } finally {
            setLoading(false);
        }
    };

    const setAsGlobal = async (sessionId: string) => {
        try {
            const response = await server.patch(`copilot/sessions/${sessionId}`, {
                setAsGlobal: true
            });

            if (response.success) {
                toastService.showMessage("Set as global session");
                await loadSessions();
            } else {
                toastService.showError(response.error || "Failed to update session");
            }
        } catch (error) {
            console.error("Error setting global session:", error);
            toastService.showError("Failed to update session");
        }
    };

    const renameSession = async (sessionId: string) => {
        const currentSession = sessions.find(s => s.sessionId === sessionId);
        if (!currentSession) return;

        const newName = prompt("Enter new session name:", currentSession.name);
        if (!newName || newName === currentSession.name) return;

        try {
            const response = await server.patch(`copilot/sessions/${sessionId}`, {
                name: newName
            });

            if (response.success) {
                toastService.showMessage("Session renamed");
                await loadSessions();
            } else {
                toastService.showError(response.error || "Failed to rename session");
            }
        } catch (error) {
            console.error("Error renaming session:", error);
            toastService.showError("Failed to rename session");
        }
    };

    const closeSession = async (sessionId: string) => {
        if (!confirm("Are you sure you want to close this session?")) return;

        try {
            const response = await server.remove(`copilot/sessions/${sessionId}`);

            if (response.success) {
                toastService.showMessage("Session closed");
                await loadSessions();
            } else {
                toastService.showError(response.error || "Failed to close session");
            }
        } catch (error) {
            console.error("Error closing session:", error);
            toastService.showError("Failed to close session");
        }
    };

    return (
        <RightPanelWidget
            id="copilot-session-manager"
            title="Copilot Sessions"
            buttons={
                <ActionButton
                    icon="bx bx-refresh"
                    text=""
                    title="Refresh sessions"
                    onClick={loadSessions}
                />
            }
        >
            <div className="copilot-sessions-content">
                <button
                    className="btn btn-sm btn-primary copilot-sessions-create-button"
                    onClick={createGlobalSession}
                    disabled={loading}
                >
                    <i className="bx bx-plus"></i> New Global Session
                </button>

                {sessions.length === 0 ? (
                    <div className="copilot-session-empty">
                        <i className="bx bx-ghost copilot-session-empty-icon"></i>
                        <p className="copilot-session-empty-text">No active sessions</p>
                        <p className="copilot-session-empty-hint">Create a global session to get started</p>
                    </div>
                ) : (
                    <div className="copilot-session-list">
                        {sessions.map(session => (
                            <div
                                key={session.sessionId}
                                className={clsx("copilot-session-item", {
                                    global: session.isGlobal
                                })}
                            >
                                <div className="copilot-session-header">
                                    <span className="copilot-session-icon">
                                        {session.isGlobal ? "🌍" : "💬"}
                                    </span>
                                    <strong className="copilot-session-name">{session.name}</strong>
                                </div>

                                <div className="copilot-session-meta">
                                    {session.model} • {session.messageCount} msgs • {formatTimestamp(session.lastActivityAt)}
                                </div>

                                <div className="copilot-session-buttons">
                                    {!session.isGlobal && (
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => setAsGlobal(session.sessionId)}
                                            title="Set as global session"
                                        >
                                            <i className="bx bx-globe"></i> Set Global
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => renameSession(session.sessionId)}
                                        title="Rename session"
                                    >
                                        <i className="bx bx-edit"></i>
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() => closeSession(session.sessionId)}
                                        title="Close session"
                                    >
                                        <i className="bx bx-x"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </RightPanelWidget>
    );
}

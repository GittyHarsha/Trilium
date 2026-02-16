import { CopilotClient, CopilotSession } from "@github/copilot-sdk";
import log from "../log.js";
import optionsService from "../options.js";
import EventEmitter from "events";

/**
 * Metadata for a Copilot session
 */
interface SessionMetadata {
    sessionId: string;
    session: CopilotSession;
    model: string;
    name: string;
    createdAt: number;
    lastActivityAt: number;
    messageCount: number;
    isGlobal: boolean;
}

/**
 * Service for managing GitHub Copilot SDK integration
 * Provides agentic AI capabilities for note reading, editing, and manipulation
 */
class CopilotService extends EventEmitter {
    private client: CopilotClient | null = null;
    private sessions: Map<string, SessionMetadata> = new Map();
    private isInitialized: boolean = false;
    private initPromise: Promise<void> | null = null;
    private globalSessionId: string | null = null;

    constructor() {
        super();
    }

    /**
     * Initialize the Copilot client
     */
    async init(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInit();
        return this.initPromise;
    }

    private async _doInit(): Promise<void> {
        try {
            const enabled = optionsService.getOptionBool("copilotEnabled");
            if (!enabled) {
                log.info("Copilot service is disabled in options");
                return;
            }

            log.info("Initializing GitHub Copilot SDK...");
            
            // Create copilot client
            this.client = new CopilotClient();
            
            // Start the copilot agent process
            await this.client.start();
            
            this.isInitialized = true;
            log.info("GitHub Copilot SDK initialized successfully");
            
            this.emit("initialized");
        } catch (error) {
            log.error(`Failed to initialize Copilot SDK: ${error}`);
            throw error;
        } finally {
            this.initPromise = null;
        }
    }

    /**
     * Create a new copilot session
     * @param sessionId - Unique identifier for the session
     * @param model - LLM model to use (e.g., "gpt-5", "claude-sonnet")
     * @param name - Display name for the session
     * @param isGlobal - Whether this is a global session
     * @returns CopilotSession instance
     */
    async createSession(sessionId: string, model?: string, name?: string, isGlobal?: boolean): Promise<CopilotSession> {
        await this.init();

        if (!this.client) {
            const enabled = optionsService.getOptionBool("copilotEnabled");
            if (!enabled) {
                throw new Error("Copilot service is not enabled. Please enable 'copilotEnabled' option in settings.");
            }
            throw new Error("Copilot client not initialized. Please check server logs for initialization errors.");
        }

        // Check if session already exists
        if (this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId)!.session;
        }

        log.info(`Creating new Copilot session: ${sessionId} with model: ${model || "default"}`);
        
        const session = await this.client.createSession({
            model: model || optionsService.getOption("copilotModel") || undefined
        });

        const metadata: SessionMetadata = {
            sessionId,
            session,
            model: model || optionsService.getOption("copilotModel") || "gpt-5",
            name: name || `Session ${sessionId.substring(0, 8)}`,
            createdAt: Date.now(),
            lastActivityAt: Date.now(),
            messageCount: 0,
            isGlobal: isGlobal || false
        };

        this.sessions.set(sessionId, metadata);
        
        if (isGlobal) {
            this.globalSessionId = sessionId;
        }
        
        this.emit("sessionCreated", { sessionId, model, name, isGlobal });
        
        return session;
    }

    /**
     * Get an existing session
     * @param sessionId - Session identifier
     * @returns CopilotSession or null if not found
     */
    getSession(sessionId: string): CopilotSession | null {
        const metadata = this.sessions.get(sessionId);
        return metadata ? metadata.session : null;
    }

    /**
     * Get session metadata
     * @param sessionId - Session identifier
     * @returns SessionMetadata or null if not found
     */
    getSessionMetadata(sessionId: string): SessionMetadata | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Get all sessions with metadata
     * @returns Array of session metadata
     */
    getAllSessionsMetadata(): Array<Omit<SessionMetadata, 'session'>> {
        return Array.from(this.sessions.values()).map(({ session, ...metadata }) => metadata);
    }

    /**
     * Get the global session
     * @returns CopilotSession or null if no global session exists
     */
    getGlobalSession(): CopilotSession | null {
        if (!this.globalSessionId) {
            return null;
        }
        return this.getSession(this.globalSessionId);
    }

    /**
     * Set a session as global
     * @param sessionId - Session identifier
     */
    setGlobalSession(sessionId: string): void {
        const metadata = this.sessions.get(sessionId);
        if (!metadata) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        // Unset previous global session
        if (this.globalSessionId) {
            const prevGlobal = this.sessions.get(this.globalSessionId);
            if (prevGlobal) {
                prevGlobal.isGlobal = false;
            }
        }

        // Set new global session
        metadata.isGlobal = true;
        this.globalSessionId = sessionId;
        
        this.emit("globalSessionChanged", { sessionId });
    }

    /**
     * Update session name
     * @param sessionId - Session identifier
     * @param name - New name for the session
     */
    updateSessionName(sessionId: string, name: string): void {
        const metadata = this.sessions.get(sessionId);
        if (!metadata) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        metadata.name = name;
        this.emit("sessionUpdated", { sessionId, name });
    }

    /**
     * Send a message to a copilot session
     * @param sessionId - Session identifier
     * @param prompt - The prompt to send
     * @param options - Additional options (streaming, tools, etc.)
     * @returns Response from copilot
     */
    async send(
        sessionId: string,
        prompt: string,
        options?: {
            streaming?: boolean;
            onChunk?: (chunk: string) => void;
            tools?: any[];
            context?: any;
        }
    ): Promise<any> {
        const metadata = this.sessions.get(sessionId);
        if (!metadata) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        log.info(`Sending message to Copilot session ${sessionId}`);
        
        try {
            const response = await metadata.session.send({
                prompt,
                ...(options?.streaming && { streaming: true }),
                ...(options?.tools && { tools: options.tools }),
                ...(options?.context && { context: options.context })
            });

            // Update metadata
            metadata.lastActivityAt = Date.now();
            metadata.messageCount++;

            if (options?.streaming && options?.onChunk) {
                // Handle streaming response
                // Note: Actual streaming implementation depends on SDK version
                return response;
            }

            return response;
        } catch (error) {
            log.error(`Error sending message to Copilot: ${error}`);
            throw error;
        }
    }

    /**
     * Close a specific session
     * @param sessionId - Session identifier
     */
    async closeSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            log.info(`Closing Copilot session: ${sessionId}`);
            this.sessions.delete(sessionId);
            this.emit("sessionClosed", { sessionId });
        }
    }

    /**
     * Shutdown the copilot service
     */
    async shutdown(): Promise<void> {
        log.info("Shutting down Copilot service...");
        
        // Close all sessions
        for (const sessionId of this.sessions.keys()) {
            await this.closeSession(sessionId);
        }

        // Stop the client
        if (this.client) {
            // Note: SDK might not have explicit stop method
            // await this.client.stop();
            this.client = null;
        }

        this.isInitialized = false;
        log.info("Copilot service shut down");
        this.emit("shutdown");
    }

    /**
     * Check if copilot is enabled and initialized
     */
    isReady(): boolean {
        return this.isInitialized && this.client !== null;
    }

    /**
     * Get list of active session IDs
     */
    getActiveSessions(): string[] {
        return Array.from(this.sessions.keys());
    }
}

// Export singleton instance
export default new CopilotService();

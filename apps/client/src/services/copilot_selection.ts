/**
 * Copilot Selection Service
 * Tracks text selections across all notes for use as context in Copilot queries
 */

import appContext from "../components/app_context";
import froca from "./froca";

export interface SelectionInfo {
    text: string;
    noteId: string;
    noteTitle: string;
    timestamp: number;
}

class CopilotSelectionService {
    private currentSelection: SelectionInfo | null = null;
    private listeners: Array<(selection: SelectionInfo | null) => void> = [];

    constructor() {
        this.init();
    }

    /**
     * Initialize selection tracking
     */
    private init() {
        // Listen for selection changes globally
        document.addEventListener("selectionchange", () => {
            this.handleSelectionChange();
        });

        // Listen for mouse up (end of selection)
        document.addEventListener("mouseup", () => {
            setTimeout(() => this.handleSelectionChange(), 100);
        });

        // Listen for keyboard selection
        document.addEventListener("keyup", (e) => {
            if (e.shiftKey || e.key === "ArrowLeft" || e.key === "ArrowRight" || 
                e.key === "ArrowUp" || e.key === "ArrowDown") {
                setTimeout(() => this.handleSelectionChange(), 100);
            }
        });
    }

    /**
     * Handle selection change event
     */
    private handleSelectionChange() {
        const selection = window.getSelection();
        
        if (!selection || selection.isCollapsed || !selection.toString().trim()) {
            // No selection or empty selection
            if (this.currentSelection) {
                this.setSelection(null);
            }
            return;
        }

        const selectedText = selection.toString().trim();
        
        // Only update if selection is meaningful (more than 3 characters)
        if (selectedText.length < 3) {
            return;
        }

        // Try to determine which note this selection is from
        const noteId = this.getNoteIdFromSelection(selection);
        if (!noteId) {
            return;
        }

        // Get note title
        const note = froca.getNoteFromCache(noteId);
        const noteTitle = note ? note.title : "Unknown Note";

        this.setSelection({
            text: selectedText,
            noteId: noteId,
            noteTitle: noteTitle,
            timestamp: Date.now()
        });
    }

    /**
     * Try to determine which note a selection belongs to
     */
    private getNoteIdFromSelection(selection: Selection): string | null {
        try {
            const range = selection.getRangeAt(0);
            let element = range.commonAncestorContainer;

            // Walk up the DOM to find a note container
            while (element && element !== document.body) {
                if (element instanceof Element) {
                    // Check for note detail container
                    const noteDetailDiv = element.closest('[data-note-id]');
                    if (noteDetailDiv) {
                        return noteDetailDiv.getAttribute('data-note-id');
                    }

                    // Check for note context
                    const noteContextDiv = element.closest('.note-detail-component');
                    if (noteContextDiv) {
                        // Try to get note ID from appContext
                        const activeContext = appContext.tabManager?.getActiveContext();
                        if (activeContext?.note) {
                            return activeContext.note.noteId;
                        }
                    }
                }
                element = element.parentNode as Node;
            }

            // Fallback: try to get from active note context
            const activeContext = appContext.tabManager?.getActiveContext();
            if (activeContext?.note) {
                return activeContext.note.noteId;
            }

            return null;
        } catch (e) {
            console.error("Error determining note from selection:", e);
            return null;
        }
    }

    /**
     * Set the current selection
     */
    private setSelection(selection: SelectionInfo | null) {
        this.currentSelection = selection;
        this.notifyListeners();
    }

    /**
     * Get the current selection
     */
    getSelection(): SelectionInfo | null {
        return this.currentSelection;
    }

    /**
     * Clear the current selection
     */
    clearSelection() {
        this.setSelection(null);
    }

    /**
     * Subscribe to selection changes
     */
    onSelectionChange(listener: (selection: SelectionInfo | null) => void) {
        this.listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners of selection change
     */
    private notifyListeners() {
        for (const listener of this.listeners) {
            listener(this.currentSelection);
        }
    }

    /**
     * Format selection for display
     */
    formatSelection(): string {
        if (!this.currentSelection) {
            return "";
        }

        const maxLength = 100;
        const text = this.currentSelection.text;
        const truncated = text.length > maxLength 
            ? text.substring(0, maxLength) + "..." 
            : text;

        return truncated;
    }

    /**
     * Format selection as context for AI
     */
    formatAsContext(): string {
        if (!this.currentSelection) {
            return "";
        }

        return `Selected text from "${this.currentSelection.noteTitle}":\n---\n${this.currentSelection.text}\n---\n\n`;
    }

    /**
     * Check if there's an active selection
     */
    hasSelection(): boolean {
        return this.currentSelection !== null;
    }
}

// Export singleton instance
export default new CopilotSelectionService();

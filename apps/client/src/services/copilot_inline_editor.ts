/**
 * Copilot Inline Editor Service
 * Handles inline editing of notes with visual change indicators
 */

import appContext from "../components/app_context";
import { diffWords, diffLines } from "diff";
import toastService from "./toast";

export interface EditChange {
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    content: string;
    lineStart?: number;
    lineEnd?: number;
}

export interface InlineEditSession {
    noteId: string;
    originalContent: string;
    proposedContent: string;
    changes: EditChange[];
    applied: boolean;
}

class CopilotInlineEditorService {
    private activeEdit: InlineEditSession | null = null;
    private listeners: Array<(edit: InlineEditSession | null) => void> = [];
    private highlightTimeouts: Map<string, number> = new Map();

    /**
     * Start an inline edit session
     */
    async startInlineEdit(noteId: string, originalContent: string, proposedContent: string): Promise<void> {
        // Calculate differences
        const changes = this.calculateChanges(originalContent, proposedContent);

        this.activeEdit = {
            noteId,
            originalContent,
            proposedContent,
            changes,
            applied: false
        };

        this.notifyListeners();
    }

    /**
     * Calculate changes between original and proposed content
     */
    private calculateChanges(original: string, proposed: string): EditChange[] {
        const diffs = diffWords(original, proposed);
        const changes: EditChange[] = [];

        for (const diff of diffs) {
            if (diff.added) {
                changes.push({
                    type: 'added',
                    content: diff.value
                });
            } else if (diff.removed) {
                changes.push({
                    type: 'removed',
                    content: diff.value
                });
            } else {
                changes.push({
                    type: 'unchanged',
                    content: diff.value
                });
            }
        }

        return changes;
    }

    /**
     * Apply proposed changes to the editor
     */
    async applyChanges(noteId: string): Promise<boolean> {
        if (!this.activeEdit || this.activeEdit.noteId !== noteId) {
            return false;
        }

        try {
            // Get the active note context
            const noteContext = appContext.tabManager?.getActiveContext();
            if (!noteContext || noteContext.note?.noteId !== noteId) {
                toastService.showError("Note is not active");
                return false;
            }

            // Determine note type and apply accordingly
            const noteType = noteContext.note?.type;

            if (noteType === "text") {
                return await this.applyToTextEditor(noteContext, this.activeEdit.proposedContent);
            } else if (noteType === "code") {
                return await this.applyToCodeEditor(noteContext, this.activeEdit.proposedContent);
            } else {
                // For other types, update via API
                return await this.applyViaAPI(noteId, this.activeEdit.proposedContent);
            }
        } catch (error) {
            console.error("Error applying changes:", error);
            toastService.showError("Failed to apply changes");
            return false;
        }
    }

    /**
     * Apply changes to text editor with highlighting
     */
    private async applyToTextEditor(noteContext: any, newContent: string): Promise<boolean> {
        return new Promise((resolve) => {
            appContext.triggerCommand("executeWithTextEditor", {
                ntxId: noteContext.ntxId,
                callback: (editor: any) => {
                    if (editor) {
                        // Set the new content
                        editor.setData(newContent);
                        
                        // Show success message
                        toastService.showMessage("Changes applied to note");
                        
                        if (this.activeEdit) {
                            this.activeEdit.applied = true;
                        }
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                },
                resolve: () => {}
            });
        });
    }

    /**
     * Apply changes to code editor with line highlighting
     */
    private async applyToCodeEditor(noteContext: any, newContent: string): Promise<boolean> {
        return new Promise((resolve) => {
            appContext.triggerCommand("executeWithCodeEditor", {
                ntxId: noteContext.ntxId,
                resolve: (editor: any) => {
                    if (editor && editor.setText) {
                        // Set the new content
                        editor.setText(newContent);
                        
                        // Highlight changed lines (temporary)
                        this.highlightChangedLinesInCodeEditor(editor);
                        
                        toastService.showMessage("Changes applied to note");
                        
                        if (this.activeEdit) {
                            this.activeEdit.applied = true;
                        }
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                }
            });
        });
    }

    /**
     * Highlight changed lines in code editor (temporary visual feedback)
     */
    private highlightChangedLinesInCodeEditor(editor: any) {
        // This is a visual feedback - the actual highlighting would need CodeMirror extensions
        // For now, we just show a toast
        toastService.showMessage("Lines updated", "info");
        
        // TODO: Add CodeMirror decorations for line highlighting
        // This would require modifying the CodeMirror setup to support decorations
    }

    /**
     * Apply changes via API (for non-editable notes or when editor not available)
     */
    private async applyViaAPI(noteId: string, newContent: string): Promise<boolean> {
        try {
            const resp = await fetch(`/api/notes/${noteId}/data`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newContent })
            });

            const result = await resp.json();
            
            if (result) {
                toastService.showMessage("Changes applied to note");
                if (this.activeEdit) {
                    this.activeEdit.applied = true;
                }
                return true;
            }
            
            return false;
        } catch (error) {
            console.error("Error applying via API:", error);
            return false;
        }
    }

    /**
     * Reject/discard proposed changes
     */
    rejectChanges() {
        this.activeEdit = null;
        this.notifyListeners();
        toastService.showMessage("Changes discarded");
    }

    /**
     * Get the current inline edit session
     */
    getActiveEdit(): InlineEditSession | null {
        return this.activeEdit;
    }

    /**
     * Clear the active edit
     */
    clearEdit() {
        this.activeEdit = null;
        this.notifyListeners();
    }

    /**
     * Subscribe to inline edit changes
     */
    onEditChange(listener: (edit: InlineEditSession | null) => void) {
        this.listeners.push(listener);
        
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners
     */
    private notifyListeners() {
        for (const listener of this.listeners) {
            listener(this.activeEdit);
        }
    }

    /**
     * Apply streaming edit (for real-time updates)
     * @param noteId - Note being edited
     * @param partialContent - Partial content received so far
     */
    async applyStreamingEdit(noteId: string, partialContent: string) {
        const noteContext = appContext.tabManager?.getActiveContext();
        if (!noteContext || noteContext.note?.noteId !== noteId) {
            return;
        }

        // For streaming, directly update the editor
        const noteType = noteContext.note?.type;

        if (noteType === "text") {
            appContext.triggerCommand("executeWithTextEditor", {
                ntxId: noteContext.ntxId,
                callback: (editor: any) => {
                    if (editor) {
                        editor.setData(partialContent);
                    }
                },
                resolve: () => {}
            });
        } else if (noteType === "code") {
            appContext.triggerCommand("executeWithCodeEditor", {
                ntxId: noteContext.ntxId,
                resolve: (editor: any) => {
                    if (editor && editor.setText) {
                        editor.setText(partialContent);
                    }
                }
            });
        }
    }

    /**
     * Format changes as HTML diff for preview
     */
    formatChangesAsHTML(): string {
        if (!this.activeEdit) {
            return "";
        }

        let html = '<div style="font-family: monospace; font-size: 0.9em;">';
        
        for (const change of this.activeEdit.changes) {
            if (change.type === 'added') {
                html += `<span style="background-color: #d4edda; color: #155724;">+ ${this.escapeHtml(change.content)}</span>`;
            } else if (change.type === 'removed') {
                html += `<span style="background-color: #f8d7da; color: #721c24; text-decoration: line-through;">- ${this.escapeHtml(change.content)}</span>`;
            } else if (change.type === 'modified') {
                html += `<span style="background-color: #fff3cd; color: #856404;">~ ${this.escapeHtml(change.content)}</span>`;
            } else {
                html += this.escapeHtml(change.content);
            }
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Escape HTML for safe display
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Get summary of changes
     */
    getChangeSummary(): { added: number; removed: number; modified: number } {
        if (!this.activeEdit) {
            return { added: 0, removed: 0, modified: 0 };
        }

        return this.activeEdit.changes.reduce((acc, change) => {
            if (change.type === 'added') acc.added++;
            if (change.type === 'removed') acc.removed++;
            if (change.type === 'modified') acc.modified++;
            return acc;
        }, { added: 0, removed: 0, modified: 0 });
    }
}

export default new CopilotInlineEditorService();

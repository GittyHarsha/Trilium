# GitHub Copilot SDK Integration for Trilium Notes

## Overview

This integration adds **GitHub Copilot SDK** support to Trilium Notes, enabling agentic AI capabilities for note reading, editing, and manipulation across all note types. This provides a canvas-like interface similar to Gemini Canvas or ChatGPT Canvas, allowing AI to have complete control over the application.

## Features Implemented

### 1. Core Copilot Service
- **Session Management**: Create, manage, and close Copilot sessions
- **Model Selection**: Support for different LLM models (GPT-5, Claude Sonnet, etc.)
- **Configuration**: User-configurable options for enabling/disabling Copilot

### 2. Note Operation Tools (12 Total)

#### Basic Note Tools
1. **read_note** - Read content from any note type
2. **create_note** - Create new notes of any type (text, code, mermaid, canvas, mindmap, etc.)
3. **update_note** - Update note title and/or content
4. **delete_note** - Delete notes
5. **search_notes** - Search for notes using Trilium's search syntax
6. **add_attribute** - Add labels or relations to notes
7. **get_child_notes** - Navigate the note tree

#### Specialized Note Type Tools
8. **update_mermaid_diagram** - Update Mermaid diagrams with new syntax
9. **update_canvas** - Update Excalidraw canvas elements
10. **update_mindmap** - Update MindMap data structure
11. **add_mindmap_node** - Add nodes to MindMaps
12. **add_canvas_element** - Add elements (rectangle, text, arrow, etc.) to Canvas

### 3. API Endpoints

#### Copilot API Routes (`/api/copilot/*`)
- `POST /api/copilot/sessions` - Create a new Copilot session
- `POST /api/copilot/sessions/:sessionId/send` - Send message to session
- `DELETE /api/copilot/sessions/:sessionId` - Close a session
- `GET /api/copilot/status` - Get Copilot service status
- `GET /api/copilot/tools` - Get list of available tools
- `POST /api/copilot/tools/:toolName/execute` - Execute a tool directly (for testing)
- `POST /api/copilot/chat-with-context` - Chat with selected notes as context

### 4. Frontend Widget

#### Copilot Canvas Widget
A new note type `copilotCanvas` with a full-featured UI:
- AI-assisted note editing interface
- Context-aware chat with multiple notes
- Apply AI responses directly to notes
- Copy responses to clipboard
- Real-time processing indicators
- Support for adding context from other notes
- Session persistence

## Architecture

### Backend Components

```
apps/server/src/
├── services/copilot/
│   ├── copilot_service.ts          # Core Copilot SDK integration
│   └── tools/
│       ├── tool_registry.ts        # Basic note operation tools
│       └── specialized_tools.ts    # Mermaid, Canvas, MindMap tools
└── routes/api/
    └── copilot.ts                  # REST API endpoints
```

### Frontend Components

```
apps/client/src/
├── widgets/type_widgets/
│   └── CopilotCanvas.tsx          # Copilot Canvas widget UI
└── services/
    └── note_types.ts               # Note type registration
```

### Shared Types

```
packages/commons/src/lib/
├── rows.ts                         # NoteType definition
├── notes.ts                        # Note type icons
└── options_interface.ts            # Configuration options
```

## Configuration

### Options Added
- `copilotEnabled` (boolean) - Enable/disable Copilot integration
- `copilotModel` (string) - Default LLM model to use (default: "gpt-5")

### Setting Options
Options can be configured via Trilium's Options dialog or programmatically:

```javascript
// Enable Copilot
api.runOnBackend(() => {
    const optionsService = require('./services/options');
    optionsService.setOption('copilotEnabled', 'true');
    optionsService.setOption('copilotModel', 'gpt-5');
});
```

## Usage

### 1. Creating a Copilot Canvas Note

1. Right-click in the note tree
2. Select "Create new note" → "Copilot Canvas"
3. The Copilot Canvas widget will open with the AI interface

### 2. Using the Copilot Canvas

#### Basic Chat
1. Type your prompt in the input area
2. Press Ctrl/Cmd+Enter or click "Send"
3. View the AI response
4. Click "Apply to Note" to insert the response into your current note

#### Context-Aware Chat
1. Add note IDs to the context (future enhancement: UI for note selection)
2. The AI will have access to the content of those notes
3. Ask questions or request edits based on that context

### 3. Tool Usage Examples

#### Via API
```javascript
// Read a note
const response = await fetch('/api/copilot/tools/read_note/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ noteId: 'abc123' })
});

// Create a mermaid diagram
await fetch('/api/copilot/tools/create_note/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        parentNoteId: 'root',
        title: 'My Diagram',
        type: 'mermaid',
        content: 'graph TD;\n    A-->B;\n    B-->C;'
    })
});
```

## Note Type Support

The Copilot integration supports **all Trilium note types**:

### Text-Based
- **text** - Rich HTML content
- **code** - Code with syntax highlighting
- **book** - Document/book structure
- **doc** - Documentation

### Visual/Diagram
- **mermaid** - Flowcharts, sequence diagrams, etc.
- **canvas** - Excalidraw drawings
- **mindMap** - Mind maps
- **relationMap** - Note relationship graphs
- **noteMap** - Note network visualization

### Special
- **render** - JavaScript/HTML rendering
- **webView** - Web content
- **search** - Saved searches
- **file** - File attachments
- **image** - Images

## Tool Details

### Read Note Tool
```json
{
    "name": "read_note",
    "parameters": {
        "noteId": "string (required)",
        "includeAttributes": "boolean (optional, default: false)"
    }
}
```

### Create Note Tool
```json
{
    "name": "create_note",
    "parameters": {
        "parentNoteId": "string (required)",
        "title": "string (required)",
        "type": "string (required) - text|code|mermaid|canvas|mindMap|etc.",
        "content": "string (optional)",
        "mime": "string (optional, default: text/html)"
    }
}
```

### Update Mermaid Diagram Tool
```json
{
    "name": "update_mermaid_diagram",
    "parameters": {
        "noteId": "string (required)",
        "mermaidCode": "string (required) - Mermaid syntax"
    }
}
```

### Add Canvas Element Tool
```json
{
    "name": "add_canvas_element",
    "parameters": {
        "noteId": "string (required)",
        "elementType": "string (required) - rectangle|diamond|ellipse|arrow|line|text",
        "x": "number (required)",
        "y": "number (required)",
        "width": "number (optional, default: 100)",
        "height": "number (optional, default: 100)",
        "text": "string (optional)",
        "strokeColor": "string (optional, default: #000000)",
        "backgroundColor": "string (optional, default: transparent)"
    }
}
```

## Data Formats

### Mermaid Notes
- **Format**: Plain text with Mermaid syntax
- **Example**: `graph TD; A-->B; B-->C;`

### Canvas Notes  
- **Format**: JSON (Excalidraw format)
- **Structure**:
```json
{
    "type": "excalidraw",
    "version": 2,
    "elements": [],
    "files": {},
    "appState": {}
}
```

### MindMap Notes
- **Format**: JSON (MindElixir format)
- **Structure**: Hierarchical node structure

## Security Considerations

1. **Protected Notes**: Copilot respects Trilium's protected session. It cannot access protected note content unless the session is unlocked.

2. **Privacy**: When `copilotEnabled` is false, the service does not initialize and no data is sent to Copilot.

3. **Tool Permissions**: All tools respect Trilium's existing access controls and permissions.

## Future Enhancements

### Short Term
- [ ] Streaming response support for real-time feedback
- [ ] WebSocket integration for live updates
- [ ] UI for multi-note context selection
- [ ] Inline editing without visual cues
- [ ] Undo/redo for Copilot edits

### Medium Term
- [ ] ETAPI endpoints for external access
- [ ] Batch operations support
- [ ] Smart formatting based on note type
- [ ] Collaboration indicators
- [ ] Privacy controls for specific notes

### Long Term
- [ ] Fine-tuned models for Trilium-specific tasks
- [ ] Custom tool development framework
- [ ] Integration with external AI services
- [ ] Multi-agent collaboration

## Troubleshooting

### Copilot Not Initializing
1. Check that `copilotEnabled` is set to `true`
2. Verify that GitHub Copilot CLI is installed and accessible
3. Check server logs for initialization errors

### Tool Execution Failures
1. Verify note IDs are correct
2. Check that note types match tool requirements
3. Ensure proper JSON formatting for structured data (Canvas, MindMap)

### Session Not Responding
1. Try closing and creating a new session
2. Check Copilot service status: `GET /api/copilot/status`
3. Restart the Trilium server

## Development

### Adding New Tools

1. Create tool definition in `tool_registry.ts`:
```typescript
export const myCustomTool = {
    name: "my_custom_tool",
    description: "Description of what it does",
    parameters: {
        type: "object",
        properties: {
            noteId: {
                type: "string",
                description: "Note ID"
            }
        },
        required: ["noteId"]
    },
    handler: async (params: { noteId: string }) => {
        // Implementation
    }
};
```

2. Add to `allTools` array
3. Register in tool definitions

### Running Tests
```bash
# Server tests
pnpm server:test

# Client tests  
pnpm client:test

# Type checking
pnpm typecheck
```

## Credits

This integration leverages:
- **GitHub Copilot SDK** - For AI agent capabilities
- **Trilium's Becca/Froca architecture** - For efficient note access
- **Excalidraw** - For canvas functionality
- **MindElixir** - For mind map functionality
- **Mermaid** - For diagram rendering

## License

This integration follows Trilium's AGPL-3.0 license.

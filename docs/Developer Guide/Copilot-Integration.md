# GitHub Copilot SDK Integration for Trilium Notes

## Overview

This integration adds **GitHub Copilot SDK** support to Trilium Notes as a **universal AI assistant** accessible from any note. Copilot provides agentic capabilities for reading, editing, and manipulating notes with inline editing, diff previews, and visual change indicators - similar to GitHub Copilot in VS Code.

## Key Features

### 1. **Universal Integration - No Special Note Type**
- Copilot works with **ALL note types** (text, code, mermaid, canvas, mindmap, etc.)
- Accessible via **right panel widget** - always available
- No need to create special "copilot notes"
- Edit your notes where you work

### 2. **Text Selection Auto-Context**
- Select text anywhere in any note
- Selection automatically captured as context
- Visual indicator shows active selection
- Toggle to use/ignore selection

### 3. **Inline Editing with Visual Diff**
- AI proposes changes with before/after preview
- Diff highlighting shows additions/removals/modifications
- Accept or reject changes before applying
- No surprise edits - full transparency

### 4. **Global Session Management**
- **Session Manager Widget**: Right-panel UI for managing all Copilot sessions
- **Global Sessions**: One session accessible across all notes
- **Session Organization**: Name, rename, and organize sessions
- **Activity Tracking**: See message counts, last activity times
- **Quick Actions**: Set as global, rename, or close sessions

### 2. Core Copilot Service
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

#### Session Management APIs
- `GET /api/copilot/sessions` - List all active sessions with metadata
- `GET /api/copilot/sessions/:id/info` - Get session details
- `POST /api/copilot/sessions` - Create new session (with name, model, isGlobal options)
- `PATCH /api/copilot/sessions/:id` - Update session (rename or set as global)
- `DELETE /api/copilot/sessions/:id` - Close session

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
- **Session selector**: Use existing or create new session
- **Global session support**: Access global session from any note
- Apply AI responses directly to notes
- Copy responses to clipboard
- Real-time processing indicators
- Support for adding context from other notes
- Session persistence

#### Session Manager Widget (Right Panel)
Always-visible widget in the right panel:
- View all active Copilot sessions
- Create new global sessions
- Set any session as global (marked with 🌍)
- Rename sessions inline
- Close/delete sessions
- See activity metadata (message count, last activity time)
- Auto-refresh every 10 seconds
- Visual distinction for global sessions

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
├── widgets/sidebar/
│   ├── CopilotPanel.tsx            # Universal AI assistant (works with any note)
│   └── CopilotSessionManager.tsx   # Session management widget
└── services/
    ├── copilot_selection.ts         # Text selection tracking
    ├── copilot_inline_editor.ts     # Inline edit & diff system
    └── note_types.ts                # Note type registration
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

### 1. **Managing Sessions**

#### Opening the Session Manager
The Session Manager appears in the right panel and is always available. It shows:
- All active Copilot sessions
- Global session indicator (🌍)
- Session metadata (model, message count, last activity)
- Quick actions for each session

#### Creating a Global Session
1. Open the right panel (if not visible)
2. Find the "Copilot Sessions" widget
3. Click "New Global Session"
4. The global session can now be used from any note

### 1. **Managing Sessions**

#### Opening the Session Manager
The Session Manager appears in the right panel and is always available. It shows:
- All active Copilot sessions
- Global session indicator (🌍)
- Session metadata (model, message count, last activity)
- Quick actions for each session

#### Creating a Global Session
1. Open the right panel (if not visible)
2. Find the "Copilot Sessions" widget
3. Click "New Global Session"
4. The global session can now be used from any note

#### Using Copilot Assistant
The "Copilot Assistant" panel works with your current active note:
1. Open any note (text, code, mermaid, etc.)
2. Open right panel to see "Copilot Assistant"
3. The assistant shows which note it's working on
4. Select session (global or create new)
5. Enable/disable inline edit mode
6. Start chatting!

### 2. **Text Selection Workflow**

1. **Select text** in any note (just highlight with mouse)
2. **Copilot Panel shows** "📝 Selection Active"
3. **Ask query** about the selection (e.g., "Explain this", "Make it shorter")
4. **AI responds** with context of your selection
5. **Clear selection** when done or uncheck "Use" to ignore

Example:
- Select a code function
- Ask: "Add JSDoc comments to this"
- AI proposes inline edit with comments added
- Review diff, accept or reject

### 3. **Inline Editing Workflow**

#### When Inline Edit Mode is ON (✨):
1. Ask Copilot to edit (e.g., "Fix typos in this paragraph")
2. AI uses `propose_inline_edit` tool
3. **Diff preview appears** showing changes:
   - `+ Green` for additions
   - `- Red strikethrough` for deletions  
   - `~ Yellow` for modifications
4. Click **"Accept"** to apply or **"Reject"** to discard
5. Changes apply directly to the note editor

#### When Inline Edit Mode is OFF:
1. AI returns suggestions as text
2. You manually copy/apply as needed
3. Traditional chat-style interaction

### 4. **Tool Usage Examples**

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

### Inline Edit Tools (New)

#### Propose Inline Edit Tool
```json
{
    "name": "propose_inline_edit",
    "description": "Propose changes to note content with diff preview",
    "parameters": {
        "noteId": "string (required)",
        "proposedContent": "string (required) - The new content",
        "changeDescription": "string (optional) - Description of changes"
    }
}
```

Returns: Original content, proposed content, and change description for diff preview.

#### Apply Inline Edit Tool
```json
{
    "name": "apply_inline_edit",
    "description": "Apply changes immediately without preview",
    "parameters": {
        "noteId": "string (required)",
        "newContent": "string (required)",
        "streaming": "boolean (optional) - For streaming edits"
    }
}
```

#### Apply Partial Edit Tool
```json
{
    "name": "apply_partial_edit",
    "description": "Edit specific line ranges in a note",
    "parameters": {
        "noteId": "string (required)",
        "lineStart": "number (required) - 0-indexed",
        "lineEnd": "number (required) - 0-indexed",
        "newContent": "string (required) - Replacement content"
    }
}
```

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

## Session Management API Examples

### List All Sessions
```javascript
// GET /api/copilot/sessions
const response = await fetch('/api/copilot/sessions');
const data = await response.json();

// Response:
{
  "success": true,
  "sessions": [
    {
      "sessionId": "session-123",
      "model": "gpt-5",
      "name": "Global Session",
      "createdAt": 1708041600000,
      "lastActivityAt": 1708042500000,
      "messageCount": 12,
      "isGlobal": true
    },
    {
      "sessionId": "session-456",
      "model": "gpt-5",
      "name": "Research Session",
      "createdAt": 1708040000000,
      "lastActivityAt": 1708041000000,
      "messageCount": 5,
      "isGlobal": false
    }
  ],
  "globalSessionId": "session-123",
  "count": 2
}
```

### Create a Global Session
```javascript
// POST /api/copilot/sessions
const response = await fetch('/api/copilot/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'gpt-5',
        name: 'My Global Session',
        isGlobal: true
    })
});

// Response:
{
  "success": true,
  "sessionId": "session-789",
  "model": "gpt-5",
  "name": "My Global Session",
  "isGlobal": true,
  "availableTools": [...]
}
```

### Set Session as Global
```javascript
// PATCH /api/copilot/sessions/:sessionId
const response = await fetch('/api/copilot/sessions/session-456', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        setAsGlobal: true
    })
});

// Response:
{
  "success": true,
  "session": {
    "sessionId": "session-456",
    "model": "gpt-5",
    "name": "Research Session",
    "isGlobal": true
  }
}
```

### Rename Session
```javascript
// PATCH /api/copilot/sessions/:sessionId
const response = await fetch('/api/copilot/sessions/session-456', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        name: 'Updated Session Name'
    })
});
```

### Get Session Details
```javascript
// GET /api/copilot/sessions/:sessionId/info
const response = await fetch('/api/copilot/sessions/session-123/info');
const data = await response.json();

// Response:
{
  "success": true,
  "session": {
    "sessionId": "session-123",
    "model": "gpt-5",
    "name": "Global Session",
    "createdAt": 1708041600000,
    "lastActivityAt": 1708042500000,
    "messageCount": 12,
    "isGlobal": true
  }
}
```

### Close a Session
```javascript
// DELETE /api/copilot/sessions/:sessionId
const response = await fetch('/api/copilot/sessions/session-456', {
    method: 'DELETE'
});

// Response:
{
  "success": true,
  "sessionId": "session-456",
  "message": "Session closed successfully"
}
```

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

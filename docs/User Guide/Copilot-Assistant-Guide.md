# 🤖 Copilot Assistant for Trilium Notes - User Guide

## What is this?

A powerful AI assistant integrated directly into Trilium Notes. Think of it as **GitHub Copilot for your notes** - it can read, write, edit, and understand all your notes with advanced features like:

- 💬 Chat about any note
- ✨ Edit notes inline with diff preview
- 📝 Automatic context from text selection
- 🌍 Global sessions across all notes
- 🎨 Support for all note types (text, code, diagrams, mind maps, etc.)

## Quick Start

### 1. Enable Copilot

**Option A: Via Options UI**
1. Go to Settings/Options
2. Search for "copilot"
3. Set `copilotEnabled` to `true`
4. (Optional) Set `copilotModel` to your preferred model

**Option B: Via Script**
```javascript
api.runOnBackend(() => {
    const optionsService = require('./services/options');
    optionsService.setOption('copilotEnabled', 'true');
    optionsService.setOption('copilotModel', 'gpt-5');
});
```

### 2. Open Right Panel

- Click the right panel toggle (or press keyboard shortcut)
- You'll see two new widgets:
  - **Copilot Sessions** (top)
  - **Copilot Assistant** (below)

### 3. Create a Global Session

- Click "**+ New Global Session**" in the Copilot Sessions widget
- This session will work across ALL your notes
- You're ready to go!

---

## 🎯 How to Use

### Basic Chat

1. **Open any note** (text, code, mermaid, whatever)
2. **Right panel shows** "Working on: [Your Note]"
3. **Type your query** in the input box
4. **Press Send** or Ctrl/Cmd+Enter
5. **Get AI response**

**Example:**
- Open: "Meeting Notes.txt"
- Ask: "Summarize the key action items"
- AI responds with summary

### Text Selection Context

1. **Select text** in your note (just highlight with mouse)
2. **Copilot Panel automatically shows**: "📝 Selection Active"
3. **Ask about the selection**: "Explain this", "Rewrite more formally", "Translate to Spanish"
4. **AI responds** with full context of your selection

**Example:**
- Select: "function calculateTotal(items) { ... }"
- Ask: "Add JSDoc comments and error handling"
- AI responds with improved code

### Inline Editing (with Visual Diff)

1. **Enable "✨ Inline Edit Mode"** (checkbox in panel)
2. **Ask for edit**: "Fix grammar errors", "Add introduction paragraph"
3. **See diff preview**:
   - 🟢 Green = added text
   - 🔴 Red = removed text
   - 🟡 Yellow = modified text
4. **Review changes** in the preview box
5. **Click "Accept"** to apply or "Reject" to discard
6. **Changes apply directly** to your note!

**Example:**
- Ask: "Make this paragraph more concise"
- See diff: Shows deletions and modifications
- Accept: Paragraph updated inline

---

## 🌍 Global Sessions

### What are Global Sessions?

A **global session** is like having a persistent conversation with AI that follows you across all your notes. The AI remembers the context from previous messages.

### When to use Global Sessions?

- **Research projects**: Ask related questions across multiple notes
- **Learning**: Build on previous explanations
- **Writing**: Get consistent voice/style suggestions
- **Code reviews**: Review multiple files with context

### How to use?

1. Create: Click "+ New Global Session"
2. Use: It's automatically selected in all notes
3. Switch: Select different session from dropdown
4. Manage: Rename, close, or create more sessions

**Example:**
```
Note 1 (Paper.pdf): 
  You: "What's the main argument?"
  AI: "The paper argues X because Y..."

Note 2 (Summary.txt):
  You: "Write a summary of that paper's argument"
  AI: "Based on the previous paper..." ← Remembers!
```

---

## 💡 Use Cases

### Writing & Editing
- "Fix grammar and spelling"
- "Make this more formal/casual"
- "Add an introduction"
- "Summarize in 3 bullet points"

### Code Help
- "Explain this function"
- "Add comments"
- "Optimize this algorithm"
- "Find potential bugs"

### Diagrams & Visual Notes
- "Create a flowchart of this process"
- "Add 5 more nodes to this mind map"
- "Draw a sequence diagram for authentication"
- "Add annotations to this canvas"

### Research & Analysis
- "Summarize key points from these papers" (with selection)
- "Compare approaches in sections A and B"
- "Extract all action items"
- "Create outline from this content"

### Organization
- "Suggest tags for this note"
- "Create child notes for each topic"
- "Reorganize this into sections"

---

## 🎨 Features in Detail

### Text Selection

**How it works:**
- Select any text in any note (≥3 characters)
- Copilot automatically captures it
- Shows preview in panel
- Includes in context when you ask

**Controls:**
- ☑️ "Use" checkbox - include selection or not
- ❌ "Clear" button - remove selection
- Preview shows: `"text..." from Note: Title`

### Inline Edit Mode

**When ON (✨):**
- AI uses `propose_inline_edit` tool
- Shows diff preview before applying
- Color-coded changes
- Accept/reject workflow
- Changes apply directly to editor

**When OFF:**
- AI returns text suggestions
- You manually copy/apply
- Traditional chat mode

**Toggle:** Click "✨ Inline Edit Mode" checkbox

### Session Management

**Operations:**
- **Create**: "+ New Global Session" button
- **Rename**: Click ✏️ icon on session
- **Set Global**: Click "Set Global" button
- **Close**: Click ❌ icon (with confirmation)
- **Switch**: Use dropdown in Copilot Panel

**Session Info:**
- Model being used (e.g., gpt-5)
- Message count (e.g., "24 msgs")
- Last activity (e.g., "5m ago", "2h ago")
- Global indicator (🌍)

---

## ⌨️ Keyboard Shortcuts

- **Send Message**: `Ctrl+Enter` (or `Cmd+Enter` on Mac)
- **Focus Input**: (Planned - not yet implemented)

---

## 🔧 Advanced Usage

### Tool Execution

AI can use tools autonomously. You don't need to know tools exist, but understanding them helps:

**Example query:** "Create a new child note under this one called 'Action Items'"

**What AI does:**
1. Uses `create_note` tool
2. Sets parent to current note
3. Sets title to "Action Items"
4. Returns success confirmation

**You see:** "Created new note: Action Items"

### Multi-Step Operations

AI can chain multiple tools:

**Query:** "Find all notes tagged #todo and create a summary note"

**AI does:**
1. `search_notes` with query "#todo"
2. `read_note` for each found note
3. Analyzes content
4. `create_note` with summary
5. Returns summary note ID

### Context Building

Copilot builds context from:
- Current note content
- Selected text (if any)
- Note type (text, code, etc.)
- Your query

**Example context sent to AI:**
```
Selected text from "Research Paper":
---
Lorem ipsum dolor sit amet...
---

Current note type: text
Current note title: Summary Notes

User Query: Explain the main finding
```

---

## ❓ FAQ

### Q: Do I need a separate Copilot note?
**A:** No! Copilot works with ALL your existing notes via the right panel.

### Q: Will Copilot edit my notes without asking?
**A:** Only if you disable Inline Edit Mode. When ON (default), you must accept changes.

### Q: Can I use different AI models?
**A:** Yes! Set `copilotModel` option to any supported model.

### Q: Does selection work in code notes?
**A:** Yes! Text selection works in all note types.

### Q: Can I have multiple sessions?
**A:** Yes! Create as many as you want and switch between them.

### Q: What happens when I close Trilium?
**A:** Sessions are recreated on restart (if SDK supports it). This may vary by SDK version.

### Q: Is my data sent to external servers?
**A:** Depends on your Copilot SDK configuration. Check GitHub Copilot privacy settings.

### Q: Can I disable Copilot temporarily?
**A:** Yes! Set `copilotEnabled` to `false` in options.

---

## 🐛 Troubleshooting

### Copilot Panel doesn't appear
- Check right panel is open (toggle button)
- Verify `copilotEnabled = true` in options
- Restart Trilium server
- Check server logs for initialization errors

### "Failed to initialize Copilot"
- Verify GitHub Copilot SDK is installed
- Check API keys/authentication
- See server console for detailed error

### Selection not captured
- Select more than 3 characters
- Ensure you're selecting within a note (not UI elements)
- Check if selection is visible in editor

### Inline edits don't apply
- Verify note is not read-only
- Check note type is supported (text/code)
- Try using "Apply to Note" button instead

### Session disappeared
- Check Session Manager - it might still exist
- Sessions may expire after inactivity
- Create new session if needed

---

## 💬 Example Conversations

### Example 1: Writing Help
```
You: Select introduction paragraph

You: "This introduction is too verbose. Make it concise."

AI: Shows diff:
- Removed 50 words
~ Modified 2 sentences
+ Added transition

You: Click "Accept"
→ Paragraph updated!
```

### Example 2: Code Improvement
```
You: Select function "processData"

You: "Add error handling and improve variable names"

AI: Shows diff:
+ try {
+ const processedItems = items.map(...)
~ Changed 'x' to 'item'
+ } catch (error) { ... }

You: "Accept"
→ Code updated with improvements
```

### Example 3: Diagram Creation
```
You: "Create a sequence diagram showing:
      1. User logs in
      2. Server validates
      3. JWT token issued
      4. User redirected to dashboard"

AI: Creates new mermaid note with:
sequenceDiagram
    User->>Server: Login credentials
    Server->>Database: Validate
    Database-->>Server: User data
    Server->>User: JWT token
    User->>Dashboard: Redirect with token

You: New mermaid note appears in tree!
```

---

## 🎓 Best Practices

### 1. Use Global Sessions for Related Work
- Create "Research Session", "Writing Session", etc.
- Keep context across multiple notes
- Switch sessions when changing projects

### 2. Enable Inline Edit Mode for Edits
- See exactly what changes
- Catch mistakes before applying
- Learn what AI is doing

### 3. Use Text Selection for Precision
- Select specific paragraphs/functions
- Get targeted help
- Avoid vague queries

### 4. Name Your Sessions
- "Code Review Session"
- "Research: Machine Learning"
- "Blog Writing"
- Easier to switch later

### 5. Review Diffs Carefully
- Check additions make sense
- Verify nothing important deleted
- Use Accept/Reject granularly

---

## 🚀 Get Started Now!

1. Enable Copilot in options
2. Open right panel
3. Create global session
4. Open any note
5. Start asking questions!

**Welcome to AI-powered note-taking!** 🎉

---

*Last Updated: February 2026*
*Version: 1.0*
*Feedback: Submit issues to the Trilium repository*

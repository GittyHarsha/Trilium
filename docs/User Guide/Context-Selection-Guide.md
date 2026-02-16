# 📚 Context Selection Guide - Copilot for Trilium

## How to Select Context for Copilot

Copilot can use **three types of context** when answering your queries. Understanding how to use each one gives you maximum control and best results.

---

## 🎯 Three Ways to Provide Context

### 1. 📄 **Current Note** (Automatic)

**What it is:**
- The note you're currently viewing
- Always included automatically
- No action needed

**When AI uses it:**
- Every query includes current note info
- AI knows note type, title, and structure

**Example:**
```
You're viewing: "Project Plan.txt"
You ask: "Add a timeline section"
AI knows: Working with text note titled "Project Plan"
```

---

### 2. 📝 **Text Selection** (Auto-Capture)

**What it is:**
- Any text you highlight in any note
- Automatically captured when you select
- Shows in Copilot Panel

**How to use:**
1. Highlight text with your mouse (or Shift+arrows)
2. Panel shows: "📝 Selection Active"
3. Preview shows: Selected text snippet
4. Ask your query
5. AI includes selection as context

**Controls:**
- ☑️ **"Use" checkbox** - Enable/disable including selection
- **"Clear" button** - Remove selection
- **Preview** - Shows first 100 chars of selection

**When to use:**
- Asking about specific paragraph
- Code function explanation
- Rewriting particular section
- Targeted edits

**Example:**
```
1. Open "Research Paper.pdf"
2. Select: "The study found that XYZ..."
3. Ask: "Explain this finding in simple terms"
4. AI focuses on that specific excerpt
```

---

### 3. 📚 **Context Notes** (User-Selected) ⭐ NEW!

**What it is:**
- Additional notes you explicitly add
- Multiple notes can be added
- Full content included in AI's context
- Perfect for multi-document queries

**How to add:**

#### Method A: Search and Add
1. Find "📚 Context Notes" section in Copilot Panel
2. Click in "Search notes to add..." field
3. Start typing note title
4. Autocomplete shows matching notes
5. Click a note from list
6. ✅ Note added! Shows in context list

#### Method B: Quick Add Current Note
1. Look at "Working on: [Note Title]" section
2. Click "+ Context" button
3. ✅ Current note added to context

**Managing context notes:**
- **Remove one**: Click × next to note name
- **Remove all**: Click "Clear All" button
- **View count**: Shows "📚 Context Notes (X)"

**When to use:**
- Multi-document research
- Code review across files
- Meeting notes synthesis
- Documentation from multiple sources
- Comparative analysis

**Example:**
```
Research Workflow:

1. Add to context:
   - "Paper 1: ML Methods.pdf"
   - "Paper 2: Deep Learning.pdf"
   - "Paper 3: Neural Nets.pdf"

2. Open: "Research Summary.txt"

3. Ask: "What methodologies are common across all three papers?"

4. AI reads:
   ✓ All 3 context papers (full content)
   ✓ Your summary note (current)
   
5. Returns: Comprehensive comparison
```

---

## 🎨 Visual Guide

### Empty State (No Context)
```
┌─ Copilot Assistant ─────────┐
│ Working on: MyNote.txt      │
│              [+ Context]     │
│                              │
│ 📚 Context Notes (0):        │
│ [Search notes to add...]    │
│                              │
│ (No context notes added)     │
│                              │
│ [Your prompt...]             │
│ [Send]                       │
└──────────────────────────────┘
```

### With Context Notes
```
┌─ Copilot Assistant ──────────┐
│ Working on: Summary.txt      │
│              [+ Context]      │
│                               │
│ 📚 Context Notes (3): [Clear]│
│ [Search notes...]            │
│                               │
│ 📄 Paper 1.pdf          [×]  │
│ 📄 Paper 2.pdf          [×]  │
│ 📄 Background.txt       [×]  │
│                               │
│ [Your prompt...]              │
│ ✓ Connected • 3 context notes │
│ [Send]                        │
└───────────────────────────────┘
```

### With Selection + Context
```
┌─ Copilot Assistant ──────────┐
│ Working on: Analysis.md      │
│              [+ Context]      │
│                               │
│ 📚 Context Notes (2): [Clear]│
│ [Search...]                  │
│ 📄 Reference 1.txt      [×]  │
│ 📄 Reference 2.txt      [×]  │
│                               │
│ 📝 Selection Active:          │
│ "This finding suggests..."    │
│ [✓ Use] [Clear]              │
│                               │
│ [Ask about selection...]      │
│ [Send with Selection]         │
└───────────────────────────────┘
```

---

## 🎓 Step-by-Step Tutorials

### Tutorial 1: Multi-Paper Research

**Goal:** Synthesize findings from 3 research papers

1. **Prepare Context:**
   ```
   - Open Copilot Panel
   - Click "Search notes to add..."
   - Type "Paper 1" → Select it
   - Type "Paper 2" → Select it
   - Type "Paper 3" → Select it
   - Context shows: "📚 Context Notes (3)"
   ```

2. **Create Summary Note:**
   ```
   - Create new text note: "Research Synthesis"
   - Panel now shows: "Working on: Research Synthesis (text)"
   ```

3. **Query AI:**
   ```
   Type: "What are the key findings common to all three papers?"
   Click: [Send]
   ```

4. **Result:**
   ```
   AI reads:
   ✓ Paper 1 (from context)
   ✓ Paper 2 (from context)
   ✓ Paper 3 (from context)
   ✓ Research Synthesis note (current)
   
   Returns: "The common findings across all three papers are:
            1. [Finding from all papers]
            2. [Another common finding]
            ..."
   ```

5. **Apply:**
   ```
   If inline mode ON → Shows diff
   Accept → Content added to note
   ```

---

### Tutorial 2: Code Refactoring with Utilities

**Goal:** Refactor function using existing utility functions

1. **Setup Context:**
   ```
   Context Notes:
   - Add "utils/formatting.ts"
   - Add "utils/validation.ts"
   - Add "types/interfaces.ts"
   ```

2. **Select Code:**
   ```
   - Open "main.ts"
   - Select function "processUserData"
   - Selection captured automatically
   ```

3. **Request Refactoring:**
   ```
   Ask: "Refactor this function to use utilities from context files and proper TypeScript types"
   ```

4. **AI Response:**
   ```
   AI analyzes:
   ✓ formatting.ts utilities
   ✓ validation.ts functions
   ✓ interfaces.ts types
   ✓ Your selected function
   
   Proposes:
   + import { formatUser } from './utils/formatting'
   + import { validateUser } from './utils/validation'
   + import { User } from './types/interfaces'
   
   ~ Refactored function using utilities
   + Added type annotations
   ```

5. **Review & Apply:**
   ```
   Review diff → Click Accept
   → Function updated with utilities!
   ```

---

### Tutorial 3: Meeting Notes Compilation

**Goal:** Extract action items from multiple meetings

1. **Add All Meetings:**
   ```
   Context Notes:
   - "Meeting 2024-01-15.txt"
   - "Meeting 2024-01-22.txt"
   - "Meeting 2024-01-29.txt"
   - "Meeting 2024-02-05.txt"
   - "Meeting 2024-02-12.txt"
   
   Shows: "📚 Context Notes (5)"
   ```

2. **Create Action Items Note:**
   ```
   - New note: "Action Items - February"
   ```

3. **Extract Items:**
   ```
   Ask: "List all action items from the context meetings, grouped by person assigned"
   ```

4. **Result:**
   ```
   AI compiles from all 5 meetings:
   
   ## Action Items by Person
   
   ### Alice
   - Follow up with client (from 2024-01-15)
   - Review PR #123 (from 2024-02-05)
   
   ### Bob
   - Update documentation (from 2024-01-22)
   - Test new feature (from 2024-02-12)
   
   ...
   ```

---

## 💪 Power User Tips

### Tip 1: Create Context Presets
While Trilium doesn't save context lists yet, you can:
1. Keep a note listing your common context groups
2. Quickly add them when needed
3. Example: "ML Research Context: Paper1, Paper2, Paper3"

### Tip 2: Layer Your Context
```
Broad → Specific:
1. Add general background notes
2. Add specific reference notes
3. Select particular excerpt
4. Ask focused question

AI gets: General context + specific focus
```

### Tip 3: Clear Between Topics
```
Working on different topics?
1. Click "Clear All" context
2. Add new topic-relevant notes
3. Prevents context confusion
```

### Tip 4: Use Current Note Button
```
Quick workflow:
1. View important note
2. Click "+ Context" 
3. Switch to another note
4. Now you have both as context
```

### Tip 5: Monitor Context Count
```
Status bar shows: "• X context notes"

Too many (>10)? → AI might get confused
Too few (0)? → AI only sees current note
Sweet spot (2-5)? → Usually best results
```

---

## 🎯 Best Practices

### DO:
✅ Add relevant background notes
✅ Use 2-5 context notes for best results
✅ Clear context when changing topics
✅ Add current note to context if comparing with others
✅ Use selection for specific excerpts
✅ Check context count before sending

### DON'T:
❌ Add too many notes (>10) - context overload
❌ Add unrelated notes - confuses AI
❌ Forget to clear old context
❌ Add duplicates (app prevents this)
❌ Add protected notes without unlocking session

---

## 🔍 Troubleshooting

### Context note not working?
- **Check:** Note exists and is readable
- **Try:** Re-add the note
- **Verify:** Note shows in context list

### AI ignoring context?
- **Check:** Context count shows in status
- **Try:** Use more specific query mentioning context
- **Example:** "Based on the context notes, ..." 

### Too many context notes?
- **Symptom:** AI responses are confused or incomplete
- **Solution:** Remove some notes, keep 2-5 most relevant
- **Tip:** More specific notes > more notes

### Can't find note in autocomplete?
- **Type** more of the title
- **Check** note actually exists
- **Try** searching differently (partial title)

---

## 📊 Context Limits

### Recommended
- **Sweet spot**: 2-5 context notes
- **Maximum practical**: ~10 notes
- **With text selection**: Reduce context notes to 2-3

### Why limits matter
- AI has token/context limits
- Too much context reduces response quality
- Focused context = better answers

### Token estimation
- Small note (1 page): ~500 tokens
- Medium note (5 pages): ~2,500 tokens
- Large note (20 pages): ~10,000 tokens
- Selection: ~100-500 tokens

**Plan accordingly!**

---

## ✨ Summary

### To Select Context:

1. **For current note:** Automatic ✅
2. **For text excerpt:** Just select it ✅
3. **For other notes:** Use the context selector! ✅

### Context Selector Steps:
1. Open right panel
2. Find "📚 Context Notes"
3. Search for notes
4. Add them to list
5. Send your query
6. AI reads everything!

**Simple, powerful, and intuitive!** 🎉

---

*This completes the context selection system. You now have full control over what Copilot can see and use when responding to your queries.*

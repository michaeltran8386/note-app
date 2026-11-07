# Data Model: Unified Notes, To-Do with Reminders & 100% Web Share

**Feature Branch**: `001-unified-notes-reminders`  
**Date**: 2026-11-07  
**Status**: Completed  

---

## Entities & Schemas

### 1. Note (Document Entity)
Represents a user note file stored on the local filesystem.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | `string` | Unique note identifier (e.g. `note_default` or UUID) | Alphanumeric, underscores, hyphens |
| `title` | `string` | User-visible title (displayed in tab header) | 1 - 100 characters, fallback to "Ghi chú mới" |
| `filePath` | `string` | Absolute path on disk (`<base_dir>/notes/<id>.md`) | Valid Windows filesystem path |
| `content` | `string` | Raw Markdown body of the note | UTF-8 encoded string |
| `createdAt` | `int64` | Unix timestamp of creation (ms) | > 0 |
| `updatedAt` | `int64` | Unix timestamp of last edit (ms) | >= `createdAt` |
| `todos` | `vector<ToDoItem>` | Parsed checklist items extracted from content | Computed or cached in memory |

---

### 2. ToDoItem (Task Entity)
Represents a checklist line within a note.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | `string` | Deterministic hash/ID (e.g. `noteId_lineIdx`) | Unique within the note |
| `noteId` | `string` | ID of parent note containing this item | Must reference valid `Note.id` |
| `lineNumber` | `int` | 1-based line index in the Markdown file | >= 1 |
| `text` | `string` | Clean task description (excluding syntax markers) | Non-empty |
| `isCompleted`| `bool` | Whether marked as done (`- [x]`) | `true` or `false` |
| `reminder` | `optional<ReminderSchedule>` | Active scheduled reminder if set | Optional |

---

### 3. ReminderSchedule (Value Object)
Encapsulates reminder timing and lifecycle status.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `targetTimestamp` | `int64` | Epoch timestamp (seconds or ms) when alert fires | Future timestamp when created |
| `displayDateTime` | `string` | Human-readable schedule string (e.g. `"14:30 15/11/2026"`) | Valid date string |
| `status` | `enum` | Lifecycle state: `PENDING`, `TRIGGERED`, `DISMISSED`, `OVERDUE` | Valid enum string |
| `notifiedAt` | `optional<int64>` | Timestamp when notification was shown | >= `targetTimestamp` |

#### State Transitions:
```
[User Sets Reminder] ---> PENDING
                               |
              +----------------+----------------+
              |                                 |
     [Deadline Reached]             [Task Checked Off: isCompleted = true]
              |                                 |
              v                                 v
          TRIGGERED                         DISMISSED (Canceled)
              |
     [User clicks Toast]
              |
              v
     DISMISSED (Focused note)
```

---

### 4. EmbeddedImage (Asset Entity)
Represents a local or cloud-hosted image within a note.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | `string` | Unique asset ID (e.g. `img_1700000000`) | Non-empty |
| `localRelPath` | `string` | Local path relative to workspace (e.g. `assets/img_1.png`) | File must exist on disk |
| `width` | `string` | CSS width percentage or pixel value (e.g. `"80%"`, `"350px"`) | Valid CSS dimension |
| `remoteUrl` | `optional<string>` | Public CDN URL populated during web share | Valid HTTPS URL |

---

### 5. ShareSnapshot (Transfer Entity)
The payload bundle serialized and published to the web.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `shareId` | `string` | Public unique short token (e.g. `notelocal_abc123`) | Alphanumeric |
| `title` | `string` | Title of the shared note | Escaped safe string |
| `markdown` | `string` | Normalized Markdown body with remote image URLs replaced | Valid Markdown string |
| `images` | `array<string>` | List of uploaded public image URLs | Valid HTTPS URLs |
| `publishedAt` | `int64` | Unix timestamp of publication | Current epoch |
| `viewerUrl` | `string` | Formatted URL for sharing (`https://.../?share=<shareId>`) | Valid public URL |


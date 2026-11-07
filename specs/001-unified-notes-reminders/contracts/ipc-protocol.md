# Contract: Internal IPC Protocol (Win32 Host <-> WebView2 Frontend)

**Feature Branch**: `001-unified-notes-reminders`  
**Date**: 2026-11-07  
**Status**: Completed  

All messages follow the standard `IPCMessage` envelope:
```json
{
  "action": "<ACTION_NAME>",
  "payload": { ... }
}
```

---

## 1. Reminder Subsystem Contracts

### `schedule_reminder` (Frontend -> C++ Host)
Dispatched when the user adds or updates an inline reminder on a To-Do item.

```json
{
  "action": "schedule_reminder",
  "payload": {
    "note_id": "note_default",
    "item_id": "item_line_14",
    "text": "Hoàn thành báo cáo tài chính",
    "target_timestamp": 1794738600,
    "display_time": "14:30 15/11/2026"
  }
}
```

### `cancel_reminder` (Frontend -> C++ Host)
Dispatched when the user completes a task (`[x]`) or deletes the reminder date.

```json
{
  "action": "cancel_reminder",
  "payload": {
    "note_id": "note_default",
    "item_id": "item_line_14"
  }
}
```

### `reminder_triggered` (C++ Host -> Frontend)
Broadcast to WebView2 when the background timer fires an alert.

```json
{
  "action": "reminder_triggered",
  "payload": {
    "note_id": "note_default",
    "item_id": "item_line_14",
    "text": "Hoàn thành báo cáo tài chính",
    "display_time": "14:30 15/11/2026"
  }
}
```

### `notification_clicked` (C++ Host -> Frontend)
Broadcast when user clicks the native Windows Toast notification to jump to the note and task line.

```json
{
  "action": "notification_clicked",
  "payload": {
    "note_id": "note_default",
    "item_id": "item_line_14"
  }
}
```

---

## 2. 100% Web Share Subsystem Contracts

### `publish_web_share` (Frontend -> C++ Host)
Dispatched when user clicks the "Share" button. C++ coordinates image reading and web publishing.

```json
{
  "action": "publish_web_share",
  "payload": {
    "note_id": "note_default",
    "title": "Kế hoạch tuần 46",
    "markdown_content": "# Kế hoạch tuần 46\n\n- [ ] Họp đối tác @14:30 15/11\n\n![image|300px](assets/img_1.png)",
    "referenced_images": [
      {
        "local_path": "assets/img_1.png"
      }
    ]
  }
}
```

### `web_share_completed` (C++ Host -> Frontend)
Returned when upload finishes and share URL is created and copied to clipboard.

```json
{
  "action": "web_share_completed",
  "payload": {
    "success": true,
    "share_id": "nl_share_7b9a2c",
    "public_url": "https://michaeltran8386.github.io/note-app/?share=nl_share_7b9a2c",
    "error_message": ""
  }
}
```


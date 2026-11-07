#pragma once
#include <string>
#include <vector>
#include <optional>
#include <cstdint>

enum class ReminderStatus {
    PENDING,
    TRIGGERED,
    DISMISSED,
    OVERDUE
};

inline std::string ReminderStatusToString(ReminderStatus status) {
    switch (status) {
        case ReminderStatus::PENDING: return "PENDING";
        case ReminderStatus::TRIGGERED: return "TRIGGERED";
        case ReminderStatus::DISMISSED: return "DISMISSED";
        case ReminderStatus::OVERDUE: return "OVERDUE";
        default: return "PENDING";
    }
}

inline ReminderStatus StringToReminderStatus(const std::string& str) {
    if (str == "TRIGGERED") return ReminderStatus::TRIGGERED;
    if (str == "DISMISSED") return ReminderStatus::DISMISSED;
    if (str == "OVERDUE") return ReminderStatus::OVERDUE;
    return ReminderStatus::PENDING;
}

struct ReminderSchedule {
    int64_t target_timestamp{0};  // Unix epoch timestamp in seconds
    std::string display_datetime; // e.g., "14:30 15/11/2026"
    ReminderStatus status{ReminderStatus::PENDING};
    int64_t notified_at{0};
};

struct TodoItem {
    std::string id;
    std::string note_id;
    int line_number{0};
    std::string text;
    bool is_checked{false};
    std::optional<ReminderSchedule> reminder;
};

struct NoteDoc {
    std::string id;
    std::string title;
    std::string raw_markdown;
    std::vector<TodoItem> todos;
};

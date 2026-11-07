#pragma once
#include <string>
#include <vector>
#include <unordered_map>
#include <mutex>
#include <cstdint>
#include "note_model.h"

struct ReminderEntry {
    std::string note_id;
    std::string item_id;
    std::string text;
    int64_t target_timestamp{0};
    std::string display_time;
    ReminderStatus status{ReminderStatus::PENDING};
    int64_t notified_at{0};

    bool operator>(const ReminderEntry& other) const {
        return target_timestamp > other.target_timestamp;
    }
};

class ReminderManager {
public:
    static ReminderManager& Instance();

    void AddOrUpdateReminder(const std::string& note_id,
                            const std::string& item_id,
                            const std::string& text,
                            int64_t target_timestamp,
                            const std::string& display_time);

    bool CancelReminder(const std::string& note_id, const std::string& item_id);
    void DismissReminder(const std::string& note_id, const std::string& item_id);

    // Kiểm tra và lấy các nhắc hẹn đã đến hạn
    std::vector<ReminderEntry> CheckDueReminders(int64_t now_epoch = 0);

    // Nạp lại tất cả nhắc hẹn từ nội dung Markdown của 1 note
    void SyncNoteReminders(const std::string& note_id, const std::string& markdown_content);

    // Xóa tất cả nhắc hẹn thuộc 1 note khi xóa note
    void RemoveNoteReminders(const std::string& note_id);

    size_t GetActiveCount() const;
    void Clear();

private:
    ReminderManager() = default;
    mutable std::mutex m_mutex;
    // Map từ "note_id:item_id" sang ReminderEntry
    std::unordered_map<std::string, ReminderEntry> m_reminders;
};


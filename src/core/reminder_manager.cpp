#include "reminder_manager.h"
#include "markdown_engine.h"
#include <ctime>
#include <algorithm>

ReminderManager& ReminderManager::Instance() {
    static ReminderManager instance;
    return instance;
}

static std::string MakeKey(const std::string& note_id, const std::string& item_id) {
    return note_id + ":" + item_id;
}

void ReminderManager::AddOrUpdateReminder(const std::string& note_id,
                                        const std::string& item_id,
                                        const std::string& text,
                                        int64_t target_timestamp,
                                        const std::string& display_time) {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::string key = MakeKey(note_id, item_id);
    
    ReminderEntry entry;
    entry.note_id = note_id;
    entry.item_id = item_id;
    entry.text = text;
    entry.target_timestamp = target_timestamp;
    entry.display_time = display_time;
    entry.status = ReminderStatus::PENDING;
    entry.notified_at = 0;

    m_reminders[key] = entry;
}

bool ReminderManager::CancelReminder(const std::string& note_id, const std::string& item_id) {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::string key = MakeKey(note_id, item_id);
    auto it = m_reminders.find(key);
    if (it != m_reminders.end()) {
        it->second.status = ReminderStatus::DISMISSED;
        return true;
    }
    return false;
}

void ReminderManager::DismissReminder(const std::string& note_id, const std::string& item_id) {
    CancelReminder(note_id, item_id);
}

std::vector<ReminderEntry> ReminderManager::CheckDueReminders(int64_t now_epoch) {
    if (now_epoch <= 0) {
        now_epoch = static_cast<int64_t>(std::time(nullptr));
    }

    std::vector<ReminderEntry> due_list;
    std::lock_guard<std::mutex> lock(m_mutex);

    for (auto& pair : m_reminders) {
        ReminderEntry& entry = pair.second;
        if (entry.status == ReminderStatus::PENDING && entry.target_timestamp <= now_epoch) {
            entry.status = ReminderStatus::TRIGGERED;
            entry.notified_at = now_epoch;
            due_list.push_back(entry);
        }
    }

    return due_list;
}

void ReminderManager::SyncNoteReminders(const std::string& note_id, const std::string& markdown_content) {
    auto todos = MarkdownEngine::ExtractTodos(markdown_content, note_id);
    std::lock_guard<std::mutex> lock(m_mutex);

    // Xóa các nhắc hẹn cũ của note này
    for (auto it = m_reminders.begin(); it != m_reminders.end(); ) {
        if (it->second.note_id == note_id) {
            it = m_reminders.erase(it);
        } else {
            ++it;
        }
    }

    // Nạp lại các todo chưa hoàn thành có nhắc hẹn
    for (const auto& todo : todos) {
        if (!todo.is_checked && todo.reminder.has_value()) {
            ReminderEntry entry;
            entry.note_id = note_id;
            entry.item_id = todo.id;
            entry.text = todo.text;
            entry.target_timestamp = todo.reminder->target_timestamp;
            entry.display_time = todo.reminder->display_datetime;
            entry.status = todo.reminder->status;
            m_reminders[MakeKey(note_id, todo.id)] = entry;
        }
    }
}

void ReminderManager::RemoveNoteReminders(const std::string& note_id) {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto it = m_reminders.begin(); it != m_reminders.end(); ) {
        if (it->second.note_id == note_id) {
            it = m_reminders.erase(it);
        } else {
            ++it;
        }
    }
}

size_t ReminderManager::GetActiveCount() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    size_t count = 0;
    for (const auto& pair : m_reminders) {
        if (pair.second.status == ReminderStatus::PENDING) {
            count++;
        }
    }
    return count;
}

void ReminderManager::Clear() {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_reminders.clear();
}


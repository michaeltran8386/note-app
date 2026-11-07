#include <iostream>
#include <cassert>
#include <ctime>
#include "core/reminder_manager.h"

int main() {
    std::cout << "[TEST] Running ReminderManager Unit Tests..." << std::endl;
    auto& mgr = ReminderManager::Instance();
    mgr.Clear();

    int64_t now = 1000000;

    // Test 1: Add reminders
    mgr.AddOrUpdateReminder("note_1", "item_1", "Task 1", now + 10, "10s later");
    mgr.AddOrUpdateReminder("note_1", "item_2", "Task 2", now + 50, "50s later");
    assert(mgr.GetActiveCount() == 2);
    std::cout << "  ✓ Test 1: Added 2 reminders successfully." << std::endl;

    // Test 2: Check due before deadline
    auto due0 = mgr.CheckDueReminders(now + 5);
    assert(due0.empty());
    assert(mgr.GetActiveCount() == 2);
    std::cout << "  ✓ Test 2: CheckDueReminders returned 0 due tasks at now + 5s." << std::endl;

    // Test 3: Check due after first deadline
    auto due1 = mgr.CheckDueReminders(now + 15);
    assert(due1.size() == 1);
    assert(due1[0].item_id == "item_1");
    assert(due1[0].status == ReminderStatus::TRIGGERED);
    assert(mgr.GetActiveCount() == 1);
    std::cout << "  ✓ Test 3: CheckDueReminders triggered Task 1 at now + 15s." << std::endl;

    // Test 4: Cancel reminder
    bool canceled = mgr.CancelReminder("note_1", "item_2");
    assert(canceled);
    assert(mgr.GetActiveCount() == 0);
    std::cout << "  ✓ Test 4: Canceled Task 2 successfully." << std::endl;

    // Test 5: SyncNoteReminders
    std::string md = "# Meeting\n- [ ] Plan sprint @14:30 15/11\n- [x] Send invites @10:00 15/11\n";
    mgr.SyncNoteReminders("note_2", md);
    assert(mgr.GetActiveCount() == 1);
    std::cout << "  ✓ Test 5: SyncNoteReminders synced 1 active task from Markdown." << std::endl;

    std::cout << "[SUCCESS] All ReminderManager tests passed!\n";
    return 0;
}


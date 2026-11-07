#include <iostream>
#include <cassert>
#include <ctime>
#include "core/markdown_engine.h"

int main() {
    std::cout << "[TEST] Running Reminder Parser Unit Tests..." << std::endl;

    // Fixed base time: 2026-11-07 10:00:00 UTC
    std::tm fixed_tm{};
    fixed_tm.tm_year = 2026 - 1900;
    fixed_tm.tm_mon = 10; // November (0-based)
    fixed_tm.tm_mday = 7;
    fixed_tm.tm_hour = 10;
    fixed_tm.tm_min = 0;
    fixed_tm.tm_sec = 0;
    fixed_tm.tm_isdst = -1;
    std::time_t base_epoch = std::mktime(&fixed_tm);

    // Test 1: @HH:mm dd/MM
    {
        std::string input = "Họp ban quản trị @14:30 15/11";
        ReminderSchedule rem;
        std::string clean;
        bool ok = MarkdownEngine::ParseReminderSchedule(input, rem, clean, base_epoch);
        assert(ok);
        assert(clean == "Họp ban quản trị");
        assert(rem.display_datetime.find("14:30 15/11/2026") != std::string::npos);
        assert(rem.status == ReminderStatus::PENDING);
        std::cout << "  ✓ Test 1: @HH:mm dd/MM parsed correctly: " << rem.display_datetime << std::endl;
    }

    // Test 2: @dd/MM/YYYY HH:mm
    {
        std::string input = "Nộp báo cáo thuế @20/12/2026 09:00";
        ReminderSchedule rem;
        std::string clean;
        bool ok = MarkdownEngine::ParseReminderSchedule(input, rem, clean, base_epoch);
        assert(ok);
        assert(clean == "Nộp báo cáo thuế");
        assert(rem.display_datetime.find("09:00 20/12/2026") != std::string::npos);
        std::cout << "  ✓ Test 2: @dd/MM/YYYY HH:mm parsed correctly: " << rem.display_datetime << std::endl;
    }

    // Test 3: @tomorrow HH:mm
    {
        std::string input = "Đi gặp khách hàng @tomorrow 16:00";
        ReminderSchedule rem;
        std::string clean;
        bool ok = MarkdownEngine::ParseReminderSchedule(input, rem, clean, base_epoch);
        assert(ok);
        assert(clean == "Đi gặp khách hàng");
        assert(rem.display_datetime.find("16:00 08/11/2026") != std::string::npos);
        std::cout << "  ✓ Test 3: @tomorrow parsed correctly: " << rem.display_datetime << std::endl;
    }

    // Test 4: ExtractTodos
    {
        std::string md = "# Note\n- [ ] Task 1 @14:30 15/11\n- [x] Task 2 @09:00 10/11\n- [ ] Task 3 without reminder\n";
        auto todos = MarkdownEngine::ExtractTodos(md, "test_note");
        assert(todos.size() == 3);
        assert(!todos[0].is_checked);
        assert(todos[0].reminder.has_value());
        assert(todos[1].is_checked);
        assert(todos[1].reminder.has_value());
        assert(!todos[2].reminder.has_value());
        std::cout << "  ✓ Test 4: ExtractTodos extracted 3 tasks with reminders correctly." << std::endl;
    }

    std::cout << "[SUCCESS] All Reminder Parser tests passed!\n";
    return 0;
}


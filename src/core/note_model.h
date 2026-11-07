#pragma once
#include <string>
#include <vector>

struct TodoItem {
    std::string id;
    std::string text;
    bool is_checked{false};
};

struct NoteDoc {
    std::string id;
    std::string title;
    std::string raw_markdown;
};

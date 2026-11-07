#pragma once
#include <string>
#include <vector>
#include "note_model.h"

class MarkdownEngine {
public:
    // Chuyển đổi nội dung HTML từ Editor sang Markdown chuẩn (.md)
    static std::string SerializeToMarkdown(const std::string& title, const std::string& body_html);

    // Chuyển đổi nội dung Markdown (.md) sang cấu trúc HTML có thể chỉnh sửa trực tiếp trong Editor
    static std::string ParseToHtml(const std::string& markdown_text);

    // Trích xuất danh sách todos từ Markdown
    static std::vector<TodoItem> ExtractTodos(const std::string& markdown_text);
};

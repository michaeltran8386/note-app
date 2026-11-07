#pragma once
#include <string>
#include <vector>
#include <optional>
#include <cstdint>
#include "note_model.h"

class MarkdownEngine {
public:
    // Chuyển đổi nội dung HTML từ Editor sang Markdown chuẩn (.md)
    static std::string SerializeToMarkdown(const std::string& title, const std::string& body_html);

    // Chuyển đổi nội dung Markdown (.md) sang cấu trúc HTML có thể chỉnh sửa trực tiếp trong Editor
    static std::string ParseToHtml(const std::string& markdown_text);

    // Trích xuất danh sách todos từ Markdown kèm lịch nhắc việc
    static std::vector<TodoItem> ExtractTodos(const std::string& markdown_text, const std::string& note_id = "");

    // Phân tích cú pháp ngày giờ nhắc hẹn từ chuỗi text
    // Trả về true nếu tìm thấy cú pháp @... hợp lệ
    static bool ParseReminderSchedule(const std::string& input_text, 
                                      ReminderSchedule& out_reminder, 
                                      std::string& out_clean_text, 
                                      int64_t now_epoch = 0);
};

#include "test_framework.h"
#include "core/markdown_engine.h"
#include <iostream>

void test_serialize_todos_and_text() {
    std::string html = "<p>Ghi chú tiếng Việt có dấu: Hôm nay hoàn thành tính năng ghim 📌</p>"
                       "<p><input type=\"checkbox\" checked> Hoàn thành task 1</p>"
                       "<p><input type=\"checkbox\"> Task chưa làm</p>";
    std::string md = MarkdownEngine::SerializeToMarkdown("Ghi chú mới", html);

    ASSERT_TRUE(md.find("- [x] Hoàn thành task 1") != std::string::npos);
    ASSERT_TRUE(md.find("- [ ] Task chưa làm") != std::string::npos);
    ASSERT_TRUE(md.find("Ghi chú tiếng Việt có dấu") != std::string::npos);
}

void test_serialize_images_with_dimensions() {
    // Ảnh có kích thước style width 320px
    std::string html = "<p><img src=\"https://notelocal.app/assets/screenshot_123.png\" style=\"width: 320px;\" class=\"note-image\"></p>";
    std::string md = MarkdownEngine::SerializeToMarkdown("Tab ảnh", html);
    ASSERT_TRUE(md.find("![image|320px](assets/screenshot_123.png)") != std::string::npos);

    // Parse ngược lại kích thước
    std::string html_back = MarkdownEngine::ParseToHtml(md);
    ASSERT_TRUE(html_back.find("style=\"width: 320px;\"") != std::string::npos);
    ASSERT_TRUE(html_back.find("https://notelocal.app/assets/screenshot_123.png") != std::string::npos);
}

void test_parse_to_html() {
    std::string md = "- [ ] Mua cà phê\n"
                     "- [x] Viết code C++\n"
                     "![image|50%](assets/photo.png)\n"
                     "Đoạn văn bản thường";
    std::string html = MarkdownEngine::ParseToHtml(md);

    ASSERT_TRUE(html.find("<input type=\"checkbox\" class=\"todo-check\">") != std::string::npos);
    ASSERT_TRUE(html.find("<input type=\"checkbox\" class=\"todo-check\" checked>") != std::string::npos);
    ASSERT_TRUE(html.find("style=\"width: 50%;\"") != std::string::npos);
    ASSERT_TRUE(html.find("https://notelocal.app/assets/photo.png") != std::string::npos);
    ASSERT_TRUE(html.find("Đoạn văn bản thường") != std::string::npos);
}

void test_extract_todos() {
    std::string md = "- [ ] Task 1\n"
                     "Text thường\n"
                     "- [x] Task 2\n";
    auto todos = MarkdownEngine::ExtractTodos(md);
    ASSERT_EQ(todos.size(), 2);
    ASSERT_STR_EQ(todos[0].text.c_str(), "Task 1");
    ASSERT_FALSE(todos[0].is_checked);
    ASSERT_STR_EQ(todos[1].text.c_str(), "Task 2");
    ASSERT_TRUE(todos[1].is_checked);
}

void test_table_serialization_and_parsing() {
    // 1. Kiểm tra serialize table có colgroup, col width, resizer và nút helper
    std::string html = "<p>Đoạn trước bảng</p>"
                       "<div class=\"table-wrapper\" contenteditable=\"false\">"
                       "<table class=\"note-table\">"
                       "<colgroup><col style=\"width: 140px;\"><col style=\"width: 200px;\"></colgroup>"
                       "<thead><tr><th contenteditable=\"true\">Cột A<div class=\"col-resizer\" contenteditable=\"false\"></div></th>"
                       "<th contenteditable=\"true\">Cột B<div class=\"col-resizer\" contenteditable=\"false\"></div></th></tr></thead>"
                       "<tbody><tr><td contenteditable=\"true\">Dữ liệu 1</td><td contenteditable=\"true\">Dữ liệu 2</td></tr></tbody>"
                       "</table>"
                       "<button type=\"button\" class=\"tbl-btn-add-col\">+</button>"
                       "<button type=\"button\" class=\"tbl-btn-add-row\">+</button>"
                       "</div>"
                       "<p>Đoạn sau bảng</p>";
    std::string md = MarkdownEngine::SerializeToMarkdown("Tab có bảng", html);

    ASSERT_TRUE(md.find("<table class=\"note-table\">") != std::string::npos);
    ASSERT_TRUE(md.find("width: 140px;") != std::string::npos);
    ASSERT_TRUE(md.find("width: 200px;") != std::string::npos);
    ASSERT_TRUE(md.find("Cột A") != std::string::npos);
    ASSERT_TRUE(md.find("Cột B") != std::string::npos);
    ASSERT_TRUE(md.find("Dữ liệu 1") != std::string::npos);
    ASSERT_TRUE(md.find("Dữ liệu 2") != std::string::npos);
    ASSERT_TRUE(md.find("Đoạn trước bảng") != std::string::npos);
    ASSERT_TRUE(md.find("Đoạn sau bảng") != std::string::npos);

    // 2. Parse ngược lại thành HTML
    std::string html_back = MarkdownEngine::ParseToHtml(md);
    ASSERT_TRUE(html_back.find("class=\"table-wrapper\"") != std::string::npos);
    ASSERT_TRUE(html_back.find("<table class=\"note-table\">") != std::string::npos);
    ASSERT_TRUE(html_back.find("width: 140px;") != std::string::npos);
    ASSERT_TRUE(html_back.find("contenteditable=\"true\"") != std::string::npos);
    ASSERT_TRUE(html_back.find("col-resizer") != std::string::npos);
}

void test_gfm_pipe_table_parsing() {
    std::string md = "| Tiêu đề 1 | Tiêu đề 2 |\n"
                     "| --- | --- |\n"
                     "| Giá trị A | Giá trị B |";
    std::string html = MarkdownEngine::ParseToHtml(md);

    ASSERT_TRUE(html.find("class=\"table-wrapper\"") != std::string::npos);
    ASSERT_TRUE(html.find("<table class=\"note-table\">") != std::string::npos);
    ASSERT_TRUE(html.find("Tiêu đề 1") != std::string::npos);
    ASSERT_TRUE(html.find("Tiêu đề 2") != std::string::npos);
    ASSERT_TRUE(html.find("Giá trị A") != std::string::npos);
    ASSERT_TRUE(html.find("Giá trị B") != std::string::npos);
    ASSERT_TRUE(html.find("col-resizer") != std::string::npos);
}

int main() {
    std::cout << "Running Markdown Engine Tests..." << std::endl;
    test_serialize_todos_and_text();
    test_serialize_images_with_dimensions();
    test_parse_to_html();
    test_extract_todos();
    test_table_serialization_and_parsing();
    test_gfm_pipe_table_parsing();
    return test_framework_report();
}

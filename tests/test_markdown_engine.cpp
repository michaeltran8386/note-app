#include "test_framework.h"
#include "core/markdown_engine.h"
#include <iostream>

void test_serialize_todos_and_text() {
    std::string html = "<p>Ghi chú tiếng Việt có dấu: Hôm nay hoàn thành tính năng ghim 📌</p>"
                       "<p><input type=\"checkbox\" checked> Hoàn thành task 1</p>"
                       "<p><input type=\"checkbox\"> Task chưa làm</p>";
    std::string md = MarkdownEngine::SerializeToMarkdown("Ghi chú mới", html);
    
    std::cout << "Serialized Markdown:\n" << md << std::endl;

    ASSERT_TRUE(md.find("- [x] Hoàn thành task 1") != std::string::npos);
    ASSERT_TRUE(md.find("- [ ] Task chưa làm") != std::string::npos);
    ASSERT_TRUE(md.find("Ghi chú tiếng Việt có dấu") != std::string::npos);
}

void test_serialize_images() {
    std::string html = "<p><img src=\"assets/screenshot_123.png\" class=\"note-image\"></p>";
    std::string md = MarkdownEngine::SerializeToMarkdown("Tab ảnh", html);
    
    ASSERT_TRUE(md.find("![image](assets/screenshot_123.png)") != std::string::npos);
}

void test_parse_to_html() {
    std::string md = "- [ ] Mua cà phê\n"
                     "- [x] Viết code C++\n"
                     "![image](assets/photo.png)\n"
                     "Đoạn văn bản thường";
    std::string html = MarkdownEngine::ParseToHtml(md);

    std::cout << "Parsed HTML:\n" << html << std::endl;

    ASSERT_TRUE(html.find("<input type=\"checkbox\" class=\"todo-check\">") != std::string::npos);
    ASSERT_TRUE(html.find("<input type=\"checkbox\" class=\"todo-check\" checked>") != std::string::npos);
    ASSERT_TRUE(html.find("<img src=\"assets/photo.png\" class=\"note-image\">") != std::string::npos);
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

int main() {
    std::cout << "Running Markdown Engine Tests..." << std::endl;
    test_serialize_todos_and_text();
    test_serialize_images();
    test_parse_to_html();
    test_extract_todos();
    return test_framework_report();
}

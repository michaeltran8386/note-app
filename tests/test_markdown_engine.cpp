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

void test_link_card_serialization_and_parsing() {
    // 1. Serialize .note-link-wrap to standard markdown [title](url)
    std::string html = "<p>Trước bookmark</p>"
                       "<p><span class=\"note-link-wrap\" contenteditable=\"false\" data-title=\"Google Tìm Kiếm\" data-url=\"https://google.com\">"
                       "<a class=\"note-link\">Google Tìm Kiếm</a>"
                       "<button type=\"button\" class=\"note-link-edit-btn\">✏️</button>"
                       "</span></p>"
                       "<p>Sau bookmark</p>";
    std::string md = MarkdownEngine::SerializeToMarkdown("Tab Bookmark", html);
    ASSERT_TRUE(md.find("[Google Tìm Kiếm](https://google.com)") != std::string::npos);
    ASSERT_TRUE(md.find("Trước bookmark") != std::string::npos);
    ASSERT_TRUE(md.find("Sau bookmark") != std::string::npos);

    // 2. Parse [title](url) back to HTML minimal link
    std::string html_back = MarkdownEngine::ParseToHtml(md);
    ASSERT_TRUE(html_back.find("class=\"note-link-wrap\"") != std::string::npos);
    ASSERT_TRUE(html_back.find("data-title=\"Google Tìm Kiếm\"") != std::string::npos);
    ASSERT_TRUE(html_back.find("data-url=\"https://google.com\"") != std::string::npos);
    ASSERT_TRUE(html_back.find("class=\"note-link-edit-btn\"") != std::string::npos);

    // 3. Parse standalone https://github.com directly
    std::string direct_md = "https://github.com\n";
    std::string direct_html = MarkdownEngine::ParseToHtml(direct_md);
    ASSERT_TRUE(direct_html.find("class=\"note-link-wrap\"") != std::string::npos);
    ASSERT_TRUE(direct_html.find("data-url=\"https://github.com\"") != std::string::npos);

    // 4. Parse legacy link format > [Docs](https://docs.microsoft.com)
    std::string paren_md = "> [Docs](https://docs.microsoft.com)\n";
    std::string paren_html = MarkdownEngine::ParseToHtml(paren_md);
    ASSERT_TRUE(paren_html.find("class=\"note-link-wrap\"") != std::string::npos);
    ASSERT_TRUE(paren_html.find("data-title=\"Docs\"") != std::string::npos);
    ASSERT_TRUE(paren_html.find("data-url=\"https://docs.microsoft.com\"") != std::string::npos);

    // 4b. Normal blockquote stays blockquote
    std::string quote_md = "> Đây là trích dẫn quan trọng\n";
    std::string quote_html = MarkdownEngine::ParseToHtml(quote_md);
    ASSERT_TRUE(quote_html.find("<blockquote>Đây là trích dẫn quan trọng</blockquote>") != std::string::npos);

    // 5. Image default width 30%
    std::string img_md = "![image](assets/photo.jpg)\n";
    std::string img_html = MarkdownEngine::ParseToHtml(img_md);
    ASSERT_TRUE(img_html.find("width: 30%;") != std::string::npos);

    // 6. Table row healing if malformed p inside tr, and ensure thead is not corrupted into th ead
    std::string malformed_table = "<table class=\"note-table\"><thead><tr><th>Header 1</th></tr></thead><tbody><tr><p><span class=\"note-link-wrap\" data-title=\"yt\" data-url=\"https://youtube.com\">yt</span></p><p><br></p><td>cell2</td></tr></tbody></table>";
    std::string healed_html = MarkdownEngine::ParseToHtml(malformed_table);
    ASSERT_TRUE(healed_html.find("<th contenteditable=\"true\">Header 1") != std::string::npos);
    ASSERT_TRUE(healed_html.find("ead=\"\"") == std::string::npos);
    ASSERT_TRUE(healed_html.find("<td contenteditable=\"true\"><span class=\"note-link-wrap\"") != std::string::npos);
    ASSERT_TRUE(healed_html.find("cell2</td>") != std::string::npos);
    ASSERT_TRUE(healed_html.find("<tr><p>") == std::string::npos);

    // 7. Table serialization cleans note-link-wrap and edit button
    std::string table_with_btn = "<table class=\"note-table\"><tbody><tr><td><span class=\"note-link-wrap\" data-title=\"YT\" data-url=\"https://youtube.com\"><a class=\"note-link\">YT</a><button class=\"note-link-edit-btn\">✏️</button></span></td></tr></tbody></table>";
    std::string clean_table_md = MarkdownEngine::SerializeToMarkdown("Note", table_with_btn);
    ASSERT_TRUE(clean_table_md.find("<a class=\"note-link\" href=\"https://youtube.com\">YT</a>") != std::string::npos);
    ASSERT_TRUE(clean_table_md.find("note-link-edit-btn") == std::string::npos);
    ASSERT_TRUE(clean_table_md.find("✏️") == std::string::npos);
}

void test_bullet_and_numbered_lists() {
    // 1. Parse bullet list (- item) to HTML
    std::string md_bullet = "- Mục đầu tiên\n"
                            "- Mục thứ hai\n"
                            "- Mục thứ ba";
    std::string html_bullet = MarkdownEngine::ParseToHtml(md_bullet);
    ASSERT_TRUE(html_bullet.find("<ul><li>Mục đầu tiên</li><li>Mục thứ hai</li><li>Mục thứ ba</li></ul>") != std::string::npos);

    // 2. Serialize bullet list back to Markdown
    std::string md_back = MarkdownEngine::SerializeToMarkdown("Tab bullet", html_bullet);
    ASSERT_TRUE(md_back.find("- Mục đầu tiên\n") != std::string::npos);
    ASSERT_TRUE(md_back.find("- Mục thứ hai\n") != std::string::npos);
    ASSERT_TRUE(md_back.find("- Mục thứ ba\n") != std::string::npos);

    // 3. Numbered list (1. item)
    std::string md_numbered = "1. Bước 1 chuẩn bị\n"
                              "2. Bước 2 thực hiện\n"
                              "3. Bước 3 hoàn tất";
    std::string html_numbered = MarkdownEngine::ParseToHtml(md_numbered);
    ASSERT_TRUE(html_numbered.find("<ol><li>Bước 1 chuẩn bị</li><li>Bước 2 thực hiện</li><li>Bước 3 hoàn tất</li></ol>") != std::string::npos);

    std::string md_numbered_back = MarkdownEngine::SerializeToMarkdown("Tab numbered", html_numbered);
    ASSERT_TRUE(md_numbered_back.find("1. Bước 1 chuẩn bị\n") != std::string::npos);
    ASSERT_TRUE(md_numbered_back.find("2. Bước 2 thực hiện\n") != std::string::npos);
    ASSERT_TRUE(md_numbered_back.find("3. Bước 3 hoàn tất\n") != std::string::npos);

    // 4. Ensure Todo checkbox is not confused with bullet lists
    std::string md_mixed = "- [ ] Task cần làm\n"
                           "- [x] Task đã xong\n"
                           "- Gạch đầu dòng bình thường";
    std::string html_mixed = MarkdownEngine::ParseToHtml(md_mixed);
    ASSERT_TRUE(html_mixed.find("<input type=\"checkbox\" class=\"todo-check\">") != std::string::npos);
    ASSERT_TRUE(html_mixed.find("<input type=\"checkbox\" class=\"todo-check\" checked>") != std::string::npos);
    ASSERT_TRUE(html_mixed.find("<ul><li>Gạch đầu dòng bình thường</li></ul>") != std::string::npos);
}

int main() {
    std::cout << "Running Markdown Engine Tests..." << std::endl;
    test_serialize_todos_and_text();
    test_serialize_images_with_dimensions();
    test_parse_to_html();
    test_extract_todos();
    test_table_serialization_and_parsing();
    test_gfm_pipe_table_parsing();
    test_link_card_serialization_and_parsing();
    test_bullet_and_numbered_lists();
    return test_framework_report();
}

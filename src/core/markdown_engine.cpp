#include "markdown_engine.h"
#include <sstream>
#include <regex>

static std::string UnescapeHtml(const std::string& input) {
    std::string s = input;
    auto replace_all = [&](const std::string& from, const std::string& to) {
        size_t start_pos = 0;
        while ((start_pos = s.find(from, start_pos)) != std::string::npos) {
            s.replace(start_pos, from.length(), to);
            start_pos += to.length();
        }
    };
    replace_all("&nbsp;", " ");
    replace_all("&lt;", "<");
    replace_all("&gt;", ">");
    replace_all("&amp;", "&");
    replace_all("&quot;", "\"");
    return s;
}

static std::string StripHtmlTags(const std::string& html) {
    std::regex tag_regex("<[^>]*>");
    return std::regex_replace(html, tag_regex, "");
}

static std::string Trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n");
    return str.substr(first, (last - first + 1));
}

std::string MarkdownEngine::SerializeToMarkdown(const std::string& title, const std::string& body_html) {
    std::ostringstream md;

    // Phân tích các khối dòng: <p>...</p>, <div>...</div>
    std::regex block_regex("<(p|div)([^>]*)>(.*?)</\\1>", std::regex::icase);
    std::sregex_iterator begin(body_html.begin(), body_html.end(), block_regex);
    std::sregex_iterator end;

    if (begin == end) {
        // Fallback: nếu không có thẻ bao ngoài
        std::string raw = UnescapeHtml(StripHtmlTags(body_html));
        return Trim(raw);
    }

    for (std::sregex_iterator i = begin; i != end; ++i) {
        std::smatch match = *i;
        std::string tag_attrs = match[2].str();
        std::string inner = match[3].str();

        // Kiểm tra xem có phải ảnh <img>
        std::regex img_regex("<img[^>]*src=[\"']([^\"']+)[\"'][^>]*>", std::regex::icase);
        std::smatch img_match;
        if (std::regex_search(inner, img_match, img_regex)) {
            std::string src = img_match[1].str();
            
            // Kiểm tra thuộc tính data-asset-src nếu có
            std::regex asset_attr_regex("data-asset-src=[\"']([^\"']+)[\"']", std::regex::icase);
            std::smatch asset_match;
            if (std::regex_search(inner, asset_match, asset_attr_regex)) {
                src = asset_match[1].str();
            }

            // Chuẩn hóa đường dẫn về dạng assets/xxx.png
            std::string prefix = "https://notelocal.app/";
            if (src.rfind(prefix, 0) == 0) {
                src = src.substr(prefix.length());
            } else if (src.rfind("/assets/", 0) == 0) {
                src = src.substr(1);
            }

            md << "![image](" << src << ")\n";
            continue;
        }

        // Kiểm tra xem có chứa checkbox <input type="checkbox"
        std::regex check_regex("<input[^>]*type=[\"']checkbox[\"']([^>]*)>", std::regex::icase);
        std::smatch check_match;
        if (std::regex_search(inner, check_match, check_regex)) {
            std::string check_attrs = check_match[1].str();
            bool is_checked = (check_attrs.find("checked") != std::string::npos);
            
            // Lấy text của todo
            std::string text = UnescapeHtml(StripHtmlTags(inner));
            text = Trim(text);
            md << (is_checked ? "- [x] " : "- [ ] ") << text << "\n";
            continue;
        }

        // Dòng text thường
        std::string text = UnescapeHtml(StripHtmlTags(inner));
        if (inner.find("<br") != std::string::npos && Trim(text).empty()) {
            md << "\n";
        } else {
            md << Trim(text) << "\n";
        }
    }

    return md.str();
}

std::string MarkdownEngine::ParseToHtml(const std::string& markdown_text) {
    std::istringstream stream(markdown_text);
    std::ostringstream html;
    std::string line;

    while (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') {
            line.pop_back();
        }

        std::string trimmed = Trim(line);
        if (trimmed.empty()) {
            html << "<p><br></p>";
            continue;
        }

        // Todo Checked
        if (trimmed.rfind("- [x] ", 0) == 0 || trimmed.rfind("- [X] ", 0) == 0) {
            std::string text = trimmed.substr(6);
            html << "<div class=\"todo-item\"><input type=\"checkbox\" class=\"todo-check\" checked><span class=\"todo-text\" contenteditable=\"true\">"
                 << text << "</span></div>";
            continue;
        }

        // Todo Unchecked
        if (trimmed.rfind("- [ ] ", 0) == 0) {
            std::string text = trimmed.substr(6);
            html << "<div class=\"todo-item\"><input type=\"checkbox\" class=\"todo-check\"><span class=\"todo-text\" contenteditable=\"true\">"
                 << text << "</span></div>";
            continue;
        }

        // Image
        std::regex md_img_regex("!\\[([^\\]]*)\\]\\(([^\\)]+)\\)");
        std::smatch img_match;
        if (std::regex_match(trimmed, img_match, md_img_regex)) {
            std::string src = img_match[2].str();
            std::string render_src = src;
            if (src.rfind("assets/", 0) == 0) {
                render_src = "https://notelocal.app/" + src;
            }
            html << "<p><img src=\"" << render_src << "\" data-asset-src=\"" << src << "\" class=\"note-image\"></p>";
            continue;
        }

        // Paragraph thường
        html << "<p>" << trimmed << "</p>";
    }

    return html.str();
}

std::vector<TodoItem> MarkdownEngine::ExtractTodos(const std::string& markdown_text) {
    std::vector<TodoItem> list;
    std::istringstream stream(markdown_text);
    std::string line;
    int idx = 1;

    while (std::getline(stream, line)) {
        std::string trimmed = Trim(line);
        if (trimmed.rfind("- [x] ", 0) == 0 || trimmed.rfind("- [X] ", 0) == 0) {
            list.push_back({"todo_" + std::to_string(idx++), trimmed.substr(6), true});
        } else if (trimmed.rfind("- [ ] ", 0) == 0) {
            list.push_back({"todo_" + std::to_string(idx++), trimmed.substr(6), false});
        }
    }
    return list;
}

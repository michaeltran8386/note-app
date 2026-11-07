#include "markdown_engine.h"
#include <sstream>
#include <regex>
#include <ctime>
#include <iomanip>
#include <iostream>
#include <algorithm>

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

bool MarkdownEngine::ParseReminderSchedule(const std::string& input_text, 
                                          ReminderSchedule& out_reminder, 
                                          std::string& out_clean_text, 
                                          int64_t now_epoch) {
    if (now_epoch <= 0) {
        now_epoch = static_cast<int64_t>(std::time(nullptr));
    }
    std::time_t current_time = static_cast<std::time_t>(now_epoch);
    std::tm now_tm{};
#ifdef _WIN32
    localtime_s(&now_tm, &current_time);
#else
    localtime_r(&current_time, &now_tm);
#endif

    // Regex 1: @HH:mm dd/MM(/YYYY)?  (e.g., @14:30 15/11 or @14:30 15/11/2026)
    std::regex r1("@([0-1]?[0-9]|2[0-3]):([0-5][0-9])\\s+([0-3]?[0-9])/([0-1]?[0-9])(?:/([0-9]{4}))?");
    std::smatch m;
    if (std::regex_search(input_text, m, r1)) {
        int hour = std::stoi(m[1].str());
        int minute = std::stoi(m[2].str());
        int day = std::stoi(m[3].str());
        int month = std::stoi(m[4].str());
        int year = m[5].matched ? std::stoi(m[5].str()) : (now_tm.tm_year + 1900);

        std::tm target = now_tm;
        target.tm_year = year - 1900;
        target.tm_mon = month - 1;
        target.tm_mday = day;
        target.tm_hour = hour;
        target.tm_min = minute;
        target.tm_sec = 0;
        target.tm_isdst = -1;

        std::time_t target_t = std::mktime(&target);
        if (target_t != -1) {
            out_reminder.target_timestamp = static_cast<int64_t>(target_t);
            std::ostringstream ss;
            ss << std::setfill('0') << std::setw(2) << hour << ":"
               << std::setw(2) << minute << " "
               << std::setw(2) << day << "/"
               << std::setw(2) << month << "/"
               << year;
            out_reminder.display_datetime = ss.str();
            out_reminder.status = (target_t < current_time) ? ReminderStatus::OVERDUE : ReminderStatus::PENDING;

            out_clean_text = input_text;
            out_clean_text.erase(m.position(), m.length());
            out_clean_text = Trim(out_clean_text);
            return true;
        }
    }

    // Regex 2: @dd/MM(/YYYY)? HH:mm (e.g., @15/11 14:30 or @15/11/2026 14:30)
    std::regex r2("@([0-3]?[0-9])/([0-1]?[0-9])(?:/([0-9]{4}))?\\s+([0-1]?[0-9]|2[0-3]):([0-5][0-9])");
    if (std::regex_search(input_text, m, r2)) {
        int day = std::stoi(m[1].str());
        int month = std::stoi(m[2].str());
        int year = m[3].matched ? std::stoi(m[3].str()) : (now_tm.tm_year + 1900);
        int hour = std::stoi(m[4].str());
        int minute = std::stoi(m[5].str());

        std::tm target = now_tm;
        target.tm_year = year - 1900;
        target.tm_mon = month - 1;
        target.tm_mday = day;
        target.tm_hour = hour;
        target.tm_min = minute;
        target.tm_sec = 0;
        target.tm_isdst = -1;

        std::time_t target_t = std::mktime(&target);
        if (target_t != -1) {
            out_reminder.target_timestamp = static_cast<int64_t>(target_t);
            std::ostringstream ss;
            ss << std::setfill('0') << std::setw(2) << hour << ":"
               << std::setw(2) << minute << " "
               << std::setw(2) << day << "/"
               << std::setw(2) << month << "/"
               << year;
            out_reminder.display_datetime = ss.str();
            out_reminder.status = (target_t < current_time) ? ReminderStatus::OVERDUE : ReminderStatus::PENDING;

            out_clean_text = input_text;
            out_clean_text.erase(m.position(), m.length());
            out_clean_text = Trim(out_clean_text);
            return true;
        }
    }

    // Regex 3: @(tomorrow|mai) HH:mm or @(today|homnay) HH:mm
    std::regex r3("@(tomorrow|mai|today|homnay)\\s+([0-1]?[0-9]|2[0-3]):([0-5][0-9])", std::regex::icase);
    if (std::regex_search(input_text, m, r3)) {
        std::string keyword = m[1].str();
        int hour = std::stoi(m[2].str());
        int minute = std::stoi(m[3].str());

        std::tm target = now_tm;
        if (keyword == "tomorrow" || keyword == "mai") {
            target.tm_mday += 1;
        }
        target.tm_hour = hour;
        target.tm_min = minute;
        target.tm_sec = 0;
        target.tm_isdst = -1;

        std::time_t target_t = std::mktime(&target);
        if (target_t != -1) {
            out_reminder.target_timestamp = static_cast<int64_t>(target_t);
            std::ostringstream ss;
            ss << std::setfill('0') << std::setw(2) << hour << ":"
               << std::setw(2) << minute << " "
               << std::setw(2) << target.tm_mday << "/"
               << std::setw(2) << (target.tm_mon + 1) << "/"
               << (target.tm_year + 1900);
            out_reminder.display_datetime = ss.str();
            out_reminder.status = (target_t < current_time) ? ReminderStatus::OVERDUE : ReminderStatus::PENDING;

            out_clean_text = input_text;
            out_clean_text.erase(m.position(), m.length());
            out_clean_text = Trim(out_clean_text);
            return true;
        }
    }

    // Regex 4: @HH:mm (defaults to today; if time has passed, moves to tomorrow)
    std::regex r4("@([0-1]?[0-9]|2[0-3]):([0-5][0-9])");
    if (std::regex_search(input_text, m, r4)) {
        int hour = std::stoi(m[1].str());
        int minute = std::stoi(m[2].str());

        std::tm target = now_tm;
        target.tm_hour = hour;
        target.tm_min = minute;
        target.tm_sec = 0;
        target.tm_isdst = -1;

        std::time_t target_t = std::mktime(&target);
        if (target_t < current_time) {
            target.tm_mday += 1;
            target_t = std::mktime(&target);
        }

        if (target_t != -1) {
            out_reminder.target_timestamp = static_cast<int64_t>(target_t);
            std::ostringstream ss;
            ss << std::setfill('0') << std::setw(2) << hour << ":"
               << std::setw(2) << minute << " "
               << std::setw(2) << target.tm_mday << "/"
               << std::setw(2) << (target.tm_mon + 1) << "/"
               << (target.tm_year + 1900);
            out_reminder.display_datetime = ss.str();
            out_reminder.status = ReminderStatus::PENDING;

            out_clean_text = input_text;
            out_clean_text.erase(m.position(), m.length());
            out_clean_text = Trim(out_clean_text);
            return true;
        }
    }

    out_clean_text = input_text;
    return false;
}

std::string MarkdownEngine::SerializeToMarkdown(const std::string& title, const std::string& body_html) {
    std::ostringstream md;

    // Tiền xử lý: loại bỏ các container wrapper div và nút helper runtime để thẻ table và các block đứng độc lập
    std::string clean_html = body_html;
    clean_html = std::regex_replace(clean_html, std::regex("<div[^>]*class=[\"'][^\"']*table-wrapper[^\"']*[\"'][^>]*>", std::regex::icase), "");
    clean_html = std::regex_replace(clean_html, std::regex("<div[^>]*class=[\"'][^\"']*col-resizer[^\"']*[\"'][^>]*></div>", std::regex::icase), "");
    clean_html = std::regex_replace(clean_html, std::regex("<button[^>]*class=[\"'][^\"']*tbl-btn-add-[^\"']*[\"'][^>]*>.*?</button>", std::regex::icase), "");

    // Phân tích các khối dòng theo thứ tự: table, h1-h3, blockquote, hr, img, p, div
    std::regex block_regex("<(table|p|div|h1|h2|h3|blockquote)([^>]*)>([\\s\\S]*?)</\\1>|<(img|hr)([^>]*)>", std::regex::icase);
    std::sregex_iterator begin(clean_html.begin(), clean_html.end(), block_regex);
    std::sregex_iterator end;

    if (begin == end) {
        std::string raw = UnescapeHtml(StripHtmlTags(clean_html));
        return Trim(raw);
    }

    for (std::sregex_iterator i = begin; i != end; ++i) {
        std::smatch match = *i;
        std::string tag_name = match[1].matched ? match[1].str() : match[4].str();
        std::string tag_attrs = match[2].matched ? match[2].str() : match[5].str();
        std::string inner = match[3].matched ? match[3].str() : "";

        std::string tag_lower = tag_name;
        std::transform(tag_lower.begin(), tag_lower.end(), tag_lower.begin(), ::tolower);

        // 0. Bảng biểu (Table)
        if (tag_lower == "table") {
            std::string tbl = "<table" + tag_attrs + ">" + inner + "</table>";
            tbl = std::regex_replace(tbl, std::regex("contenteditable=[\"'][^\"']*[\"']", std::regex::icase), "");
            md << Trim(tbl) << "\n";
            continue;
        }

        // 1. Headings
        if (tag_lower == "h1") {
            md << "# " << Trim(UnescapeHtml(StripHtmlTags(inner))) << "\n";
            continue;
        }
        if (tag_lower == "h2") {
            md << "## " << Trim(UnescapeHtml(StripHtmlTags(inner))) << "\n";
            continue;
        }
        if (tag_lower == "h3") {
            md << "### " << Trim(UnescapeHtml(StripHtmlTags(inner))) << "\n";
            continue;
        }
        if (tag_lower == "blockquote") {
            md << "> " << Trim(UnescapeHtml(StripHtmlTags(inner))) << "\n";
            continue;
        }
        if (tag_lower == "hr") {
            md << "---\n";
            continue;
        }

        // 2. Thẻ <img> độc lập
        if (tag_lower == "img") {
            std::regex src_regex("src=[\"']([^\"']+)[\"']", std::regex::icase);
            std::smatch src_match;
            std::string src = "";
            if (std::regex_search(tag_attrs, src_match, src_regex)) {
                src = src_match[1].str();
            }
            std::regex asset_attr_regex("data-asset-src=[\"']([^\"']+)[\"']", std::regex::icase);
            std::smatch asset_match;
            if (std::regex_search(tag_attrs, asset_match, asset_attr_regex)) {
                src = asset_match[1].str();
            }

            std::string prefix = "https://notelocal.app/";
            if (src.rfind(prefix, 0) == 0) {
                src = src.substr(prefix.length());
            } else if (src.rfind("/assets/", 0) == 0) {
                src = src.substr(1);
            }

            std::string width_val = "";
            std::regex style_w_regex("width:\\s*([^;\"'\\s]+)", std::regex::icase);
            std::smatch w_match;
            if (std::regex_search(tag_attrs, w_match, style_w_regex)) {
                width_val = w_match[1].str();
            }

            if (!width_val.empty() && width_val != "100%") {
                md << "![image|" << width_val << "](" << src << ")\n";
            } else {
                md << "![image](" << src << ")\n";
            }
            continue;
        }

        // 3. Kiểm tra xem bên trong <p> hoặc <div> có <img> không
        std::regex img_regex("<img([^>]*)src=[\"']([^\"']+)[\"']([^>]*)>", std::regex::icase);
        std::smatch img_match;
        if (std::regex_search(inner, img_match, img_regex)) {
            std::string before_src = img_match[1].str();
            std::string src = img_match[2].str();
            std::string after_src = img_match[3].str();
            std::string all_attrs = before_src + " " + after_src;

            std::regex asset_attr_regex("data-asset-src=[\"']([^\"']+)[\"']", std::regex::icase);
            std::smatch asset_match;
            if (std::regex_search(all_attrs, asset_match, asset_attr_regex)) {
                src = asset_match[1].str();
            }

            std::string prefix = "https://notelocal.app/";
            if (src.rfind(prefix, 0) == 0) {
                src = src.substr(prefix.length());
            } else if (src.rfind("/assets/", 0) == 0) {
                src = src.substr(1);
            }

            std::string width_val = "";
            std::regex style_w_regex("width:\\s*([^;\"'\\s]+)", std::regex::icase);
            std::smatch w_match;
            if (std::regex_search(all_attrs, w_match, style_w_regex)) {
                width_val = w_match[1].str();
            }

            if (!width_val.empty() && width_val != "100%") {
                md << "![image|" << width_val << "](" << src << ")\n";
            } else {
                md << "![image](" << src << ")\n";
            }
            continue;
        }

        // 4. Kiểm tra xem có chứa checkbox <input type="checkbox"
        std::regex check_regex("<input[^>]*type=[\"']checkbox[\"']([^>]*)>", std::regex::icase);
        std::smatch check_match;
        if (std::regex_search(inner, check_match, check_regex)) {
            std::string check_attrs = check_match[1].str();
            bool is_checked = (check_attrs.find("checked") != std::string::npos);
            
            // Trích xuất reminder badge nếu có trong inner
            std::string reminder_token = "";
            std::regex badge_regex("class=[\"'][^\"']*reminder-badge[^\"']*[\"'][^>]*data-display=[\"']([^\"']+)[\"']", std::regex::icase);
            std::smatch badge_match;
            if (std::regex_search(inner, badge_match, badge_regex)) {
                reminder_token = " @" + badge_match[1].str();
            }

            // Trích xuất văn bản task: Ưu tiên lấy từ <span class="todo-text">...</span>
            std::regex todo_text_regex("<span[^>]*class=[\"'][^\"']*todo-text[^\"']*[\"'][^>]*>(.*?)</span>", std::regex::icase);
            std::smatch text_match;
            std::string text = "";
            if (std::regex_search(inner, text_match, todo_text_regex)) {
                text = UnescapeHtml(StripHtmlTags(text_match[1].str()));
            } else {
                // Loại bỏ button và badge trước khi strip tags để không dính text thừa
                std::string clean_inner = std::regex_replace(inner, std::regex("<(span|button)[^>]*class=[\"'][^\"']*(reminder-badge|todo-reminder-btn)[^\"']*[\"'][^>]*>.*?</\\1>", std::regex::icase), "");
                text = UnescapeHtml(StripHtmlTags(clean_inner));
            }
            text = Trim(text);
            
            // Tránh lặp lại token reminder nếu trong text đã có
            ReminderSchedule dummy;
            std::string clean_body;
            if (ParseReminderSchedule(text, dummy, clean_body)) {
                text = clean_body;
            }

            md << (is_checked ? "- [x] " : "- [ ] ") << text << reminder_token << "\n";
            continue;
        }

        // 5. Dòng text thường
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

        // 0.1. HTML Table Block (<table...)
        if (trimmed.rfind("<table", 0) == 0 || trimmed.rfind("<div class=\"table-wrapper\"", 0) == 0) {
            std::string table_block = trimmed;
            while (table_block.find("</table>") == std::string::npos && std::getline(stream, line)) {
                if (!line.empty() && line.back() == '\r') line.pop_back();
                table_block += " " + Trim(line);
            }

            // Trích xuất thẻ table chính
            std::regex extract_tbl("<table[^>]*>[\\s\\S]*?</table>", std::regex::icase);
            std::smatch tbl_m;
            std::string table_tag = table_block;
            if (std::regex_search(table_block, tbl_m, extract_tbl)) {
                table_tag = tbl_m[0].str();
            }

            // Đảm bảo th và td có contenteditable="true"
            table_tag = std::regex_replace(table_tag, std::regex("<th(?![^>]*contenteditable)", std::regex::icase), "<th contenteditable=\"true\"");
            table_tag = std::regex_replace(table_tag, std::regex("<td(?![^>]*contenteditable)", std::regex::icase), "<td contenteditable=\"true\"");

            // Đảm bảo th có thanh kéo col-resizer
            if (table_tag.find("col-resizer") == std::string::npos) {
                table_tag = std::regex_replace(table_tag, std::regex("</th>", std::regex::icase), "<div class=\"col-resizer\" contenteditable=\"false\"></div></th>");
            }

            html << "<div class=\"table-wrapper\" contenteditable=\"false\">" << table_tag;
            html << "<button type=\"button\" class=\"tbl-btn-add-col\" title=\"Thêm cột mới\">+</button>";
            html << "<button type=\"button\" class=\"tbl-btn-add-row\" title=\"Thêm hàng mới\">+</button>";
            html << "</div>";
            continue;
        }

        // 0.2. GFM Markdown Pipe Table: | Cột 1 | Cột 2 | ...
        if (trimmed.length() >= 3 && trimmed.front() == '|' && trimmed.back() == '|') {
            std::vector<std::string> tbl_lines;
            tbl_lines.push_back(trimmed);
            while (stream.peek() != EOF) {
                std::streampos pos = stream.tellg();
                std::string nline;
                if (!std::getline(stream, nline)) break;
                if (!nline.empty() && nline.back() == '\r') nline.pop_back();
                std::string ntrimmed = Trim(nline);
                if (ntrimmed.length() >= 3 && ntrimmed.front() == '|' && ntrimmed.back() == '|') {
                    tbl_lines.push_back(ntrimmed);
                } else {
                    stream.seekg(pos);
                    break;
                }
            }

            if (tbl_lines.size() >= 2 && tbl_lines[1].find("---") != std::string::npos) {
                auto split_pipe = [](const std::string& row) -> std::vector<std::string> {
                    std::vector<std::string> cells;
                    std::string cur = "";
                    for (size_t idx = 1; idx < row.length(); ++idx) {
                        if (row[idx] == '|') {
                            cells.push_back(Trim(cur));
                            cur = "";
                        } else {
                            cur += row[idx];
                        }
                    }
                    return cells;
                };

                auto headers = split_pipe(tbl_lines[0]);
                html << "<div class=\"table-wrapper\" contenteditable=\"false\"><table class=\"note-table\">";
                html << "<colgroup>";
                for (size_t c = 0; c < headers.size(); ++c) {
                    html << "<col style=\"width: 120px;\">";
                }
                html << "</colgroup>";
                html << "<thead><tr>";
                for (const auto& h : headers) {
                    html << "<th contenteditable=\"true\">" << h << "<div class=\"col-resizer\" contenteditable=\"false\"></div></th>";
                }
                html << "</tr></thead><tbody>";
                for (size_t r = 2; r < tbl_lines.size(); ++r) {
                    auto cells = split_pipe(tbl_lines[r]);
                    html << "<tr>";
                    for (size_t c = 0; c < headers.size(); ++c) {
                        std::string val = (c < cells.size()) ? cells[c] : "";
                        html << "<td contenteditable=\"true\">" << val << "</td>";
                    }
                    html << "</tr>";
                }
                html << "</tbody></table>";
                html << "<button type=\"button\" class=\"tbl-btn-add-col\" title=\"Thêm cột mới\">+</button>";
                html << "<button type=\"button\" class=\"tbl-btn-add-row\" title=\"Thêm hàng mới\">+</button>";
                html << "</div>";
                continue;
            }
        }

        // Headings: #, ##, ###
        if (trimmed.rfind("### ", 0) == 0) {
            html << "<h3>" << trimmed.substr(4) << "</h3>";
            continue;
        }
        if (trimmed.rfind("## ", 0) == 0) {
            html << "<h2>" << trimmed.substr(3) << "</h2>";
            continue;
        }
        if (trimmed.rfind("# ", 0) == 0) {
            html << "<h1>" << trimmed.substr(2) << "</h1>";
            continue;
        }

        // Blockquotes: >
        if (trimmed.rfind("> ", 0) == 0) {
            html << "<blockquote>" << trimmed.substr(2) << "</blockquote>";
            continue;
        }

        // Horizontal rule: --- or ***
        if (trimmed == "---" || trimmed == "***") {
            html << "<hr>";
            continue;
        }

        // Todo Checked
        if (trimmed.rfind("- [x] ", 0) == 0 || trimmed.rfind("- [X] ", 0) == 0) {
            std::string text = trimmed.substr(6);
            ReminderSchedule reminder;
            std::string clean_text;
            std::string badge_html = "";
            if (ParseReminderSchedule(text, reminder, clean_text)) {
                text = clean_text;
                badge_html = " <span class=\"reminder-badge completed\" data-timestamp=\"" + 
                             std::to_string(reminder.target_timestamp) + "\" data-display=\"" + 
                             reminder.display_datetime + "\">⏱ " + 
                             reminder.display_datetime + "</span>";
            }
            html << "<div class=\"todo-item\"><input type=\"checkbox\" class=\"todo-check\" checked><span class=\"todo-text\" contenteditable=\"true\">"
                 << text << "</span>" << badge_html << "<button type=\"button\" class=\"todo-reminder-btn\" title=\"Hẹn giờ nhắc việc\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/></svg></button></div>";
            continue;
        }

        // Todo Unchecked
        if (trimmed.rfind("- [ ] ", 0) == 0) {
            std::string text = trimmed.substr(6);
            ReminderSchedule reminder;
            std::string clean_text;
            std::string badge_html = "";
            if (ParseReminderSchedule(text, reminder, clean_text)) {
                text = clean_text;
                std::string overdue_class = (reminder.status == ReminderStatus::OVERDUE) ? " overdue" : "";
                badge_html = " <span class=\"reminder-badge" + overdue_class + "\" data-timestamp=\"" + 
                             std::to_string(reminder.target_timestamp) + "\" data-display=\"" + 
                             reminder.display_datetime + "\">⏱ " + 
                             reminder.display_datetime + "</span>";
            }
            html << "<div class=\"todo-item\"><input type=\"checkbox\" class=\"todo-check\"><span class=\"todo-text\" contenteditable=\"true\">"
                 << text << "</span>" << badge_html << "<button type=\"button\" class=\"todo-reminder-btn\" title=\"Hẹn giờ nhắc việc\"><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"13\" height=\"13\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/></svg></button></div>";
            continue;
        }

        // Image ![image|300px](path)
        std::regex md_img_regex("!\\[([^\\]]*)\\]\\(([^\\)]+)\\)");
        std::smatch img_match;
        if (std::regex_match(trimmed, img_match, md_img_regex)) {
            std::string label = img_match[1].str();
            std::string src = img_match[2].str();
            std::string render_src = src;
            if (src.rfind("assets/", 0) == 0) {
                render_src = "https://notelocal.app/" + src;
            }

            std::string style_attr = "";
            size_t pipe_pos = label.find('|');
            if (pipe_pos != std::string::npos) {
                std::string width_spec = label.substr(pipe_pos + 1);
                if (!width_spec.empty()) {
                    if (width_spec.find('%') == std::string::npos && width_spec.find("px") == std::string::npos) {
                        width_spec += "px";
                    }
                    style_attr = " style=\"width: " + width_spec + ";\"";
                }
            }

            html << "<p class=\"image-wrapper\"><img src=\"" << render_src << "\" data-asset-src=\"" << src << "\"" << style_attr << " class=\"note-image\"></p>";
            continue;
        }

        // Paragraph thường
        html << "<p>" << trimmed << "</p>";
    }

    return html.str();
}

std::vector<TodoItem> MarkdownEngine::ExtractTodos(const std::string& markdown_text, const std::string& note_id) {
    std::vector<TodoItem> list;
    std::istringstream stream(markdown_text);
    std::string line;
    int line_idx = 1;

    while (std::getline(stream, line)) {
        std::string trimmed = Trim(line);
        bool is_checked = false;
        std::string body;

        if (trimmed.rfind("- [x] ", 0) == 0 || trimmed.rfind("- [X] ", 0) == 0) {
            is_checked = true;
            body = trimmed.substr(6);
        } else if (trimmed.rfind("- [ ] ", 0) == 0) {
            is_checked = false;
            body = trimmed.substr(6);
        } else {
            line_idx++;
            continue;
        }

        TodoItem item;
        item.id = (note_id.empty() ? "note" : note_id) + "_line_" + std::to_string(line_idx);
        item.note_id = note_id;
        item.line_number = line_idx;
        item.is_checked = is_checked;

        ReminderSchedule rem;
        std::string clean;
        if (ParseReminderSchedule(body, rem, clean)) {
            item.text = clean;
            item.reminder = rem;
        } else {
            item.text = body;
        }

        list.push_back(item);
        line_idx++;
    }
    return list;
}

(function() {
    let currentTabId = "tab_default";
    let tabs = [{ id: "tab_default", title: "Ghi chú mới" }];
    let isPinned = false;
    let saveTimeout = null;
    let pendingImages = [];
    let selectedImage = null;

    const editorContainer = document.getElementById("editor-container");
    const editor = document.getElementById("editor");
    window.addEventListener("contextmenu", (e) => {
        if (e.target.closest("table, #table-context-menu")) return;
        e.preventDefault();
    });

    function collapseCaret(element) {
        element.focus();
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(true);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        selection.collapse(range.startContainer, range.startOffset);
    }
    const tabsList = document.getElementById("tabs-list");
    const btnAddTab = document.getElementById("btn-add-tab");
    const btnPin = document.getElementById("btn-pin");
    const renameModal = document.getElementById("rename-modal");
    const renameInput = document.getElementById("rename-input");
    const btnCancelRename = document.getElementById("btn-cancel-rename");
    const btnConfirmRename = document.getElementById("btn-confirm-rename");
    const resizerBox = document.getElementById("image-resizer-box");
    const resizerHandle = document.querySelector(".resizer-handle.br");
    const sizePills = document.querySelectorAll(".size-pill");
    let renamingTabId = null;

    // Các phần tử UI mới: Tìm tab, Cài đặt, Lightbox ảnh, Toast
    const btnSearchTab = document.getElementById("btn-search-tab");
    const tabSearchModal = document.getElementById("tab-search-modal");
    const tabSearchInput = document.getElementById("tab-search-input");
    const tabSearchResults = document.getElementById("tab-search-results");

    const btnExportUrl = document.getElementById("btn-export-url");

    // Modal Hẹn giờ nhắc việc
    const reminderModal = document.getElementById("reminder-modal");
    const reminderDateInput = document.getElementById("reminder-date-input");
    const reminderTimeInput = document.getElementById("reminder-time-input");
    const btnCloseReminder = document.getElementById("btn-close-reminder");
    const btnCancelReminder = document.getElementById("btn-cancel-reminder");
    const btnConfirmReminder = document.getElementById("btn-confirm-reminder");
    const btnDeleteReminder = document.getElementById("btn-delete-reminder");
    const presetChips = document.querySelectorAll(".preset-chip");
    let currentEditingBadge = null;
    let currentEditingItem = null;

    const btnSettings = document.getElementById("btn-settings");
    const settingsModal = document.getElementById("settings-modal");
    const btnCloseSettings = document.getElementById("btn-close-settings");
    const btnSaveSettings = document.getElementById("btn-save-settings");
    const txturlServiceInput = document.getElementById("txturl-service-input");

    const imageLightboxModal = document.getElementById("image-lightbox-modal");
    const lightboxImg = document.getElementById("lightbox-img");
    const btnCloseLightbox = document.getElementById("btn-close-lightbox");

    const toast = document.getElementById("toast");
    let toastTimeout = null;

    // Các phần tử Bảng biểu (Table) Office-style
    const btnInsertTable = document.getElementById("btn-insert-table");
    const tablePickerPopover = document.getElementById("table-picker-popover");
    const tableGridPicker = document.getElementById("table-grid-picker");
    const tableGridLabel = document.getElementById("table-grid-label");
    const tableContextMenu = document.getElementById("table-context-menu");
    let contextMenuTargetCell = null;

    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.remove("hidden");
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.add("hidden");
        }, duration);
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Gửi thông điệp tới C++ Host
    function sendIPC(action, payload) {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage(JSON.stringify({ action: action, payload: payload }));
        } else {
            console.log("IPC Mock:", action, payload);
        }
    }

    // Nhận thông điệp từ C++ Host
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.addEventListener("message", function(e) {
            try {
                const msg = (typeof e.data === "string") ? JSON.parse(e.data) : e.data;
                handleIPC(msg.action, msg.payload);
            } catch (err) {
                console.error("IPC Parse Error:", err);
            }
        });
    }

    function handleIPC(action, payload) {
        if (action === "init_state") {
            tabs = payload.tabs || [{ id: "tab_default", title: "Ghi chú mới" }];
            currentTabId = payload.active_tab_id || tabs[0].id;
            isPinned = payload.always_on_top || false;
            btnPin.classList.toggle("pinned", isPinned);

            renderTabs();
            editor.innerHTML = payload.content_html || "<p><br></p>";
            setupCheckboxListeners();
            setupAllTables();
            setupAllLinks();
            hideImageResizer();
        } else if (action === "image_saved") {
            const imgId = payload.img_id;
            const fullUrl = "https://notelocal.app/" + payload.path;

            let img = null;
            if (imgId) {
                img = editor.querySelector(`img[data-img-id="${imgId}"]`);
            }
            if (!img && pendingImages.length > 0) {
                img = pendingImages.shift();
            }

            if (img && img.parentNode) {
                img.dataset.assetSrc = payload.path;
                img.src = fullUrl;
            } else if (!img) {
                insertImage(fullUrl);
            }
            triggerSave();
        } else if (action === "update_pin") {
            isPinned = payload.always_on_top;
            btnPin.classList.toggle("pinned", isPinned);
        } else if (action === "web_share_completed") {
            btnExportUrl.classList.remove("loading");
            if (payload.success) {
                // Không ghi đè toast nếu shorten_url_result đang chạy
            } else {
                console.warn("Snapshot local warning:", payload.error_message);
            }
        } else if (action === "shorten_url_result") {
            if (payload.short_url && payload.short_url !== payload.long_url && payload.short_url.startsWith("http")) {
                latestShortShareUrl = payload.short_url;
                if (shareShortUrlInput) {
                    shareShortUrlInput.value = payload.short_url;
                    shareShortUrlInput.focus();
                    shareShortUrlInput.select();
                }
                if (navigator.clipboard) {
                    try { navigator.clipboard.writeText(payload.short_url); } catch (e) {}
                }
                sendIPC("copy_to_clipboard", { text: payload.short_url });
                showToast("Đã rút gọn & sao chép link vào Clipboard!", 3500);
            } else {
                if (shareShortUrlInput) {
                    shareShortUrlInput.value = payload.long_url || latestFullShareUrl;
                }
                if (navigator.clipboard) {
                    try { navigator.clipboard.writeText(shareShortUrlInput.value); } catch (e) {}
                }
                sendIPC("copy_to_clipboard", { text: shareShortUrlInput.value });
                showToast("Đã tạo & sao chép link chia sẻ vào Clipboard!", 3500);
            }
        } else if (action === "resolve_url_result") {
            const reqId = payload.req_id;
            if (reqId && pendingUrlResolvers[reqId]) {
                pendingUrlResolvers[reqId](payload.resolved_url || payload.short_url);
                delete pendingUrlResolvers[reqId];
            }
        } else if (action === "reminder_triggered") {
            showToast("🔔 Nhắc việc: " + (payload.text || ""), 5000);
            const badges = editor.querySelectorAll(".reminder-badge");
            badges.forEach(function(b) {
                if (b.dataset.display === payload.display_time || b.textContent.includes(payload.display_time)) {
                    b.classList.add("overdue");
                }
            });
        } else if (action === "notification_clicked") {
            editor.focus();
            const overdue = editor.querySelector(".reminder-badge.overdue, .reminder-badge");
            if (overdue) {
                overdue.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }

    function serializeListNode(listNode, indentLevel = 0) {
        const listLines = [];
        const indent = "  ".repeat(indentLevel);
        const isOl = listNode.tagName === "OL";
        let num = 1;

        Array.from(listNode.children).forEach(child => {
            if (child.tagName === "LI") {
                let text = "";
                let subLists = [];
                Array.from(child.childNodes).forEach(c => {
                    if (c.nodeType === Node.TEXT_NODE) {
                        text += c.textContent;
                    } else if (c.nodeType === Node.ELEMENT_NODE) {
                        if (c.tagName === "UL" || c.tagName === "OL") {
                            subLists.push(c);
                        } else if (c.classList && (c.classList.contains("note-link-wrap") || c.classList.contains("link-card"))) {
                            const title = c.dataset.title || c.querySelector(".note-link, .link-card-title")?.textContent?.trim() || "";
                            const url = c.dataset.url || "";
                            text += `[${title || url}](${url})`;
                        } else {
                            text += c.textContent;
                        }
                    }
                });

                text = text.trim();
                if (text || subLists.length > 0) {
                    const prefix = isOl ? `${num++}. ` : "- ";
                    if (text) listLines.push(`${indent}${prefix}${text}`);
                }

                subLists.forEach(sub => {
                    listLines.push(...serializeListNode(sub, indentLevel + 1));
                });
            }
        });
        return listLines;
    }

    // Tuần tự hóa DOM sang Markdown chuẩn xác 100% không làm xáo trộn thứ tự
    function serializeEditorToMarkdown() {
        const lines = [];
        const children = Array.from(editor.childNodes);
        for (const node of children) {
            if (node.nodeType === Node.TEXT_NODE) {
                const txt = node.textContent.trim();
                if (txt) lines.push(txt);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toUpperCase();

                // 0.1 Bố cục đa cột (Multi-column Layout kiểu Notion)
                if (node.classList && node.classList.contains("block-columns")) {
                    lines.push(node.outerHTML);
                }
                // 0.2 Hộp lưu ý (Callout)
                else if (node.classList && node.classList.contains("block-callout")) {
                    const txt = node.querySelector(".callout-text")?.textContent?.trim() || node.textContent.replace(/^[💡ℹ️⚠️📌🔥]\s*/, "").trim();
                    lines.push(`> [!NOTE]\n> ${txt}`);
                }
                // 0. Bảng biểu (Table hoặc .table-wrapper) - Phải kiểm tra TRƯỚC các thẻ DIV / P
                else if (tag === "TABLE" || (node.classList && node.classList.contains("table-wrapper")) || (node.querySelector && node.querySelector("table.note-table"))) {
                    const tbl = (tag === "TABLE") ? node : node.querySelector("table.note-table");
                    if (tbl) {
                        lines.push(serializeTableToCleanHtml(tbl));
                    }
                }
                // 0.5. Link Bookmark (.note-link-wrap hoặc .link-card)
                else if (node.classList && (node.classList.contains("note-link-wrap") || node.querySelector(".note-link-wrap") || node.classList.contains("link-card") || node.querySelector(".link-card"))) {
                    const wrap = node.classList.contains("note-link-wrap") ? node : (node.querySelector(".note-link-wrap") || node.querySelector(".link-card") || node);
                    const title = wrap.dataset.title || wrap.querySelector(".note-link, .link-card-title")?.textContent?.trim() || "";
                    const url = wrap.dataset.url || "";
                    if (url) {
                        lines.push(`[${title || url}](${url})`);
                    }
                }
                // 0.8. Danh sách (UL / OL / LI)
                else if (tag === "UL" || tag === "OL") {
                    lines.push(...serializeListNode(node, 0));
                }
                else if (tag === "LI") {
                    const txt = node.textContent.trim();
                    if (txt) lines.push(`- ${txt}`);
                }
                // 1. To-Do Item
                else if (node.classList && node.classList.contains("todo-item")) {
                    const cb = node.querySelector(".todo-check");
                    const span = node.querySelector(".todo-text");
                    const mark = (cb && cb.checked) ? "x" : " ";
                    let text = span ? span.textContent.trim() : "";
                    const badge = node.querySelector(".reminder-badge");
                    if (badge && badge.dataset.display) {
                        text = text.replace(/@\d{1,2}:\d{2}.*$/, "").trim();
                        text += ` @${badge.dataset.display}`;
                    }
                    lines.push(`- [${mark}] ${text}`);
                }
                // 2. Headings
                else if (tag === "H1") {
                    lines.push(`# ${node.textContent.trim()}`);
                } else if (tag === "H2") {
                    lines.push(`## ${node.textContent.trim()}`);
                } else if (tag === "H3") {
                    lines.push(`### ${node.textContent.trim()}`);
                }
                // 3. Blockquote
                else if (tag === "BLOCKQUOTE") {
                    lines.push(`> ${node.textContent.trim()}`);
                }
                // 4. HR
                else if (tag === "HR") {
                    lines.push("---");
                }
                // 5. Image trực tiếp
                else if (tag === "IMG") {
                    const assetSrc = node.dataset.assetSrc || (node.src.includes("assets/") ? node.src.substring(node.src.indexOf("assets/")) : node.src);
                    let label = "image|30%";
                    if (node.style.width && node.style.width !== "100%") {
                        label = `image|${node.style.width}`;
                    }
                    lines.push(`![${label}](${assetSrc})`);
                }
                // 6. Paragraph hoặc Div
                else if (tag === "P" || tag === "DIV") {
                    const noteLink = node.querySelector(".note-link-wrap, .link-card");
                    const img = node.querySelector("img");
                    const todo = node.querySelector(".todo-item");

                    if (noteLink) {
                        const title = noteLink.dataset.title || noteLink.querySelector(".note-link, .link-card-title")?.textContent?.trim() || "";
                        const url = noteLink.dataset.url || "";
                        if (url) {
                            lines.push(`[${title || url}](${url})`);
                        }
                    } else if (img) {
                        const assetSrc = img.dataset.assetSrc || (img.src.includes("assets/") ? img.src.substring(img.src.indexOf("assets/")) : img.src);
                        let label = "image|30%";
                        if (img.style.width && img.style.width !== "100%") {
                            label = `image|${img.style.width}`;
                        }
                        lines.push(`![${label}](${assetSrc})`);
                    } else if (todo) {
                        const cb = todo.querySelector(".todo-check");
                        const span = todo.querySelector(".todo-text");
                        const mark = (cb && cb.checked) ? "x" : " ";
                        let text = span ? span.textContent.trim() : "";
                        const badge = todo.querySelector(".reminder-badge");
                        if (badge && badge.dataset.display) {
                            text = text.replace(/@\d{1,2}:\d{2}.*$/, "").trim();
                            text += ` @${badge.dataset.display}`;
                        }
                        lines.push(`- [${mark}] ${text}`);
                    } else {
                        const clean = node.textContent.trim();
                        if (clean) {
                            lines.push(clean);
                        } else if (node.querySelector("br")) {
                            lines.push("");
                        }
                    }
                }
            }
        }
        return lines.join("\n");
    }
    window.serializeEditorToMarkdown = serializeEditorToMarkdown;

    // Global IME Composition Listener (Bảo vệ gõ Tiếng Việt Telex/VNI không bị nhảy ký tự)
    let isGlobalComposing = false;
    editor.addEventListener("compositionstart", () => { isGlobalComposing = true; });
    editor.addEventListener("compositionend", () => {
        isGlobalComposing = false;
        triggerSave();
    });

    // Tự động lưu ghi chú với debounce 300ms (hoàn toàn an toàn trước IME tiếng Việt)
    function triggerSave() {
        if (isGlobalComposing) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function() {
            const md = serializeEditorToMarkdown();
            sendIPC("save_note", {
                tab_id: currentTabId,
                html: editor.innerHTML,
                markdown: md
            });
        }, 300);
    }

    // Render danh sách Tabs
    function renderTabs() {
        tabsList.innerHTML = "";
        tabs.forEach(function(tab) {
            const tabEl = document.createElement("div");
            tabEl.className = "tab-item" + (tab.id === currentTabId ? " active" : "");
            tabEl.dataset.id = tab.id;

            const titleEl = document.createElement("span");
            titleEl.className = "tab-title";
            titleEl.textContent = tab.title;
            tabEl.appendChild(titleEl);

            const closeEl = document.createElement("span");
            closeEl.className = "tab-close";
            closeEl.textContent = "×";
            closeEl.title = "Đóng";
            tabEl.appendChild(closeEl);

            tabEl.addEventListener("click", function(e) {
                if (e.target === closeEl) return;
                switchTab(tab.id);
            });

            tabEl.addEventListener("dblclick", function() {
                openRenameModal(tab.id, tab.title);
            });

            closeEl.addEventListener("click", function(e) {
                e.stopPropagation();
                closeTab(tab.id);
            });

            tabsList.appendChild(tabEl);
        });
    }

    function switchTab(newTabId) {
        if (currentTabId === newTabId) return;
        hideImageResizer();

        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }

        const md = serializeEditorToMarkdown();
        sendIPC("save_note", {
            tab_id: currentTabId,
            html: editor.innerHTML,
            markdown: md
        });

        currentTabId = newTabId;
        renderTabs();
        sendIPC("switch_tab", { tab_id: currentTabId });
    }

    function closeTab(tabId) {
        hideImageResizer();
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
        }
        sendIPC("delete_tab", { tab_id: tabId });
        tabs = tabs.filter(t => t.id !== tabId);
        if (tabs.length === 0) {
            tabs.push({ id: "tab_" + Date.now(), title: "Ghi chú mới" });
        }
        if (currentTabId === tabId) {
            currentTabId = tabs[0].id;
            sendIPC("switch_tab", { tab_id: currentTabId });
        }
        renderTabs();
    }

    // Modal đổi tên Tab
    function openRenameModal(tabId, currentTitle) {
        renamingTabId = tabId;
        renameInput.value = currentTitle;
        renameModal.classList.remove("hidden");
        renameInput.focus();
        renameInput.select();
    }

    function closeRenameModal() {
        renameModal.classList.add("hidden");
        renamingTabId = null;
    }

    btnConfirmRename.addEventListener("click", function() {
        const newName = renameInput.value.trim();
        if (newName && renamingTabId) {
            const tab = tabs.find(t => t.id === renamingTabId);
            if (tab) {
                tab.title = newName;
                renderTabs();
                sendIPC("rename_tab", { tab_id: renamingTabId, title: newName });
            }
        }
        closeRenameModal();
    });

    btnCancelRename.addEventListener("click", closeRenameModal);
    renameInput.addEventListener("keydown", function(e) {
        if (e.key === "Enter") btnConfirmRename.click();
        if (e.key === "Escape") closeRenameModal();
    });

    // Thêm Tab mới
    btnAddTab.addEventListener("click", function() {
        hideImageResizer();
        const newId = "tab_" + Date.now();
        const newTitle = "Ghi chú " + (tabs.length + 1);
        tabs.push({ id: newId, title: newTitle });
        sendIPC("create_tab", { id: newId, title: newTitle });
        switchTab(newId);
    });

    // Pin Always on Top
    btnPin.addEventListener("click", function() {
        isPinned = !isPinned;
        btnPin.classList.toggle("pinned", isPinned);
        sendIPC("toggle_pin", { always_on_top: isPinned });
    });

    // ==========================================
    // PARSER NHẮC HẸN (REMINDER PARSER IN JS)
    // ==========================================
    function parseReminderScheduleJs(text) {
        if (!text) return null;
        const now = new Date();
        
        // Pattern 1: @HH:mm dd/MM(/YYYY)? (e.g., @15:30 15/11 or @15:30 15/11/2026)
        let match = text.match(/@([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s+([0-3]?[0-9])\/([0-1]?[0-9])(?:\/([0-9]{4}))?/);
        if (match) {
            const hh = parseInt(match[1]);
            const min = parseInt(match[2]);
            const dd = parseInt(match[3]);
            const mm = parseInt(match[4]);
            const yyyy = match[5] ? parseInt(match[5]) : now.getFullYear();
            const d = new Date(yyyy, mm - 1, dd, hh, min, 0);
            const display = `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")} ${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`;
            const cleanText = text.replace(match[0], "").trim();
            return {
                epochSec: Math.floor(d.getTime() / 1000),
                displayStr: display,
                cleanText: cleanText
            };
        }
        
        // Pattern 2: @dd/MM(/YYYY)? HH:mm (e.g., @15/11 15:30)
        match = text.match(/@([0-3]?[0-9])\/([0-1]?[0-9])(?:\/([0-9]{4}))?\s+([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
        if (match) {
            const dd = parseInt(match[1]);
            const mm = parseInt(match[2]);
            const yyyy = match[3] ? parseInt(match[3]) : now.getFullYear();
            const hh = parseInt(match[4]);
            const min = parseInt(match[5]);
            const d = new Date(yyyy, mm - 1, dd, hh, min, 0);
            const display = `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")} ${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`;
            const cleanText = text.replace(match[0], "").trim();
            return {
                epochSec: Math.floor(d.getTime() / 1000),
                displayStr: display,
                cleanText: cleanText
            };
        }

        // Pattern 3: @(tomorrow|mai|today|homnay) HH:mm
        match = text.match(/@(tomorrow|mai|today|homnay)\s+([0-1]?[0-9]|2[0-3]):([0-5][0-9])/i);
        if (match) {
            const kw = match[1].toLowerCase();
            const hh = parseInt(match[2]);
            const min = parseInt(match[3]);
            const d = new Date(now);
            if (kw === "tomorrow" || kw === "mai") {
                d.setDate(d.getDate() + 1);
            }
            d.setHours(hh, min, 0, 0);
            const display = `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
            const cleanText = text.replace(match[0], "").trim();
            return {
                epochSec: Math.floor(d.getTime() / 1000),
                displayStr: display,
                cleanText: cleanText
            };
        }

        // Pattern 4: @HH:mm (e.g., @15:30)
        match = text.match(/@([0-1]?[0-9]|2[0-3]):([0-5][0-9])/);
        if (match) {
            const hh = parseInt(match[1]);
            const min = parseInt(match[2]);
            const d = new Date(now);
            d.setHours(hh, min, 0, 0);
            if (d.getTime() < now.getTime()) {
                d.setDate(d.getDate() + 1);
            }
            const display = `${String(hh).padStart(2, "0")}:${String(min).padStart(2, "0")} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
            const cleanText = text.replace(match[0], "").trim();
            return {
                epochSec: Math.floor(d.getTime() / 1000),
                displayStr: display,
                cleanText: cleanText
            };
        }

        return null;
    }

    function checkAndApplyReminder(item) {
        if (!item) return false;
        const span = item.querySelector(".todo-text");
        if (!span) return false;
        const text = span.textContent;
        const remData = parseReminderScheduleJs(text);
        if (remData) {
            span.textContent = remData.cleanText;
            let badge = item.querySelector(".reminder-badge");
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "reminder-badge";
                const remBtn = item.querySelector(".todo-reminder-btn");
                if (remBtn) item.insertBefore(badge, remBtn);
                else item.appendChild(badge);
            }
            badge.dataset.display = remData.displayStr;
            badge.dataset.timestamp = String(remData.epochSec);
            badge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${remData.displayStr}`;
            badge.classList.remove("overdue");

            const index = Array.from(editor.querySelectorAll(".todo-item")).indexOf(item);
            const itemId = currentTabId + "_line_" + (index + 1);
            sendIPC("schedule_reminder", {
                note_id: currentTabId,
                item_id: itemId,
                text: remData.cleanText,
                target_timestamp: remData.epochSec,
                display_time: remData.displayStr
            });
            setupReminderBadgeListeners();
            triggerSave();
            showToast("Đã lên lịch nhắc: " + remData.displayStr, 2500);
            return true;
        }
        return false;
    }

    // Xử lý Checkbox Tick, Reminder Buttons & Badges
    function setupCheckboxListeners() {
        const todoItems = editor.querySelectorAll(".todo-item");
        todoItems.forEach(function(item, index) {
            const cb = item.querySelector(".todo-check");
            if (cb) {
                item.classList.toggle("checked", cb.checked);
                const badge = item.querySelector(".reminder-badge");
                if (badge) badge.classList.toggle("completed", cb.checked);

                cb.onchange = function() {
                    item.classList.toggle("checked", cb.checked);
                    const b = item.querySelector(".reminder-badge");
                    if (b) {
                        b.classList.toggle("completed", cb.checked);
                        if (cb.checked) {
                            const itemId = currentTabId + "_line_" + (index + 1);
                            sendIPC("cancel_reminder", { note_id: currentTabId, item_id: itemId });
                        }
                    }
                    triggerSave();
                };
            }

            // Gắn nút Hẹn giờ (⏱) cho từng To-Do item
            let remBtn = item.querySelector(".todo-reminder-btn");
            if (!remBtn) {
                remBtn = document.createElement("button");
                remBtn.type = "button";
                remBtn.className = "todo-reminder-btn";
                remBtn.title = "Hẹn giờ nhắc việc";
                remBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
                item.appendChild(remBtn);
            }
            remBtn.onclick = function(e) {
                e.stopPropagation();
                const badge = item.querySelector(".reminder-badge");
                openReminderModal(badge, item);
            };
        });
        setupReminderBadgeListeners();
    }

    function setupReminderBadgeListeners() {
        const badges = editor.querySelectorAll(".reminder-badge");
        badges.forEach(function(badge) {
            badge.onclick = function(e) {
                e.stopPropagation();
                const item = badge.closest(".todo-item");
                openReminderModal(badge, item);
            };
        });
    }

    function openReminderModal(badge, item) {
        currentEditingBadge = badge || (item ? item.querySelector(".reminder-badge") : null);
        currentEditingItem = item || (badge ? badge.closest(".todo-item") : null);

        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);

        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");

        if (currentEditingBadge && currentEditingBadge.dataset.display) {
            const parts = currentEditingBadge.dataset.display.split(" ");
            if (parts.length === 2) {
                reminderTimeInput.value = parts[0];
                const dateParts = parts[1].split("/");
                if (dateParts.length >= 2) {
                    const d = dateParts[0].padStart(2, "0");
                    const m = dateParts[1].padStart(2, "0");
                    const y = dateParts[2] || String(yyyy);
                    reminderDateInput.value = `${y}-${m}-${d}`;
                }
            } else {
                reminderDateInput.value = `${yyyy}-${mm}-${dd}`;
                reminderTimeInput.value = `${hh}:${min}`;
            }
            if (btnDeleteReminder) btnDeleteReminder.style.display = "inline-block";
        } else {
            reminderDateInput.value = `${yyyy}-${mm}-${dd}`;
            reminderTimeInput.value = `${hh}:${min}`;
            if (btnDeleteReminder) btnDeleteReminder.style.display = "none";
        }

        reminderModal.classList.remove("hidden");
        reminderTimeInput.focus();
    }

    function closeReminderModal() {
        reminderModal.classList.add("hidden");
        currentEditingBadge = null;
        currentEditingItem = null;
    }

    if (btnCloseReminder) btnCloseReminder.onclick = closeReminderModal;
    if (btnCancelReminder) btnCancelReminder.onclick = closeReminderModal;

    presetChips.forEach(function(chip) {
        chip.onclick = function() {
            const preset = chip.dataset.preset;
            const target = new Date();
            if (preset === "1m") {
                target.setMinutes(target.getMinutes() + 1);
            } else if (preset === "15m") {
                target.setMinutes(target.getMinutes() + 15);
            } else if (preset === "1h") {
                target.setHours(target.getHours() + 1);
            } else if (preset === "tomorrow") {
                target.setDate(target.getDate() + 1);
                target.setHours(9, 0, 0, 0);
            }
            const yyyy = target.getFullYear();
            const mm = String(target.getMonth() + 1).padStart(2, "0");
            const dd = String(target.getDate()).padStart(2, "0");
            const hh = String(target.getHours()).padStart(2, "0");
            const min = String(target.getMinutes()).padStart(2, "0");
            reminderDateInput.value = `${yyyy}-${mm}-${dd}`;
            reminderTimeInput.value = `${hh}:${min}`;
        };
    });

    if (btnConfirmReminder) {
        btnConfirmReminder.onclick = function() {
            const dateVal = reminderDateInput.value;
            const timeVal = reminderTimeInput.value;
            if (!dateVal || !timeVal || !currentEditingItem) {
                closeReminderModal();
                return;
            }

            const [yyyy, mm, dd] = dateVal.split("-");
            const [hh, min] = timeVal.split(":");
            const displayStr = `${hh}:${min} ${dd}/${mm}/${yyyy}`;
            const targetDate = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min));
            const epochSec = Math.floor(targetDate.getTime() / 1000);

            if (!currentEditingBadge) {
                currentEditingBadge = currentEditingItem.querySelector(".reminder-badge");
            }
            if (!currentEditingBadge) {
                currentEditingBadge = document.createElement("span");
                currentEditingBadge.className = "reminder-badge";
                const remBtn = currentEditingItem.querySelector(".todo-reminder-btn");
                if (remBtn) {
                    currentEditingItem.insertBefore(currentEditingBadge, remBtn);
                } else {
                    currentEditingItem.appendChild(currentEditingBadge);
                }
                setupReminderBadgeListeners();
            }

            currentEditingBadge.dataset.display = displayStr;
            currentEditingBadge.dataset.timestamp = String(epochSec);
            currentEditingBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${displayStr}`;
            currentEditingBadge.classList.remove("overdue");

            const todoTextSpan = currentEditingItem.querySelector(".todo-text");
            const taskText = todoTextSpan ? todoTextSpan.textContent.trim() : "";
            const index = Array.from(editor.querySelectorAll(".todo-item")).indexOf(currentEditingItem);
            const itemId = currentTabId + "_line_" + (index + 1);

            sendIPC("schedule_reminder", {
                note_id: currentTabId,
                item_id: itemId,
                text: taskText,
                target_timestamp: epochSec,
                display_time: displayStr
            });

            closeReminderModal();
            triggerSave();
            showToast("Đã đặt nhắc hẹn: " + displayStr, 2500);
        };
    }

    if (btnDeleteReminder) {
        btnDeleteReminder.onclick = function() {
            if (!currentEditingBadge && currentEditingItem) {
                currentEditingBadge = currentEditingItem.querySelector(".reminder-badge");
            }
            if (currentEditingBadge) {
                currentEditingBadge.remove();
            }
            if (currentEditingItem) {
                const index = Array.from(editor.querySelectorAll(".todo-item")).indexOf(currentEditingItem);
                const itemId = currentTabId + "_line_" + (index + 1);
                sendIPC("cancel_reminder", { note_id: currentTabId, item_id: itemId });
            }
            closeReminderModal();
            triggerSave();
            showToast("Đã xóa nhắc việc!", 2000);
        };
    }

    function exitListItem(li) {
        const list = li.parentElement;
        const tail = list.cloneNode(false);
        while (li.nextSibling) tail.appendChild(li.nextSibling);
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        list.after(p);
        if (tail.children.length) p.after(tail);
        li.remove();
        if (!list.children.length) list.remove();
        collapseCaret(p);
    }

    function expandMarkdownBlock(range) {
        if (!range.collapsed) return false;
        const node = range.startContainer;
        const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (element.closest("li, .todo-item, pre, code, table")) return false;
        let block = element.closest("#editor > p, #editor > div");
        if (!block && node.parentNode !== editor) return false;
        const prefix = range.cloneRange();
        if (block) prefix.selectNodeContents(block);
        else prefix.selectNodeContents(node);
        prefix.setEnd(range.startContainer, range.startOffset);
        const marker = prefix.toString().replace(/\u00a0/g, " ");
        const match = /^(?:([-*]) |(\[\]|\[ \]|- \[ \]) |(#{1,3}) |(>) |(---|\*\*\*)|(1\.) )$/.exec(marker);
        if (!match) return false;
        prefix.deleteContents();
        if (!block) {
            block = document.createElement("p");
            node.before(block);
            block.appendChild(node);
        }
        let replacement, caret;
        if (match[1] || match[6]) {
            replacement = document.createElement(match[6] ? "ol" : "ul");
            caret = replacement.appendChild(document.createElement("li"));
        } else if (match[2]) {
            const todo = createTodoElement("");
            replacement = todo.div;
            caret = todo.span;
        } else if (match[5]) {
            replacement = document.createElement("hr");
            caret = document.createElement("p");
        } else {
            replacement = document.createElement(match[3] ? `h${match[3].length}` : "blockquote");
            caret = replacement;
        }
        while (block.firstChild) caret.appendChild(block.firstChild);
        if (!caret.firstChild) caret.innerHTML = "<br>";
        const previous = block.previousElementSibling;
        if ((match[1] || match[6]) && previous?.tagName === replacement.tagName) {
            previous.appendChild(caret);
            block.remove();
        } else {
            block.replaceWith(replacement);
        }
        if (match[5]) replacement.after(caret);
        collapseCaret(caret);
        return true;
    }

    // Chèn Todo Item mới
    function createTodoElement(text) {
        const div = document.createElement("div");
        div.className = "todo-item";
        div.contentEditable = "false";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "todo-check";

        const span = document.createElement("span");
        span.className = "todo-text";
        span.contentEditable = "true";
        span.textContent = text || "";

        const remBtn = document.createElement("button");
        remBtn.type = "button";
        remBtn.className = "todo-reminder-btn";
        remBtn.title = "Hẹn giờ nhắc việc";
        remBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

        div.appendChild(cb);
        div.appendChild(span);
        div.appendChild(remBtn);

        cb.onchange = function() {
            div.classList.toggle("checked", cb.checked);
            const badge = div.querySelector(".reminder-badge");
            if (badge) badge.classList.toggle("completed", cb.checked);
            triggerSave();
        };

        remBtn.onclick = function(e) {
            e.stopPropagation();
            const badge = div.querySelector(".reminder-badge");
            openReminderModal(badge, div);
        };

        // Phân tích cú pháp @reminder nếu có sẵn trong text
        const remData = parseReminderScheduleJs(span.textContent);
        if (remData) {
            span.textContent = remData.cleanText;
            const badge = document.createElement("span");
            badge.className = "reminder-badge";
            badge.dataset.display = remData.displayStr;
            badge.dataset.timestamp = String(remData.epochSec);
            badge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${remData.displayStr}`;
            div.insertBefore(badge, remBtn);
            setupReminderBadgeListeners();
        }

        return { div, cb, span, remBtn };
    }

    function insertTodoAtCaret(text) {
        const { div } = createTodoElement(text);
        div.dataset.newTodo = "";
        document.execCommand("insertHTML", false, div.outerHTML);
        const inserted = editor.querySelector(".todo-item[data-new-todo]");
        if (inserted) {
            inserted.removeAttribute("data-new-todo");
            setupCheckboxListeners();
            collapseCaret(inserted.querySelector(".todo-text"));
        }
    }

    // Tự động nhận diện cú pháp Markdown trực tiếp khi gõ (Headings, Links, Checkbox, HR, Quote)
    editor.addEventListener("input", function(e) {
        hideImageResizer();
        if (e.isComposing) return;
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        if (expandMarkdownBlock(range)) {
            triggerSave();
            return;
        }
        const node = range.startContainer;
        if (node && node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;

            // 2. Tự động nhận diện đường dẫn link khi gõ URL hoặc cú pháp Markdown
            // Cú pháp A: [tiêu đề](url) hoặc [tiêu đề]<url>
            const syntaxMatch = text.match(/(?:^|\s)\[([^\]]*)\][<\(](https?:\/\/[^\s>\)]+)[>\)]/);
            // Cú pháp B: gõ trực tiếp link https://... hoặc http://... rồi gõ dấu cách
            const urlMatch = text.match(/(?:^|\s)(https?:\/\/[^\s<>]+)\s+/);
            // Cú pháp C: tương thích ngược > [tiêu đề]<url> hoặc >https://...
            const legacyMatch = text.match(/^>\s*(?:\[([^\]]*)\][<\(]([^>\)]+)[>\)]|(https?:\/\/[^\s<>]+)\s*)/);

            if (syntaxMatch || urlMatch || legacyMatch) {
                let title = "";
                let url = "";
                if (syntaxMatch) {
                    title = syntaxMatch[1].trim() || syntaxMatch[2].trim();
                    url = syntaxMatch[2].trim();
                } else if (urlMatch) {
                    url = urlMatch[1].trim();
                    title = getDomainOrTitleFromUrl(url);
                } else if (legacyMatch) {
                    if (legacyMatch[1] || legacyMatch[2]) {
                        title = (legacyMatch[1] || "").trim() || (legacyMatch[2] || "").trim();
                        url = (legacyMatch[2] || "").trim();
                    } else {
                        url = legacyMatch[3].trim();
                        title = getDomainOrTitleFromUrl(url);
                    }
                }

                const linkEl = createLinkElement(title, url);
                const tableCell = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest("th, td");
                if (tableCell) {
                    tableCell.innerHTML = "";
                    tableCell.appendChild(linkEl);
                    tableCell.appendChild(document.createTextNode(" "));

                    const newRange = document.createRange();
                    newRange.selectNodeContents(tableCell);
                    newRange.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(newRange);

                    setupAllLinks();
                    triggerSave();
                    return;
                }

                const parentBlock = (node.parentNode && node.parentNode !== editor) ? node.parentNode : null;

                const p = document.createElement("p");
                p.appendChild(linkEl);
                p.appendChild(document.createTextNode(" "));

                if (parentBlock) {
                    parentBlock.replaceWith(p);
                } else {
                    node.replaceWith(p);
                }

                const newRange = document.createRange();
                newRange.selectNodeContents(p);
                newRange.collapse(false);
                sel.removeAllRanges();
                sel.addRange(newRange);

                setupAllLinks();
                triggerSave();
                return;
            }

            // Tự động nhận diện @... khi gõ trong .todo-text kết thúc bằng khoảng trắng
            const parentTodo = node.parentElement?.closest(".todo-item");
            if (parentTodo && (text.endsWith(" ") || text.endsWith("\u00A0"))) {
                if (checkAndApplyReminder(parentTodo)) {
                    return;
                }
            }
        }

        setupCheckboxListeners();
        triggerSave();
    });

    // Xử lý phím Backspace & Enter trong Headings, Blockquotes, Checkboxes và Link
    editor.addEventListener("keydown", function(e) {
        const sel = window.getSelection();
        if (!sel.rangeCount || e.isComposing || e.defaultPrevented) return;
        const range = sel.getRangeAt(0);

        // 0. Xử lý phím Enter, Backspace, Tab trong danh sách LI (Bullet & Numbered Lists)
        const li = range.startContainer.parentElement?.closest("li") ||
                   (range.startContainer.tagName === "LI" ? range.startContainer : null);

        if (li) {
            const parentList = li.closest("ul, ol");

            // 0.1. Phím Enter trong LI
            if (e.key === "Enter") {
                e.preventDefault();
                const isLiEmpty = (li.textContent.trim() === "" || li.innerHTML === "<br>" || li.innerHTML === "");

                if (isLiEmpty) {
                    exitListItem(li);
                    triggerSave();
                    return;
                } else {
                    // Tạo li tiếp theo bên dưới và tách nội dung nếu con trỏ ở giữa
                    range.deleteContents();
                    const afterRange = document.createRange();
                    afterRange.setStart(range.startContainer, range.startOffset);
                    afterRange.setEnd(li, li.childNodes.length);
                    const afterFrag = afterRange.extractContents();

                    const newLi = document.createElement("li");
                    if (afterFrag.textContent.trim() === "" && afterFrag.childNodes.length === 0) {
                        newLi.innerHTML = "<br>";
                    } else {
                        newLi.appendChild(afterFrag);
                    }

                    li.parentNode.insertBefore(newLi, li.nextSibling);

                    const newRange = document.createRange();
                    newRange.setStart(newLi, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                    triggerSave();
                    return;
                }
            }

            // 0.2. Phím Backspace ở đầu LI
            if (e.key === "Backspace") {
                const before = range.cloneRange();
                before.selectNodeContents(li);
                before.setEnd(range.startContainer, range.startOffset);
                const isAtStart = range.collapsed && before.toString() === "";

                if (isAtStart) {
                    e.preventDefault();
                    const hasText = li.textContent.trim().length > 0;

                    if (!hasText) {
                        exitListItem(li);
                    } else {
                        // LI có text nhưng ấn Backspace ở đầu: chuyển thành <p> thường
                        const p = document.createElement("p");
                        while (li.firstChild) {
                            p.appendChild(li.firstChild);
                        }
                        if (li.nextElementSibling) {
                            const nextList = document.createElement(parentList ? parentList.tagName.toLowerCase() : "ul");
                            while (li.nextSibling) {
                                nextList.appendChild(li.nextSibling);
                            }
                            li.remove();
                            if (parentList && parentList.parentNode) {
                                parentList.parentNode.insertBefore(p, parentList.nextSibling);
                                parentList.parentNode.insertBefore(nextList, p.nextSibling);
                            }
                        } else {
                            li.remove();
                            if (parentList && parentList.children.length === 0) {
                                parentList.replaceWith(p);
                            } else if (parentList && parentList.parentNode) {
                                parentList.parentNode.insertBefore(p, parentList.nextSibling);
                            }
                        }
                        const newRange = document.createRange();
                        newRange.setStart(p, 0);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                    }
                    triggerSave();
                    return;
                }
            }

            // 0.3. Phím Tab / Shift + Tab trong LI: Thụt dòng (Indent / Outdent)
            if (e.key === "Tab") {
                e.preventDefault();
                if (!parentList) return;

                if (e.shiftKey) {
                    // Outdent: Lùi cấp
                    const parentLi = parentList.parentElement?.closest("li");
                    if (parentLi) {
                        const grandParentList = parentLi.closest("ul, ol");
                        if (grandParentList) {
                            grandParentList.insertBefore(li, parentLi.nextSibling);
                            if (parentList.children.length === 0) {
                                parentList.remove();
                            }
                            const newRange = document.createRange();
                            newRange.setStart(li, 0);
                            newRange.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(newRange);
                            triggerSave();
                            return;
                        }
                    }
                } else {
                    // Indent: Thụt cấp con
                    const prevLi = li.previousElementSibling;
                    if (prevLi) {
                        let subList = prevLi.querySelector("ul, ol");
                        if (!subList) {
                            subList = document.createElement(parentList.tagName.toLowerCase());
                            prevLi.appendChild(subList);
                        }
                        subList.appendChild(li);

                        const newRange = document.createRange();
                        newRange.setStart(li, 0);
                        newRange.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(newRange);
                        triggerSave();
                        return;
                    }
                }
            }
        }

        // 1. Phím Enter trong Headings (H1, H2, H3): tạo đoạn văn bản <p> mới bên dưới
        const heading = range.startContainer.parentElement?.closest("h1, h2, h3") ||
                        (range.startContainer.tagName && /^H[1-3]$/.test(range.startContainer.tagName) ? range.startContainer : null);

        if (heading && e.key === "Enter") {
            e.preventDefault();
            const p = document.createElement("p");
            p.innerHTML = "<br>";
            if (heading.nextSibling) {
                heading.parentNode.insertBefore(p, heading.nextSibling);
            } else {
                heading.parentNode.appendChild(p);
            }
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            triggerSave();
            return;
        }

        // Phím Backspace khi heading rỗng: chuyển về <p> thường
        if (heading && e.key === "Backspace" && (heading.textContent.trim() === "" || heading.innerHTML === "<br>")) {
            e.preventDefault();
            const p = document.createElement("p");
            p.innerHTML = "<br>";
            heading.replaceWith(p);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            triggerSave();
            return;
        }

        // 2. Phím Enter trong Blockquote: nếu rỗng thì thoát blockquote
        const bq = range.startContainer.parentElement?.closest("blockquote") ||
                   (range.startContainer.tagName === "BLOCKQUOTE" ? range.startContainer : null);

        if (bq && range.collapsed && (e.key === "Enter" || e.key === "Backspace") && (bq.textContent.trim() === "" || bq.innerHTML === "<br>")) {
            e.preventDefault();
            const p = document.createElement("p");
            p.innerHTML = "<br>";
            bq.replaceWith(p);
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
            triggerSave();
            return;
        }

        // 3. Phím Enter khi vừa gõ xong link URL trên dòng
        if (e.key === "Enter") {
            const node = range.startContainer;
            if (node && node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent.trim();
                const urlMatch = text.match(/^(?:>\s*)?(https?:\/\/[^\s<>]+)$/);
                const syntaxMatch = text.match(/^(?:>\s*)?\[([^\]]*)\][<\(](https?:\/\/[^\s>\)]+)[>\)]$/);
                if (urlMatch || syntaxMatch) {
                    e.preventDefault();
                    let url = "";
                    let title = "";
                    if (syntaxMatch) {
                        title = syntaxMatch[1].trim() || syntaxMatch[2].trim();
                        url = syntaxMatch[2].trim();
                    } else {
                        url = urlMatch[1];
                        title = getDomainOrTitleFromUrl(url);
                    }
                    const linkEl = createLinkElement(title, url);
                    const tableCell = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest("th, td");
                    if (tableCell) {
                        tableCell.innerHTML = "";
                        tableCell.appendChild(linkEl);
                        tableCell.appendChild(document.createTextNode(" "));

                        const newRange = document.createRange();
                        newRange.selectNodeContents(tableCell);
                        newRange.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(newRange);

                        setupAllLinks();
                        triggerSave();
                        return;
                    }

                    const parentBlock = (node.parentNode && node.parentNode !== editor) ? node.parentNode : null;

                    const p = document.createElement("p");
                    p.appendChild(linkEl);

                    const nextP = document.createElement("p");
                    nextP.innerHTML = "<br>";

                    if (parentBlock) {
                        parentBlock.replaceWith(p);
                    } else {
                        node.replaceWith(p);
                    }
                    p.parentNode.insertBefore(nextP, p.nextSibling);

                    const newRange = document.createRange();
                    newRange.setStart(nextP, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);

                    setupAllLinks();
                    triggerSave();
                    return;
                }
            }
        }

        // 4. Todo item: Backspace xóa và Enter tạo todo tiếp theo
        const todoText = range.startContainer.parentElement?.closest(".todo-text") ||
                         (range.startContainer.classList?.contains("todo-text") ? range.startContainer : null);

        if (todoText) {
            const todoItem = todoText.closest(".todo-item");

            // Phím Backspace: xóa ô checkbox nếu text rỗng
            if (e.key === "Backspace") {
                const before = range.cloneRange();
                before.selectNodeContents(todoText);
                before.setEnd(range.startContainer, range.startOffset);
                if (range.collapsed && before.toString() === "") {
                    e.preventDefault();
                    const p = document.createElement("p");
                    p.textContent = todoText.textContent;
                    if (!p.textContent) p.innerHTML = "<br>";
                    todoItem.replaceWith(p);

                    const newRange = document.createRange();
                    newRange.setStart(p, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);

                    triggerSave();
                    return;
                }
            }

            // Phím Enter: tạo todo tiếp theo hoặc thoát todo
            if (e.key === "Enter") {
                e.preventDefault();
                range.deleteContents();
                if (todoText.textContent.trim() === "") {
                    const p = document.createElement("p");
                    p.innerHTML = "<br>";
                    todoItem.replaceWith(p);
                    const newRange = document.createRange();
                    newRange.setStart(p, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                } else {
                    const after = range.cloneRange();
                    after.setEnd(todoText, todoText.childNodes.length);
                    const tail = after.extractContents();
                    const { div, span } = createTodoElement("");
                    span.appendChild(tail);
                    if (!todoText.textContent) todoText.innerHTML = "<br>";
                    checkAndApplyReminder(todoItem);
                    if (todoItem.nextSibling) {
                        todoItem.parentNode.insertBefore(div, todoItem.nextSibling);
                    } else {
                        todoItem.parentNode.appendChild(div);
                    }
                    const newRange = document.createRange();
                    newRange.setStart(span, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                }
                triggerSave();
                return;
            }
        }
    });

    // ==========================================
    // TÍNH NĂNG RESIZE ẢNH TƯƠNG TÁC
    // ==========================================

    function updateResizerPosition() {
        if (!selectedImage || !selectedImage.parentNode) {
            hideImageResizer();
            return;
        }

        const imgRect = selectedImage.getBoundingClientRect();
        const containerRect = editorContainer.getBoundingClientRect();

        const top = imgRect.top - containerRect.top + editorContainer.scrollTop;
        const left = imgRect.left - containerRect.left + editorContainer.scrollLeft;

        resizerBox.style.top = top + "px";
        resizerBox.style.left = left + "px";
        resizerBox.style.width = imgRect.width + "px";
        resizerBox.style.height = imgRect.height + "px";
        resizerBox.classList.remove("hidden");

        // Cập nhật trạng thái active của các nút kích thước
        const currentW = selectedImage.style.width || "100%";
        sizePills.forEach(pill => {
            pill.classList.toggle("active", pill.dataset.width === currentW);
        });
    }

    function selectImage(img) {
        selectedImage = img;
        updateResizerPosition();
    }

    function hideImageResizer() {
        selectedImage = null;
        resizerBox.classList.add("hidden");
    }

    // Click chọn ảnh để hiển thị khung resize
    editor.addEventListener("click", function(e) {
        if (e.target.tagName === "IMG" && e.target.classList.contains("note-image")) {
            e.stopPropagation();
            selectImage(e.target);
        } else {
            hideImageResizer();
        }
    });

    // Double-click vào ảnh để phóng to toàn màn hình xem ảnh gốc rõ nét (Lightbox)
    function openLightbox(src) {
        if (!src) return;
        hideImageResizer();
        lightboxImg.src = src;
        imageLightboxModal.classList.remove("hidden");
    }

    function closeLightbox() {
        imageLightboxModal.classList.add("hidden");
        lightboxImg.src = "";
    }

    editor.addEventListener("dblclick", function(e) {
        if (e.target.tagName === "IMG" && e.target.classList.contains("note-image")) {
            e.stopPropagation();
            openLightbox(e.target.src);
        }
    });

    btnCloseLightbox.addEventListener("click", closeLightbox);
    imageLightboxModal.addEventListener("click", function(e) {
        if (e.target !== lightboxImg) {
            closeLightbox();
        }
    });

    // Kéo thả góc để resize ảnh mượt mà
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    resizerHandle.addEventListener("pointerdown", function(e) {
        if (!selectedImage) return;
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        startX = e.clientX;
        startWidth = selectedImage.getBoundingClientRect().width;
        resizerHandle.setPointerCapture(e.pointerId);
    });

    window.addEventListener("pointermove", function(e) {
        if (!isResizing || !selectedImage) return;
        const deltaX = e.clientX - startX;
        const containerWidth = editor.getBoundingClientRect().width;
        const newWidth = Math.max(60, Math.min(containerWidth, startWidth + deltaX));
        
        selectedImage.style.width = Math.round(newWidth) + "px";
        updateResizerPosition();
    });

    window.addEventListener("pointerup", function(e) {
        if (isResizing) {
            isResizing = false;
            triggerSave();
        }
    });

    // Nút chỉnh nhanh: 30%, 60%, Vừa khung (100%)
    sizePills.forEach(pill => {
        pill.addEventListener("click", function(e) {
            e.stopPropagation();
            if (!selectedImage) return;
            const w = pill.dataset.width;
            selectedImage.style.width = w;
            updateResizerPosition();
            triggerSave();
        });
    });

    // Tự động cập nhật vị trí khung resize khi cuộn hoặc thay đổi kích thước cửa sổ
    editorContainer.addEventListener("scroll", function() {
        if (selectedImage) updateResizerPosition();
    });

    window.addEventListener("resize", function() {
        if (selectedImage) updateResizerPosition();
    });

    // Nén ảnh clipboard qua Canvas: giảm kích thước từ 20MB xuống ~150KB giúp máy không bị giật lag
    function compressClipboardImage(file, callback) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = function() {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const MAX_WIDTH = 1440;
            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;
            if (w > MAX_WIDTH) {
                h = Math.round((h * MAX_WIDTH) / w);
                w = MAX_WIDTH;
            }
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(img, 0, 0, w, h);

            // JPEG 0.85: Hình ảnh rất sắc nét, đọc rõ chữ nhưng dung lượng siêu nhẹ
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
            callback(compressedDataUrl);
        };
        img.onerror = function() {
            URL.revokeObjectURL(objectUrl);
            const reader = new FileReader();
            reader.onload = function(evt) {
                callback(evt.target.result);
            };
            reader.readAsDataURL(file);
        };
        img.src = objectUrl;
    }

    // Chèn ảnh vào vị trí con trỏ theo khối chuẩn
    function insertImage(src, imgId) {
        editor.focus();
        const img = document.createElement("img");
        img.src = src;
        img.className = "note-image";
        img.style.width = "30%";
        img.alt = "";
        if (imgId) {
            img.dataset.imgId = imgId;
        }

        const wrapper = document.createElement("p");
        wrapper.className = "image-wrapper";
        wrapper.appendChild(img);

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            range.deleteContents();

            // Tìm block chứa con trỏ hiện tại
            let currentBlock = sel.anchorNode;
            while (currentBlock && currentBlock.parentNode !== editor && currentBlock !== editor) {
                currentBlock = currentBlock.parentNode;
            }

            if (currentBlock && currentBlock !== editor) {
                if (currentBlock.textContent.trim() === "") {
                    currentBlock.replaceWith(wrapper);
                } else {
                    currentBlock.parentNode.insertBefore(wrapper, currentBlock.nextSibling);
                }
            } else {
                range.insertNode(wrapper);
            }
        } else {
            editor.appendChild(wrapper);
        }

        // Tạo sẵn một dòng mới bên dưới ảnh để gõ tiếp
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        if (wrapper.nextSibling) {
            wrapper.parentNode.insertBefore(p, wrapper.nextSibling);
        } else {
            wrapper.parentNode.appendChild(p);
        }

        try {
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            const newSel = window.getSelection();
            newSel.removeAllRanges();
            newSel.addRange(newRange);
        } catch (err) {}

        triggerSave();
        return img;
    }

    // Xử lý dán ảnh Ctrl+V từ clipboard mượt mà, không giật máy
    document.addEventListener("paste", function(e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        let imageFile = null;

        if (clipboardData.items) {
            for (let i = 0; i < clipboardData.items.length; i++) {
                const item = clipboardData.items[i];
                if (item.type && item.type.startsWith("image/")) {
                    imageFile = item.getAsFile();
                    break;
                }
            }
        }

        if (!imageFile && clipboardData.files && clipboardData.files.length > 0) {
            for (let i = 0; i < clipboardData.files.length; i++) {
                const file = clipboardData.files[i];
                if (file.type && file.type.startsWith("image/")) {
                    imageFile = file;
                    break;
                }
            }
        }

        if (imageFile) {
            e.preventDefault();
            e.stopPropagation();

            compressClipboardImage(imageFile, function(dataUrl) {
                if (!dataUrl) return;

                const imgId = "img_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
                const img = insertImage(dataUrl, imgId);

                sendIPC("save_image", {
                    img_id: imgId,
                    data: dataUrl,
                    ext: "jpg"
                });
            });
            return;
        }

        // Helper: Trích xuất tên miền hoặc hostname làm tiêu đề hiển thị ngắn gọn
        function getDomainOrTitleFromUrl(rawUrl) {
            try {
                const u = new URL(rawUrl);
                let host = u.hostname.replace(/^www\./i, "");
                return host || rawUrl;
            } catch (e) {
                return rawUrl;
            }
        }

        // Helper: Trích xuất danh sách các URL hợp lệ từ văn bản dán vào (hỗ trợ nhiều dòng)
        function extractUrlsFromText(text) {
            if (!text) return [];
            const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            const results = [];

            for (const line of lines) {
                // Cú pháp A: > [title]<url> hoặc [title](url)
                const m1 = line.match(/^>?\s*\[([^\]]*)\][<\(]([^>\)]+)[>\)]/i);
                if (m1) {
                    let title = (m1[1] || "").trim();
                    let url = (m1[2] || "").trim();
                    if (!title) title = getDomainOrTitleFromUrl(url);
                    results.push({ title, url });
                    continue;
                }

                // Cú pháp B: > <url> hoặc <url>
                const m2 = line.match(/^>?\s*<([^>]+)>/i);
                if (m2 && /^https?:\/\/\S+$/i.test(m2[1].trim())) {
                    const url = m2[1].trim();
                    results.push({ title: getDomainOrTitleFromUrl(url), url });
                    continue;
                }

                // Cú pháp C: > https://... hoặc https://...
                const m3 = line.match(/^>?\s*(https?:\/\/\S+)$/i);
                if (m3) {
                    const url = m3[1].trim();
                    results.push({ title: getDomainOrTitleFromUrl(url), url });
                    continue;
                }
            }
            return results;
        }

        // Xử lý dán URL liên kết (đơn lẻ hoặc nhiều link cùng lúc)
        const pastedText = clipboardData.getData("text");
        if (pastedText) {
            const trimmedPaste = pastedText.trim();
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const node = range.startContainer;

                // Kiểm tra xem vị trí con trỏ có tiền tố '>' không
                let hasPrefixArrow = false;
                let textBeforeCursor = "";
                let containerBlock = null;

                if (node.nodeType === Node.TEXT_NODE) {
                    textBeforeCursor = node.textContent.substring(0, range.startOffset).trim();
                    containerBlock = (node.parentElement && node.parentElement !== editor) ? (node.parentElement.closest("p, div, blockquote") || node.parentElement) : null;
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    containerBlock = (node !== editor) ? (node.closest("p, div, blockquote") || node) : null;
                    textBeforeCursor = containerBlock ? containerBlock.textContent.trim() : "";
                }

                if (textBeforeCursor === ">" || textBeforeCursor.endsWith(">") || (containerBlock && containerBlock.tagName === "BLOCKQUOTE")) {
                    hasPrefixArrow = true;
                }

                const extracted = extractUrlsFromText(trimmedPaste);
                const tableCell = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest("th, td");

                // Điều kiện kích hoạt chèn link bookmark:
                // 1. Dán nhiều link cùng lúc (extracted.length >= 2)
                // 2. Dán vào ô Table và có link (tableCell && extracted.length >= 1)
                // 3. Có tiền tố '>' trước con trỏ và có link (hasPrefixArrow && extracted.length >= 1)
                // 4. Chuỗi dán bắt đầu bằng cú pháp bookmark '> ' (trimmedPaste.startsWith(">") && extracted.length >= 1)
                const shouldHandleAsLinks = (extracted.length >= 2) || 
                                           (tableCell && extracted.length >= 1) || 
                                           (hasPrefixArrow && extracted.length >= 1) || 
                                           (trimmedPaste.startsWith(">") && extracted.length >= 1);

                if (shouldHandleAsLinks) {
                    e.preventDefault();
                    e.stopPropagation();

                    // TRƯỜNG HỢP 1: DÁN VÀO TRONG BẢNG (TABLE) - ĐIỀN DỌC THEO CÁC HÀNG
                    if (tableCell) {
                        let curTr = tableCell.closest("tr");
                        const tableEl = curTr ? curTr.closest("table") : null;
                        const colIndex = curTr ? Array.from(curTr.children).indexOf(tableCell) : 0;
                        const colCount = curTr ? curTr.children.length : 1;
                        let lastCell = tableCell;

                        extracted.forEach(function(item, idx) {
                            if (idx === 0) {
                                tableCell.innerHTML = "";
                                tableCell.appendChild(createLinkElement(item.title, item.url));
                                tableCell.appendChild(document.createTextNode(" "));
                                lastCell = tableCell;
                            } else {
                                let nextTr = curTr ? curTr.nextElementSibling : null;
                                if (!nextTr && tableEl) {
                                    // Tự động thêm hàng mới nếu hết hàng
                                    const tbody = tableEl.querySelector("tbody") || tableEl;
                                    nextTr = document.createElement("tr");
                                    for (let c = 0; c < colCount; c++) {
                                        const td = document.createElement("td");
                                        td.setAttribute("contenteditable", "true");
                                        td.innerHTML = "<br>";
                                        nextTr.appendChild(td);
                                    }
                                    tbody.appendChild(nextTr);
                                }
                                if (nextTr) {
                                    curTr = nextTr;
                                    const targetTd = curTr.children[colIndex] || curTr.firstElementChild;
                                    if (targetTd) {
                                        targetTd.innerHTML = "";
                                        targetTd.appendChild(createLinkElement(item.title, item.url));
                                        targetTd.appendChild(document.createTextNode(" "));
                                        lastCell = targetTd;
                                    }
                                }
                            }
                        });

                        const newRange = document.createRange();
                        newRange.selectNodeContents(lastCell);
                        newRange.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(newRange);

                        setupAllLinks();
                        setupAllTables();
                        triggerSave();
                        if (extracted.length > 1) {
                            showToast("Đã điền " + extracted.length + " liên kết vào bảng!", 2500);
                        }
                        return;
                    }

                    // TRƯỜNG HỢP 2: DÁN VÀO TRÌNH SOẠN THẢO THƯỜNG - TỰ TÁCH THÀNH DANH SÁCH LINK
                    const createdPs = [];
                    extracted.forEach(function(item) {
                        const p = document.createElement("p");
                        p.appendChild(createLinkElement(item.title, item.url));
                        p.appendChild(document.createTextNode(" "));
                        createdPs.push(p);
                    });

                    if (containerBlock && containerBlock !== editor && (containerBlock.textContent.trim() === ">" || containerBlock.textContent.trim() === "> " || containerBlock.tagName === "BLOCKQUOTE")) {
                        containerBlock.replaceWith(createdPs[0]);
                        let prev = createdPs[0];
                        for (let k = 1; k < createdPs.length; k++) {
                            prev.parentNode.insertBefore(createdPs[k], prev.nextSibling);
                            prev = createdPs[k];
                        }
                    } else if (node.nodeType === Node.TEXT_NODE && (textBeforeCursor === ">" || textBeforeCursor === "> ")) {
                        node.textContent = node.textContent.substring(range.startOffset);
                        let anchor = (containerBlock && containerBlock !== editor) ? containerBlock : node;
                        for (let k = 0; k < createdPs.length; k++) {
                            anchor.parentNode.insertBefore(createdPs[k], anchor);
                        }
                        if (containerBlock && !containerBlock.textContent.trim()) {
                            containerBlock.remove();
                        }
                    } else {
                        const targetBlock = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest("p, div, h1, h2, h3, blockquote");
                        if (targetBlock && targetBlock !== editor && !targetBlock.textContent.trim()) {
                            targetBlock.replaceWith(createdPs[0]);
                            let prev = createdPs[0];
                            for (let k = 1; k < createdPs.length; k++) {
                                prev.parentNode.insertBefore(createdPs[k], prev.nextSibling);
                                prev = createdPs[k];
                            }
                        } else if (targetBlock && targetBlock !== editor) {
                            let prev = targetBlock;
                            for (let k = 0; k < createdPs.length; k++) {
                                targetBlock.parentNode.insertBefore(createdPs[k], prev.nextSibling);
                                prev = createdPs[k];
                            }
                        } else {
                            range.deleteContents();
                            for (let k = 0; k < createdPs.length; k++) {
                                range.insertNode(createdPs[k]);
                            }
                        }
                    }

                    const lastP = createdPs[createdPs.length - 1];
                    const newRange = document.createRange();
                    newRange.selectNodeContents(lastP);
                    newRange.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(newRange);

                    setupAllLinks();
                    triggerSave();
                    if (extracted.length > 1) {
                        showToast("Đã chèn " + extracted.length + " liên kết bookmark gọn gàng!", 3000);
                    }
                    return;
                }
            }
        }
    });

    // ==========================================
    // TÌM KIẾM TAB NHANH (Ctrl + /)
    // ==========================================
    let searchSelectedIndex = 0;
    let filteredTabs = [];

    function openTabSearchModal() {
        tabSearchInput.value = "";
        tabSearchModal.classList.remove("hidden");
        tabSearchInput.focus();
        renderTabSearchResults("");
    }

    function closeTabSearchModal() {
        tabSearchModal.classList.add("hidden");
    }

    function renderTabSearchResults(query) {
        const q = query.trim().toLowerCase();
        filteredTabs = tabs.filter(t => t.title.toLowerCase().includes(q));
        searchSelectedIndex = 0;
        tabSearchResults.innerHTML = "";

        if (filteredTabs.length === 0) {
            const empty = document.createElement("div");
            empty.className = "search-result-item";
            empty.textContent = "Không tìm thấy tab nào phù hợp";
            empty.style.color = "var(--text-subtle)";
            empty.style.pointerEvents = "none";
            tabSearchResults.appendChild(empty);
            return;
        }

        filteredTabs.forEach((tab, idx) => {
            const item = document.createElement("div");
            item.className = "search-result-item" + (idx === searchSelectedIndex ? " active" : "");

            const titleSpan = document.createElement("span");
            titleSpan.textContent = tab.title;
            item.appendChild(titleSpan);

            if (tab.id === currentTabId) {
                const tag = document.createElement("span");
                tag.className = "search-result-tag";
                tag.textContent = "Đang mở";
                item.appendChild(tag);
            }

            item.addEventListener("click", () => {
                switchTab(tab.id);
                closeTabSearchModal();
            });

            tabSearchResults.appendChild(item);
        });
    }

    function updateSearchSelectionUI() {
        const items = tabSearchResults.querySelectorAll(".search-result-item");
        items.forEach((item, idx) => {
            item.classList.toggle("active", idx === searchSelectedIndex);
            if (idx === searchSelectedIndex) {
                item.scrollIntoView({ block: "nearest" });
            }
        });
    }

    tabSearchInput.addEventListener("input", (e) => {
        renderTabSearchResults(e.target.value);
    });

    tabSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (filteredTabs.length > 0) {
                searchSelectedIndex = (searchSelectedIndex + 1) % filteredTabs.length;
                updateSearchSelectionUI();
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (filteredTabs.length > 0) {
                searchSelectedIndex = (searchSelectedIndex - 1 + filteredTabs.length) % filteredTabs.length;
                updateSearchSelectionUI();
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (filteredTabs[searchSelectedIndex]) {
                switchTab(filteredTabs[searchSelectedIndex].id);
                closeTabSearchModal();
            }
        } else if (e.key === "Escape") {
            closeTabSearchModal();
        }
    });

    btnSearchTab.addEventListener("click", openTabSearchModal);

    // ==========================================
    // CYCLE TAB (Ctrl + Tab / Ctrl + Shift + Tab)
    // ==========================================
    function cycleTab(forward = true) {
        if (tabs.length <= 1) return;
        const currentIndex = tabs.findIndex(t => t.id === currentTabId);
        if (currentIndex === -1) return;
        const nextIndex = forward 
            ? (currentIndex + 1) % tabs.length 
            : (currentIndex - 1 + tabs.length) % tabs.length;
        switchTab(tabs[nextIndex].id);
    }

    // ==========================================
    // CÀI ĐẶT (SETTINGS MODAL & AI CONFIG)
    // ==========================================
    const aiRadioLocal = document.getElementById("ai-radio-local");
    const aiRadioCloud = document.getElementById("ai-radio-cloud");
    const aiRadioOff = document.getElementById("ai-radio-off");
    const aiConfigLocal = document.getElementById("ai-config-local");
    const aiConfigCloud = document.getElementById("ai-config-cloud");
    const aiLocalUrl = document.getElementById("ai-local-url");
    const aiLocalModel = document.getElementById("ai-local-model");
    const btnTestLocalAi = document.getElementById("btn-test-local-ai");
    const testLocalResult = document.getElementById("test-local-result");
    const aiCloudUrl = document.getElementById("ai-cloud-url");
    const aiCloudKey = document.getElementById("ai-cloud-key");
    const aiCloudModel = document.getElementById("ai-cloud-model");
    const btnTestCloudAi = document.getElementById("btn-test-cloud-ai");
    const testCloudResult = document.getElementById("test-cloud-result");

    function getAIConfig() {
        try {
            const raw = localStorage.getItem("note_local_ai_config");
            const parsed = raw ? JSON.parse(raw) : {};
            return {
                provider: parsed.provider || "local",
                localUrl: parsed.localUrl || "http://localhost:11434/v1",
                localModel: parsed.localModel || "llama3.2",
                cloudUrl: parsed.cloudUrl || "https://generativelanguage.googleapis.com/v1beta/openai/",
                cloudKey: parsed.cloudKey || "",
                cloudModel: parsed.cloudModel === "gemini-1.5-flash" &&
                    (!parsed.cloudUrl || parsed.cloudUrl.startsWith("https://generativelanguage.googleapis.com/"))
                    ? "gemini-2.5-flash" : parsed.cloudModel || "gemini-2.5-flash"
            };
        } catch (e) {
            return {
                provider: "local",
                localUrl: "http://localhost:11434/v1",
                localModel: "llama3.2",
                cloudUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
                cloudKey: "",
                cloudModel: "gemini-2.5-flash"
            };
        }
    }

    // Modern Settings Tabs Navigation
    const settingsTabBtns = document.querySelectorAll(".settings-tab-btn");
    const settingsTabPanes = document.querySelectorAll(".settings-tab-pane");

    settingsTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            settingsTabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            settingsTabPanes.forEach(pane => {
                if (pane.id === `tab-pane-${tab}`) {
                    pane.classList.remove("hidden");
                } else {
                    pane.classList.add("hidden");
                }
            });
        });
    });

    // 3 Visual Choice Cards for AI Provider
    const aiModeCards = document.querySelectorAll(".ai-mode-card");
    function selectAIMode(mode) {
        aiModeCards.forEach(card => {
            if (card.dataset.mode === mode) {
                card.classList.add("selected");
            } else {
                card.classList.remove("selected");
            }
        });
        if (aiRadioLocal) aiRadioLocal.checked = (mode === "local");
        if (aiRadioCloud) aiRadioCloud.checked = (mode === "cloud");
        if (aiRadioOff) aiRadioOff.checked = (mode === "off");

        if (mode === "local") {
            aiConfigLocal?.classList.remove("hidden");
            aiConfigCloud?.classList.add("hidden");
        } else if (mode === "cloud") {
            aiConfigLocal?.classList.add("hidden");
            aiConfigCloud?.classList.remove("hidden");
        } else {
            aiConfigLocal?.classList.add("hidden");
            aiConfigCloud?.classList.add("hidden");
        }
    }

    aiModeCards.forEach(card => {
        card.addEventListener("click", () => {
            selectAIMode(card.dataset.mode);
        });
    });

    // Quick Chips for Local AI Model
    document.querySelectorAll(".preset-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            const m = pill.dataset.model;
            if (aiLocalModel) aiLocalModel.value = m;
        });
    });

    // Cloud Provider Preset Buttons
    const cloudPresetBtns = document.querySelectorAll(".cloud-preset-btn");
    const cloudProviders = {
        gemini: {
            url: "https://generativelanguage.googleapis.com/v1beta/openai/",
            model: "gemini-2.5-flash"
        },
        deepseek: {
            url: "https://api.deepseek.com/v1",
            model: "deepseek-chat"
        },
        openai: {
            url: "https://api.openai.com/v1",
            model: "gpt-4o-mini"
        },
        groq: {
            url: "https://api.groq.com/openai/v1",
            model: "llama-3.3-70b-versatile"
        }
    };

    cloudPresetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            cloudPresetBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const prov = btn.dataset.provider;
            if (cloudProviders[prov]) {
                if (aiCloudUrl) aiCloudUrl.value = cloudProviders[prov].url;
                if (aiCloudModel) aiCloudModel.value = cloudProviders[prov].model;
            }
        });
    });

    aiCloudKey?.addEventListener("input", () => {
        const key = aiCloudKey.value.trim();
        let provider;
        if (key.startsWith("AQ.") || key.startsWith("AIzaSy")) provider = "gemini";
        else if (key.startsWith("gsk_")) provider = "groq";
        else if (key.startsWith("sk-") && !key.startsWith("sk-ant")) {
            provider = document.querySelector('.cloud-preset-btn.active')?.dataset.provider === "deepseek"
                ? "deepseek" : "openai";
        }
        if (provider) {
            selectAIMode("cloud");
            document.querySelector(`.cloud-preset-btn[data-provider="${provider}"]`)?.click();
        }
    });

    // Password Visibility Toggle for Cloud API Key
    const btnToggleKey = document.getElementById("btn-toggle-key-visibility");
    if (btnToggleKey && aiCloudKey) {
        btnToggleKey.addEventListener("click", () => {
            const isPass = aiCloudKey.type === "password";
            aiCloudKey.type = isPass ? "text" : "password";
            btnToggleKey.innerHTML = isPass
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
        });
    }

    function openSettingsModal() {
        txturlServiceInput.value = localStorage.getItem("note_local_txturl_service") || "https://michaeltran8386.github.io/note-app/";
        const aiCfg = getAIConfig();
        selectAIMode(aiCfg.provider || "local");

        if (aiLocalUrl) aiLocalUrl.value = aiCfg.localUrl;
        if (aiLocalModel) aiLocalModel.value = aiCfg.localModel;
        if (aiCloudUrl) aiCloudUrl.value = aiCfg.cloudUrl;
        if (aiCloudKey) aiCloudKey.value = aiCfg.cloudKey;
        if (aiCloudModel) aiCloudModel.value = aiCfg.cloudModel;
        cloudPresetBtns.forEach(btn => {
            btn.classList.toggle("active", cloudProviders[btn.dataset.provider]?.url.replace(/\/+$/, "") ===
                aiCfg.cloudUrl.replace(/\/+$/, ""));
        });
        if (testLocalResult) testLocalResult.textContent = "";
        if (testCloudResult) testCloudResult.textContent = "";

        // Reset to first tab (AI) on open
        settingsTabBtns[0]?.click();

        settingsModal.classList.remove("hidden");
    }

    function closeSettingsModal() {
        settingsModal.classList.add("hidden");
    }

    btnSettings.addEventListener("click", openSettingsModal);
    btnCloseSettings.addEventListener("click", closeSettingsModal);
    btnSaveSettings.addEventListener("click", () => {
        const service = txturlServiceInput.value.trim() || "https://michaeltran8386.github.io/note-app/";
        localStorage.setItem("note_local_txturl_service", service);

        const selectedProvider = document.querySelector(".ai-mode-card.selected")?.dataset.mode || "local";
        selectAIMode(selectedProvider);
        const aiCfg = {
            provider: selectedProvider,
            localUrl: aiLocalUrl?.value.trim() || "http://localhost:11434/v1",
            localModel: aiLocalModel?.value.trim() || "llama3.2",
            cloudUrl: aiCloudUrl?.value.trim() || "https://generativelanguage.googleapis.com/v1beta/openai/",
            cloudKey: aiCloudKey?.value.trim() || "",
            cloudModel: aiCloudModel?.value.trim() || "gemini-2.5-flash"
        };
        localStorage.setItem("note_local_ai_config", JSON.stringify(aiCfg));

        closeSettingsModal();
        showToast("Đã lưu cài đặt và cấu hình AI thành công!");
    });

    // Test Local AI
    btnTestLocalAi?.addEventListener("click", async () => {
        if (!testLocalResult) return;
        testLocalResult.className = "test-result";
        testLocalResult.textContent = "Đang kiểm tra kết nối...";
        const url = (aiLocalUrl?.value.trim() || "http://localhost:11434/v1").replace(/\/+$/, "");
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`${url}/models`, { method: "GET", signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                testLocalResult.className = "test-result success";
                testLocalResult.textContent = "✓ Kết nối Ollama thành công!";
            } else {
                testLocalResult.className = "test-result error";
                testLocalResult.textContent = `✗ HTTP ${res.status}`;
            }
        } catch (e) {
            testLocalResult.className = "test-result error";
            testLocalResult.textContent = "✗ Không kết nối được. Hãy chạy 'ollama run <model>'";
        }
    });

    // Test Cloud AI
    btnTestCloudAi?.addEventListener("click", async () => {
        if (!testCloudResult) return;
        testCloudResult.className = "test-result";
        testCloudResult.textContent = "Đang kiểm tra API Key...";
        const url = (aiCloudUrl?.value.trim() || "https://generativelanguage.googleapis.com/v1beta/openai/").replace(/\/+$/, "");
        const key = aiCloudKey?.value.trim() || "";
        const model = aiCloudModel?.value.trim() || "gemini-2.5-flash";
        if (!key) {
            testCloudResult.className = "test-result error";
            testCloudResult.textContent = "✗ Vui lòng nhập API Key";
            return;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(`${url}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 5
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                testCloudResult.className = "test-result success";
                testCloudResult.textContent = "✓ API Key hợp lệ và sẵn sàng!";
            } else {
                const errJson = await res.json().catch(() => ({}));
                testCloudResult.className = "test-result error";
                testCloudResult.textContent = `✗ Lỗi ${res.status}: ${errJson.error?.message || res.statusText}`;
            }
        } catch (e) {
            testCloudResult.className = "test-result error";
            testCloudResult.textContent = "✗ Lỗi kết nối mạng: " + (e.message || e);
        }
    });

    // ==========================================
    // GLOBAL KEYBOARD SHORTCUTS
    // ==========================================
    window.addEventListener("keydown", function(e) {
        // Ctrl + / : Tìm kiếm tab nhanh
        if (e.ctrlKey && (e.key === "/" || e.code === "Slash")) {
            e.preventDefault();
            if (tabSearchModal.classList.contains("hidden")) {
                openTabSearchModal();
            } else {
                closeTabSearchModal();
            }
            return;
        }

        // Ctrl + Tab / Ctrl + Shift + Tab : Chuyển tiếp / cycle tab
        if (e.ctrlKey && e.key === "Tab") {
            e.preventDefault();
            cycleTab(!e.shiftKey);
            return;
        }

        // Ctrl + N : Tạo tab mới
        if (e.ctrlKey && (e.key === "n" || e.key === "N")) {
            e.preventDefault();
            btnAddTab.click();
            return;
        }

        // Ctrl + J : Bật/Tắt trợ lý AI (Notion AI)
        if (e.ctrlKey && (e.key === "j" || e.key === "J")) {
            e.preventDefault();
            if (typeof toggleAIPromptBar === "function") {
                toggleAIPromptBar();
            }
            return;
        }

        // Escape: Đóng các modal đang mở
        if (e.key === "Escape") {
            if (typeof closeAIPromptBar === "function" && document.getElementById("ai-prompt-bar") && !document.getElementById("ai-prompt-bar").classList.contains("hidden")) {
                closeAIPromptBar();
            } else if (typeof closeSlashMenu === "function" && document.getElementById("slash-menu") && !document.getElementById("slash-menu").classList.contains("hidden")) {
                closeSlashMenu();
            } else if (typeof hideBubbleToolbar === "function" && document.getElementById("bubble-toolbar") && !document.getElementById("bubble-toolbar").classList.contains("hidden")) {
                hideBubbleToolbar();
            } else if (document.getElementById("block-menu-popover") && !document.getElementById("block-menu-popover").classList.contains("hidden")) {
                document.getElementById("block-menu-popover").classList.add("hidden");
            } else if (sharePopover && !sharePopover.classList.contains("hidden")) {
                closeSharePopover();
            } else if (!imageLightboxModal.classList.contains("hidden")) {
                closeLightbox();
            } else if (!tabSearchModal.classList.contains("hidden")) {
                closeTabSearchModal();
            } else if (!settingsModal.classList.contains("hidden")) {
                closeSettingsModal();
            } else if (!renameModal.classList.contains("hidden")) {
                closeRenameModal();
            }
        }
    });

    // ==========================================
    // XỬ LÝ ẢNH TỰ ĐỘNG CHUYỂN THÀNH DATA URL KHI CHIA SẺ
    // ==========================================
    function compressImageViaCanvas(imgNode) {
        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            let w = imgNode.naturalWidth || imgNode.width || 800;
            let h = imgNode.naturalHeight || imgNode.height || 600;
            const maxDim = 360;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                }
            }
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(imgNode, 0, 0, w, h);
            return canvas.toDataURL("image/jpeg", 0.45);
        } catch (err) {
            console.warn("Canvas compression fallback:", err);
            return imgNode.src;
        }
    }

    async function getImageShareSrc(imgNode) {
        // 1. Nếu là URL web công khai (không phải notelocal.app)
        if (imgNode.src && imgNode.src.startsWith("http") && !imgNode.src.includes("notelocal.app")) {
            return imgNode.src;
        }
        // 2. Nếu đã là Data URL trực tiếp
        if (imgNode.src && imgNode.src.startsWith("data:image/")) {
            if (imgNode.src.length > 80000) {
                return compressImageViaCanvas(imgNode);
            }
            return imgNode.src;
        }
        // 3. Nếu là ảnh nội bộ https://notelocal.app/assets/xxx.png
        return compressImageViaCanvas(imgNode);
    }

    async function getNoteMarkdown() {
        let lines = [];
        const children = Array.from(editor.childNodes);
        for (const node of children) {
            if (node.nodeType === Node.TEXT_NODE) {
                const txt = node.textContent.trim();
                if (txt) lines.push(txt);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = node.tagName.toUpperCase();

                // 0.1 Bố cục đa cột (Multi-column Layout kiểu Notion)
                if (node.classList && node.classList.contains("block-columns")) {
                    lines.push(node.outerHTML);
                }
                // 0.2 Hộp lưu ý (Callout)
                else if (node.classList && node.classList.contains("block-callout")) {
                    const txt = node.querySelector(".callout-text")?.textContent?.trim() || node.textContent.replace(/^[💡ℹ️⚠️📌🔥]\s*/, "").trim();
                    lines.push(`> [!NOTE]\n> ${txt}`);
                }
                // 0. Bảng biểu (Table hoặc .table-wrapper) - Phải kiểm tra TRƯỚC các thẻ DIV / P
                else if (tag === "TABLE" || (node.classList && node.classList.contains("table-wrapper")) || (node.querySelector && node.querySelector("table.note-table"))) {
                    const tbl = (tag === "TABLE") ? node : node.querySelector("table.note-table");
                    if (tbl) {
                        lines.push(serializeTableToCleanHtml(tbl));
                    }
                } else if (node.classList && (node.classList.contains("note-link-wrap") || node.querySelector(".note-link-wrap") || node.classList.contains("link-card") || node.querySelector(".link-card"))) {
                    const wrap = node.classList.contains("note-link-wrap") ? node : (node.querySelector(".note-link-wrap") || node.querySelector(".link-card") || node);
                    const title = wrap.dataset.title || wrap.querySelector(".note-link, .link-card-title")?.textContent?.trim() || "";
                    const url = wrap.dataset.url || "";
                    if (url) {
                        lines.push(`[${title || url}](${url})`);
                    }
                } else if (tag === "UL" || tag === "OL") {
                    lines.push(...serializeListNode(node, 0));
                } else if (tag === "LI") {
                    const txt = node.textContent.trim();
                    if (txt) lines.push(`- ${txt}`);
                } else if (node.classList.contains("todo-item")) {
                    const cb = node.querySelector(".todo-check");
                    const span = node.querySelector(".todo-text");
                    const mark = (cb && cb.checked) ? "x" : " ";
                    let text = span ? span.textContent.trim() : "";
                    const badge = node.querySelector(".reminder-badge");
                    if (badge && badge.dataset.display) {
                        text += ` @${badge.dataset.display}`;
                    }
                    lines.push(`- [${mark}] ${text}`);
                } else if (tag === "H1") {
                    lines.push(`# ${node.textContent.trim()}`);
                } else if (tag === "H2") {
                    lines.push(`## ${node.textContent.trim()}`);
                } else if (tag === "H3") {
                    lines.push(`### ${node.textContent.trim()}`);
                } else if (tag === "BLOCKQUOTE") {
                    lines.push(`> ${node.textContent.trim()}`);
                } else if (tag === "HR") {
                    lines.push("---");
                } else if (tag === "IMG") {
                    const src = await getImageShareSrc(node);
                    let label = "image|30%";
                    if (node.style.width && node.style.width !== "100%") {
                        label = `image|${node.style.width}`;
                    }
                    lines.push(`![${label}](${src})`);
                } else if (tag === "P" || tag === "DIV") {
                    let subtext = "";
                    let hasSub = false;
                    for (const child of Array.from(node.childNodes)) {
                        if (child.nodeType === Node.ELEMENT_NODE) {
                            if (child.classList && (child.classList.contains("note-link-wrap") || child.classList.contains("link-card"))) {
                                hasSub = true;
                                const title = child.dataset.title || child.querySelector(".note-link, .link-card-title")?.textContent?.trim() || "";
                                const url = child.dataset.url || "";
                                if (url) {
                                    lines.push(`[${title || url}](${url})`);
                                }
                            } else if (child.classList && child.classList.contains("todo-item")) {
                                hasSub = true;
                                const cb = child.querySelector(".todo-check");
                                const span = child.querySelector(".todo-text");
                                const mark = (cb && cb.checked) ? "x" : " ";
                                let text = span ? span.textContent.trim() : "";
                                const badge = child.querySelector(".reminder-badge");
                                if (badge && badge.dataset.display) {
                                    text += ` @${badge.dataset.display}`;
                                }
                                lines.push(`- [${mark}] ${text}`);
                            } else if (child.tagName === "IMG") {
                                hasSub = true;
                                const src = await getImageShareSrc(child);
                                let label = "image|30%";
                                if (child.style.width && child.style.width !== "100%") {
                                    label = `image|${child.style.width}`;
                                }
                                lines.push(`![${label}](${src})`);
                            } else {
                                subtext += child.textContent;
                            }
                        } else if (child.nodeType === Node.TEXT_NODE) {
                            subtext += child.textContent;
                        }
                    }
                    if (!hasSub) {
                        const clean = node.textContent.trim();
                        if (clean) lines.push(clean);
                    } else if (subtext.trim()) {
                        lines.push(subtext.trim());
                    }
                }
            }
        }
        return lines.join("\n\n");
    }

    // ==========================================
    // MÃ HÓA CLEAN TEXT URL & RÚT GỌN LINK
    // ==========================================
    async function compressToTxtUrl(text) {
        if (!text) text = "";
        if (window.CompressionStream) {
            const stream = new CompressionStream("deflate-raw");
            const writer = stream.writable.getWriter();
            writer.write(new TextEncoder().encode(text));
            writer.close();
            const buf = await new Response(stream.readable).arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binary = "";
            for (const b of bytes) binary += String.fromCharCode(b);
            return btoa(binary)
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=/g, "");
        } else {
            return btoa(unescape(encodeURIComponent(text)))
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=/g, "");
        }
    }

    async function decompressFromTxtUrl(b64url) {
        if (!b64url) return "";
        try {
            const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
            const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
            const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));

            if (window.DecompressionStream) {
                const stream = new DecompressionStream("deflate-raw");
                const writer = stream.writable.getWriter();
                writer.write(bytes);
                writer.close();
                return new TextDecoder().decode(
                    await new Response(stream.readable).arrayBuffer()
                );
            } else {
                return decodeURIComponent(escape(atob(padded)));
            }
        } catch (e) {
            try {
                const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
                const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
                return decodeURIComponent(escape(atob(padded)));
            } catch (err) {
                console.error("Decompress failed:", err);
                return "";
            }
        }
    }

    async function shortenUrl(longUrl) {
        // 1. Thử TinyURL API
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const short = (await res.text()).trim();
                if (short.startsWith("http")) return short;
            }
        } catch (e) {
            console.warn("TinyURL shortener failed, trying is.gd:", e);
        }

        // 2. Thử is.gd API làm dự phòng
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
                const short = (await res.text()).trim();
                if (short.startsWith("http")) return short;
            }
        } catch (e) {
            console.warn("is.gd shortener failed:", e);
        }

        // 3. Fallback trả về link gốc nếu ngoại tuyến
        return longUrl;
    }

    // ==========================================
    // POPOVER CHIA SẺ & HỢP NHẤT (SHARE & MERGE)
    // ==========================================
    const sharePopover = document.getElementById("share-popover");
    const shareShortUrlInput = document.getElementById("share-short-url-input");
    const btnCopyShortUrl = document.getElementById("btn-copy-short-url");
    const linkCopyFullUrl = document.getElementById("link-copy-full-url");
    const importUpdateUrlInput = document.getElementById("import-update-url-input");
    const btnApplyUpdateCurrent = document.getElementById("btn-apply-update-current");
    const btnApplyUpdateNew = document.getElementById("btn-apply-update-new");

    let latestFullShareUrl = "";
    let latestShortShareUrl = "";

    function closeTablePicker() {
        if (tablePickerPopover) tablePickerPopover.classList.add("hidden");
    }

    function closeSharePopover() {
        if (sharePopover) sharePopover.classList.add("hidden");
    }

    btnExportUrl.addEventListener("click", async function(e) {
        e.stopPropagation();
        closeTablePicker();
        closeLinkEditPopover();

        // Mở popover chia sẻ
        if (sharePopover) {
            sharePopover.classList.remove("hidden");
        }
        if (shareShortUrlInput) {
            shareShortUrlInput.value = "Đang tạo link...";
        }

        try {
            const activeTab = tabs.find(t => t.id === currentTabId);
            const title = (activeTab && activeTab.title && activeTab.title !== "Ghi chú mới") ? activeTab.title : "";
            const mdContent = await getNoteMarkdown();

            // Nén bằng deflate-raw base64url
            const hash = await compressToTxtUrl(mdContent);
            const serviceBase = localStorage.getItem("note_local_txturl_service") || "https://michaeltran8386.github.io/note-app/";
            const cleanBase = serviceBase.endsWith("/") ? serviceBase : (serviceBase + "/");
            latestFullShareUrl = `${cleanBase}#${hash}`;
            latestShortShareUrl = latestFullShareUrl;

            if (shareShortUrlInput) {
                shareShortUrlInput.value = latestFullShareUrl;
                shareShortUrlInput.focus();
                shareShortUrlInput.select();
            }

            // Tự động sao chép link vào Clipboard ngay lập tức
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(latestFullShareUrl);
                } catch (e) {}
            }
            sendIPC("copy_to_clipboard", { text: latestFullShareUrl });

            // Thông báo người dùng link đã được copy thành công
            if (latestFullShareUrl.length <= 2000) {
                showToast("Đã sao chép link Web vào Clipboard! Đang rút gọn...", 2500);
                sendIPC("shorten_url", { url: latestFullShareUrl });
            } else {
                showToast("Đã sao chép link chia sẻ vào Clipboard!", 3500);
            }

            // Thu thập ảnh và gửi snapshot local
            const imgNodes = editor.querySelectorAll("img");
            const imagePaths = [];
            imgNodes.forEach(function(img) {
                const assetSrc = img.dataset.assetSrc || img.getAttribute("src");
                if (assetSrc && assetSrc.includes("assets/")) {
                    const rel = assetSrc.substring(assetSrc.indexOf("assets/"));
                    imagePaths.push(rel);
                }
            });

            sendIPC("publish_web_share", {
                note_id: currentTabId,
                title: title,
                markdown_content: mdContent,
                referenced_images: imagePaths,
                public_url: latestFullShareUrl
            });
        } catch (err) {
            console.error("Lỗi chia sẻ:", err);
            if (shareShortUrlInput) shareShortUrlInput.value = "Lỗi tạo link";
            showToast("Lỗi khi tạo link: " + err.message, 3500);
        }
    });

    if (btnCopyShortUrl) {
        btnCopyShortUrl.addEventListener("click", async function() {
            const val = shareShortUrlInput.value;
            if (val && !val.startsWith("Đang") && !val.startsWith("Lỗi")) {
                if (navigator.clipboard) await navigator.clipboard.writeText(val);
                sendIPC("copy_to_clipboard", { text: val });
                showToast("Đã sao chép link rút gọn!", 2500);
            }
        });
    }

    if (linkCopyFullUrl) {
        linkCopyFullUrl.addEventListener("click", async function(e) {
            e.preventDefault();
            if (latestFullShareUrl) {
                if (navigator.clipboard) await navigator.clipboard.writeText(latestFullShareUrl);
                sendIPC("copy_to_clipboard", { text: latestFullShareUrl });
                showToast("Đã sao chép link đầy đủ (Offline Hash)!", 2500);
            }
        });
    }

    const pendingUrlResolvers = {};
    let urlResolverSeq = 0;

    function resolveShortUrlViaIPC(shortUrl) {
        return new Promise(resolve => {
            const reqId = "res_" + (++urlResolverSeq) + "_" + Date.now();
            pendingUrlResolvers[reqId] = resolve;
            sendIPC("resolve_url", { url: shortUrl, req_id: reqId });
            setTimeout(() => {
                if (pendingUrlResolvers[reqId]) {
                    delete pendingUrlResolvers[reqId];
                    resolve(shortUrl);
                }
            }, 4000);
        });
    }

    // Helper: Trích xuất Markdown từ link chia sẻ hoặc link rút gọn
    async function extractMarkdownFromUrl(inputUrl) {
        let raw = (inputUrl || "").trim();
        if (!raw) return null;

        // Nếu là link rút gọn TinyURL / is.gd -> theo dấu chuyển hướng qua C++ native
        if (raw.includes("tinyurl.com") || raw.includes("is.gd")) {
            showToast("Đang kết nối link rút gọn...", 2000);
            raw = await resolveShortUrlViaIPC(raw);
        }

        let encodedData = "";
        // 1. Kiểm tra query param ?p= hoặc ?data=
        if (raw.includes("?")) {
            try {
                const parsedUrl = new URL(raw);
                encodedData = parsedUrl.searchParams.get("p") || parsedUrl.searchParams.get("data") || "";
            } catch (e) {}
        }
        // 2. Nếu chưa có, lấy phần sau dấu #
        if (!encodedData && raw.includes("#")) {
            encodedData = raw.split("#")[1];
        }
        // 3. Nếu người dùng dán chuỗi hash thô
        if (!encodedData && !raw.startsWith("http")) {
            encodedData = raw;
        }

        if (!encodedData) return null;

        const md = await decompressFromTxtUrl(encodedData);
        return md;
    }

    async function handleApplyUpdate(mode) {
        const inputVal = importUpdateUrlInput.value.trim();
        if (!inputVal) {
            showToast("Vui lòng dán link bản sửa vào ô nhập!", 2500);
            return;
        }

        const lines = inputVal.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        showToast(lines.length > 1 ? `Đang giải mã và nhập ${lines.length} ghi chú...` : "Đang giải mã bản chỉnh sửa...", 2500);
        
        let successCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const urlItem = lines[i];
            try {
                const md = await extractMarkdownFromUrl(urlItem);
                if (!md) continue;

                // Trích xuất tiêu đề từ dòng đầu tiên có #
                let title = "";
                for (const line of md.split("\n")) {
                    const m = line.match(/^#+\s+(.*\S)/);
                    if (m) {
                        title = m[1].trim();
                        break;
                    }
                }

                const targetMode = (mode === "current" && i === 0) ? "current" : "new_tab";
                sendIPC("import_shared_note", {
                    mode: targetMode,
                    markdown: md,
                    title: title || (lines.length > 1 ? `Ghi chú ${i + 1}` : "Ghi chú chia sẻ")
                });
                successCount++;
            } catch (err) {
                console.warn("Import failed for item:", urlItem, err);
            }
        }

        closeSharePopover();
        importUpdateUrlInput.value = "";
        if (successCount === 0) {
            showToast("Không thể giải mã dữ liệu từ link!", 3000);
        } else if (successCount === 1) {
            showToast(mode === "new_tab" ? "Đã tạo Tab mới từ bản chia sẻ!" : "Đã cập nhật thành công vào Tab hiện tại!", 3500);
        } else {
            showToast(`Đã nhập thành công ${successCount} ghi chú thành các tab!`, 4000);
        }
    }

    if (btnApplyUpdateCurrent) {
        btnApplyUpdateCurrent.addEventListener("click", () => handleApplyUpdate("current"));
    }
    if (btnApplyUpdateNew) {
        btnApplyUpdateNew.addEventListener("click", () => handleApplyUpdate("new_tab"));
    }

    // Đóng popover khi click ra ngoài
    document.addEventListener("click", function(e) {
        if (sharePopover && !sharePopover.classList.contains("hidden")) {
            if (!sharePopover.contains(e.target) && !e.target.closest("#btn-export-url")) {
                closeSharePopover();
            }
        }
    });

    // ==========================================
    // TÍNH NĂNG BẢNG BIỂU (TABLE) PHONG CÁCH OFFICE
    // ==========================================

    function serializeTableToCleanHtml(tableEl) {
        const clone = tableEl.cloneNode(true);
        // Xóa các thanh kéo resizer và nút thao tác nhanh
        clone.querySelectorAll(".col-resizer, .tbl-btn-add-col, .tbl-btn-add-row").forEach(el => el.remove());
        clone.removeAttribute("contenteditable");
        clone.querySelectorAll("*").forEach(el => {
            el.removeAttribute("contenteditable");
            el.classList.remove("resizing");
        });
        // Loại bỏ thead và thuộc tính ead nếu có từ dữ liệu cũ
        clone.querySelectorAll("thead").forEach(th => {
            const tbody = clone.querySelector("tbody") || clone;
            while (th.firstChild) {
                tbody.insertBefore(th.firstChild, tbody.firstChild);
            }
            th.remove();
        });
        clone.querySelectorAll("th[ead]").forEach(th => th.removeAttribute("ead"));
        // Tự động chuẩn hóa link trong ô bảng: biến .note-link-wrap thành <a> sạch, loại bỏ button pencil
        clone.querySelectorAll(".note-link-wrap").forEach(wrap => {
            const url = wrap.dataset.url || "";
            const title = wrap.dataset.title || wrap.querySelector(".note-link")?.textContent?.trim() || url;
            const a = document.createElement("a");
            a.className = "note-link";
            a.href = url;
            a.textContent = title;
            wrap.replaceWith(a);
        });
        clone.querySelectorAll(".note-link-edit-btn, button, svg").forEach(el => el.remove());
        // Làm sạch các khối thẻ p, div bên trong ô cell td, th để tránh gãy vỡ layout table
        clone.querySelectorAll("td, th").forEach(cell => {
            cell.querySelectorAll("p, div").forEach(block => {
                while (block.firstChild) {
                    cell.insertBefore(block.firstChild, block);
                }
                block.remove();
            });
        });
        // Tự động chuẩn hóa và bảo vệ cấu trúc hàng: nếu tr có phần tử con không phải td hoặc th
        clone.querySelectorAll("tr").forEach(tr => {
            const children = Array.from(tr.childNodes);
            children.forEach(child => {
                if (child.nodeType === Node.TEXT_NODE) {
                    if (!child.textContent.trim()) {
                        child.remove();
                    } else {
                        const td = document.createElement("td");
                        td.textContent = child.textContent;
                        tr.insertBefore(td, child);
                        child.remove();
                    }
                } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "TD" && child.tagName !== "TH") {
                    const td = document.createElement("td");
                    tr.insertBefore(td, child);
                    if (child.tagName === "P" || child.tagName === "DIV") {
                        while (child.firstChild) {
                            td.appendChild(child.firstChild);
                        }
                        child.remove();
                    } else {
                        td.appendChild(child);
                    }
                }
            });
        });
        if (!clone.classList.contains("note-table")) {
            clone.classList.add("note-table");
        }
        return clone.outerHTML.replace(/\n\s*/g, " ").trim();
    }

    function createTableElement(rows, cols) {
        const wrapper = document.createElement("div");
        wrapper.className = "table-wrapper";
        wrapper.setAttribute("contenteditable", "false");

        const table = document.createElement("table");
        table.className = "note-table";

        // Tạo colgroup
        const colgroup = document.createElement("colgroup");
        const defaultWidth = Math.max(90, Math.min(180, Math.floor(480 / cols)));
        for (let c = 0; c < cols; c++) {
            const col = document.createElement("col");
            col.style.width = defaultWidth + "px";
            colgroup.appendChild(col);
        }
        table.appendChild(colgroup);

        // Tạo thead
        const thead = document.createElement("thead");
        const headTr = document.createElement("tr");
        for (let c = 0; c < cols; c++) {
            const th = document.createElement("th");
            th.setAttribute("contenteditable", "true");
            th.textContent = "Cột " + (c + 1);
            headTr.appendChild(th);
        }
        thead.appendChild(headTr);
        table.appendChild(thead);

        // Tạo tbody
        const tbody = document.createElement("tbody");
        for (let r = 0; r < rows; r++) {
            const tr = document.createElement("tr");
            for (let c = 0; c < cols; c++) {
                const td = document.createElement("td");
                td.setAttribute("contenteditable", "true");
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        wrapper.appendChild(table);

        return wrapper;
    }

    function insertTable(rows, cols) {
        const wrapper = createTableElement(rows, cols);

        // Vị trí chèn
        const sel = window.getSelection();
        let inserted = false;
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            if (editor.contains(range.commonAncestorContainer)) {
                let node = range.commonAncestorContainer;
                if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
                
                while (node && node.parentNode !== editor) {
                    node = node.parentNode;
                }

                if (node && node.parentNode === editor) {
                    if (node.tagName === "P" && (!node.textContent.trim() || node.innerHTML === "<br>")) {
                        editor.replaceChild(wrapper, node);
                    } else {
                        node.parentNode.insertBefore(wrapper, node.nextSibling);
                    }
                    inserted = true;
                }
            }
        }

        if (!inserted) {
            editor.appendChild(wrapper);
        }

        // Luôn tạo dòng văn bản dưới bảng để tiếp tục soạn thảo
        const afterP = document.createElement("p");
        afterP.innerHTML = "<br>";
        if (wrapper.nextSibling) {
            editor.insertBefore(afterP, wrapper.nextSibling);
        } else {
            editor.appendChild(afterP);
        }

        setupTableWrapper(wrapper);

        // Focus vào ô đầu tiên
        const firstTh = wrapper.querySelector("th");
        if (firstTh) {
            firstTh.focus();
        }

        triggerSave();
    }

    function appendColumn(table) {
        return insertColumn(table, undefined, true);
    }

    function insertColumn(table, colIndex, isRight) {
        const colgroup = table.querySelector("colgroup");
        const theadTr = table.querySelector("thead tr");
        const tbodyRows = table.querySelectorAll("tbody tr");

        const newCol = document.createElement("col");
        newCol.style.width = "120px";

        const newTh = document.createElement("th");
        newTh.setAttribute("contenteditable", "true");
        newTh.textContent = "Cột " + ((theadTr ? theadTr.children.length : 0) + 1);

        if (colIndex === undefined || colIndex < 0) {
            if (colgroup) colgroup.appendChild(newCol);
            if (theadTr) theadTr.appendChild(newTh);
            tbodyRows.forEach(tr => {
                const td = document.createElement("td");
                td.setAttribute("contenteditable", "true");
                tr.appendChild(td);
            });
        } else {
            const insertPos = isRight ? colIndex + 1 : colIndex;
            if (colgroup) {
                if (insertPos < colgroup.children.length) {
                    colgroup.insertBefore(newCol, colgroup.children[insertPos]);
                } else {
                    colgroup.appendChild(newCol);
                }
            }
            if (theadTr) {
                if (insertPos < theadTr.children.length) {
                    theadTr.insertBefore(newTh, theadTr.children[insertPos]);
                } else {
                    theadTr.appendChild(newTh);
                }
            }
            tbodyRows.forEach(tr => {
                const td = document.createElement("td");
                td.setAttribute("contenteditable", "true");
                if (insertPos < tr.children.length) {
                    tr.insertBefore(td, tr.children[insertPos]);
                } else {
                    tr.appendChild(td);
                }
            });
        }

        const wrapper = table.closest(".table-wrapper");
        if (wrapper) setupTableWrapper(wrapper);
        triggerSave();
        return newTh;
    }

    function appendRow(table) {
        return insertRow(table, undefined, true);
    }

    function insertRow(table, rowIndex, isBelow) {
        const tbody = table.querySelector("tbody");
        if (!tbody) return null;

        const numCols = table.querySelectorAll("thead th").length || (tbody.rows[0] ? tbody.rows[0].cells.length : 3);
        const tr = document.createElement("tr");
        for (let c = 0; c < numCols; c++) {
            const td = document.createElement("td");
            td.setAttribute("contenteditable", "true");
            tr.appendChild(td);
        }

        if (rowIndex === undefined || rowIndex < 0) {
            tbody.appendChild(tr);
        } else {
            const targetRow = table.rows[rowIndex];
            if (targetRow && targetRow.parentNode) {
                if (isBelow) {
                    targetRow.parentNode.insertBefore(tr, targetRow.nextSibling);
                } else {
                    targetRow.parentNode.insertBefore(tr, targetRow);
                }
            } else {
                tbody.appendChild(tr);
            }
        }

        const wrapper = table.closest(".table-wrapper");
        if (wrapper) setupTableWrapper(wrapper);
        triggerSave();
        return tr;
    }

    function deleteColumn(table, colIndex) {
        const colgroup = table.querySelector("colgroup");
        const theadTr = table.querySelector("thead tr");
        const tbodyRows = table.querySelectorAll("tbody tr");

        if (theadTr && theadTr.children.length <= 1) {
            showToast("Bảng cần ít nhất 1 cột!");
            return;
        }

        if (colgroup && colgroup.children[colIndex]) {
            colgroup.children[colIndex].remove();
        }
        if (theadTr && theadTr.children[colIndex]) {
            theadTr.children[colIndex].remove();
        }
        tbodyRows.forEach(tr => {
            if (tr.children[colIndex]) {
                tr.children[colIndex].remove();
            }
        });

        const wrapper = table.closest(".table-wrapper");
        if (wrapper) setupTableWrapper(wrapper);
        triggerSave();
    }

    function deleteRow(table, rowIndex) {
        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        if (tbody.rows.length <= 1) {
            showToast("Bảng cần ít nhất 1 hàng dữ liệu!");
            return;
        }

        const targetRow = table.rows[rowIndex];
        if (targetRow && targetRow.parentNode === tbody) {
            targetRow.remove();
            triggerSave();
        }
    }

    function deleteTable(table) {
        const wrapper = table.closest(".table-wrapper");
        if (wrapper) {
            wrapper.remove();
        } else {
            table.remove();
        }
        triggerSave();
    }

    function setupTableWrapper(wrapper) {
        const table = wrapper.querySelector("table.note-table");
        if (!table) return;

        // 1. Đảm bảo colgroup
        let colgroup = table.querySelector("colgroup");
        const headThs = table.querySelectorAll("thead th");
        if (!colgroup && headThs.length > 0) {
            colgroup = document.createElement("colgroup");
            headThs.forEach(() => {
                const col = document.createElement("col");
                col.style.width = "120px";
                colgroup.appendChild(col);
            });
            table.insertBefore(colgroup, table.firstChild);
        }

        // 2. Nút thêm cột nhanh (+)
        let btnAddCol = wrapper.querySelector(".tbl-btn-add-col");
        if (!btnAddCol) {
            btnAddCol = document.createElement("button");
            btnAddCol.type = "button";
            btnAddCol.className = "tbl-btn-add-col";
            btnAddCol.title = "Thêm cột mới";
            btnAddCol.textContent = "+";
            btnAddCol.setAttribute("contenteditable", "false");
            wrapper.appendChild(btnAddCol);
        }
        btnAddCol.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            appendColumn(table);
        };

        // 3. Nút thêm hàng nhanh (+)
        let btnAddRow = wrapper.querySelector(".tbl-btn-add-row");
        if (!btnAddRow) {
            btnAddRow = document.createElement("button");
            btnAddRow.type = "button";
            btnAddRow.className = "tbl-btn-add-row";
            btnAddRow.title = "Thêm hàng mới";
            btnAddRow.textContent = "+";
            btnAddRow.setAttribute("contenteditable", "false");
            wrapper.appendChild(btnAddRow);
        }
        btnAddRow.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            appendRow(table);
        };

        // 4. Cột Resizer trên từng <th>
        headThs.forEach((th) => {
            th.setAttribute("contenteditable", "true");
            let resizer = th.querySelector(".col-resizer");
            if (!resizer) {
                resizer = document.createElement("div");
                resizer.className = "col-resizer";
                resizer.setAttribute("contenteditable", "false");
                th.appendChild(resizer);
            }

            resizer.onpointerdown = function(e) {
                e.preventDefault();
                e.stopPropagation();
                const colIndex = th.cellIndex;
                const cols = table.querySelectorAll("colgroup col");
                const targetCol = cols[colIndex];
                if (!targetCol) return;

                const startX = e.clientX;
                const startWidth = th.getBoundingClientRect().width;
                resizer.setPointerCapture(e.pointerId);
                resizer.classList.add("resizing");

                function onPointerMove(moveEvent) {
                    const dx = moveEvent.clientX - startX;
                    const newWidth = Math.max(45, Math.round(startWidth + dx));
                    targetCol.style.width = newWidth + "px";
                }

                function onPointerUp(upEvent) {
                    resizer.classList.remove("resizing");
                    resizer.removeEventListener("pointermove", onPointerMove);
                    resizer.removeEventListener("pointerup", onPointerUp);
                    try { resizer.releasePointerCapture(e.pointerId); } catch (_) {}
                    triggerSave();
                }

                resizer.addEventListener("pointermove", onPointerMove);
                resizer.addEventListener("pointerup", onPointerUp);
            };
        });

        // 5. Thiết lập contenteditable cho các ô <td>
        table.querySelectorAll("tbody td").forEach(td => {
            td.setAttribute("contenteditable", "true");
        });

        // 6. Điều hướng phím Tab / Shift+Tab giữa các ô (Office style)
        table.onkeydown = function(e) {
            if (e.key === "Tab") {
                const activeCell = document.activeElement;
                if (!activeCell || (activeCell.tagName !== "TH" && activeCell.tagName !== "TD")) return;
                e.preventDefault();

                const allCells = Array.from(table.querySelectorAll("th, td"));
                const currentIndex = allCells.indexOf(activeCell);

                if (!e.shiftKey) {
                    if (currentIndex < allCells.length - 1) {
                        allCells[currentIndex + 1].focus();
                    } else {
                        // Đang ở ô cuối cùng -> Tự động thêm dòng mới và nhảy vào ô đầu
                        const newRow = appendRow(table);
                        if (newRow && newRow.cells && newRow.cells[0]) {
                            newRow.cells[0].focus();
                        }
                    }
                } else {
                    if (currentIndex > 0) {
                        allCells[currentIndex - 1].focus();
                    }
                }
            }
        };

        // 7. Chuột phải hiển thị Context Menu
        table.oncontextmenu = function(e) {
            const cell = e.target.closest("th, td");
            if (!cell) return;
            e.preventDefault();
            e.stopPropagation();
            contextMenuTargetCell = cell;

            const x = Math.min(window.innerWidth - 185, e.clientX);
            const y = Math.min(window.innerHeight - 260, e.clientY);
            tableContextMenu.style.left = x + "px";
            tableContextMenu.style.top = y + "px";
            tableContextMenu.classList.remove("hidden");
        };

        // 8. Tự động lưu khi sửa dữ liệu ô
        table.oninput = function() {
            triggerSave();
        };
    }

    function setupAllTables() {
        const wrappers = editor.querySelectorAll(".table-wrapper");
        wrappers.forEach(w => setupTableWrapper(w));

        const bareTables = editor.querySelectorAll("table.note-table");
        bareTables.forEach(t => {
            if (!t.closest(".table-wrapper")) {
                const wrapper = document.createElement("div");
                wrapper.className = "table-wrapper";
                wrapper.setAttribute("contenteditable", "false");
                t.parentNode.insertBefore(wrapper, t);
                wrapper.appendChild(t);
                setupTableWrapper(wrapper);
            }
        });
    }

    function initTableControls() {
        // Xây dựng 6x6 grid picker
        if (!tableGridPicker) return;
        tableGridPicker.innerHTML = "";
        for (let r = 1; r <= 6; r++) {
            for (let c = 1; c <= 6; c++) {
                const cell = document.createElement("div");
                cell.className = "grid-cell";
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener("mouseenter", () => highlightGrid(r, c));
                cell.addEventListener("click", (e) => {
                    e.stopPropagation();
                    insertTable(r, c);
                    tablePickerPopover.classList.add("hidden");
                });
                tableGridPicker.appendChild(cell);
            }
        }

        function highlightGrid(maxR, maxC) {
            tableGridLabel.textContent = `${maxC} x ${maxR} (${maxC} cột, ${maxR} hàng)`;
            const cells = tableGridPicker.querySelectorAll(".grid-cell");
            cells.forEach(cell => {
                const r = parseInt(cell.dataset.r);
                const c = parseInt(cell.dataset.c);
                if (r <= maxR && c <= maxC) {
                    cell.classList.add("active");
                } else {
                    cell.classList.remove("active");
                }
            });
        }

        const presetBtns = tablePickerPopover.querySelectorAll(".tbl-preset-btn");
        presetBtns.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const r = parseInt(btn.dataset.rows);
                const c = parseInt(btn.dataset.cols);
                insertTable(r, c);
                tablePickerPopover.classList.add("hidden");
            });
        });

        btnInsertTable.addEventListener("click", (e) => {
            e.stopPropagation();
            const isHidden = tablePickerPopover.classList.contains("hidden");
            if (isHidden) {
                highlightGrid(2, 2);
                const rect = btnInsertTable.getBoundingClientRect();
                tablePickerPopover.style.top = (rect.bottom + 6) + "px";
                tablePickerPopover.style.right = Math.max(8, window.innerWidth - rect.right) + "px";
                tablePickerPopover.classList.remove("hidden");
            } else {
                tablePickerPopover.classList.add("hidden");
            }
        });

        // Xử lý các thao tác trong Context Menu
        tableContextMenu.addEventListener("click", (e) => {
            const item = e.target.closest(".table-menu-item");
            if (!item || !contextMenuTargetCell) return;
            e.stopPropagation();

            const action = item.dataset.action;
            const cell = contextMenuTargetCell;
            const table = cell.closest("table");
            if (!table) return;

            const colIndex = cell.cellIndex;
            const tr = cell.closest("tr");
            const rowIndex = tr ? tr.rowIndex : -1;

            if (action === "insert-row-above") {
                insertRow(table, rowIndex, false);
            } else if (action === "insert-row-below") {
                insertRow(table, rowIndex, true);
            } else if (action === "insert-col-left") {
                insertColumn(table, colIndex, false);
            } else if (action === "insert-col-right") {
                insertColumn(table, colIndex, true);
            } else if (action === "delete-row") {
                deleteRow(table, rowIndex);
            } else if (action === "delete-col") {
                deleteColumn(table, colIndex);
            } else if (action === "delete-table") {
                deleteTable(table);
            }

            tableContextMenu.classList.add("hidden");
            contextMenuTargetCell = null;
        });

        // Đóng popover và context menu khi click ra ngoài
        document.addEventListener("click", (e) => {
            if (tablePickerPopover && !tablePickerPopover.contains(e.target) && e.target !== btnInsertTable) {
                tablePickerPopover.classList.add("hidden");
            }
            if (tableContextMenu && !tableContextMenu.contains(e.target)) {
                tableContextMenu.classList.add("hidden");
                contextMenuTargetCell = null;
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (tablePickerPopover) tablePickerPopover.classList.add("hidden");
                if (tableContextMenu) tableContextMenu.classList.add("hidden");
                contextMenuTargetCell = null;
            }
        });
    }

    // ==========================================
    // MINIMAL LINK (> [hiển thị]<link url> hoặc >https://...)
    // ==========================================
    let currentEditingCard = null;
    const linkEditPopover = document.getElementById("link-edit-popover");
    const linkInputTitle = document.getElementById("link-input-title");
    const linkInputUrl = document.getElementById("link-input-url");
    const btnSaveLink = document.getElementById("btn-save-link");
    const btnCancelLink = document.getElementById("btn-cancel-link");
    const btnDeleteLink = document.getElementById("btn-delete-link");

    function createLinkElement(title, url) {
        title = (title || "").trim();
        url = (url || "").trim();
        if (!title) title = url;

        const wrap = document.createElement("span");
        wrap.className = "note-link-wrap";
        wrap.setAttribute("contenteditable", "false");
        wrap.dataset.title = title;
        wrap.dataset.url = url;

        const a = document.createElement("a");
        a.className = "note-link";
        a.textContent = title;
        a.title = "Nhấp để mở: " + url;

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "note-link-edit-btn";
        editBtn.title = "Chỉnh sửa liên kết";

        const editSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        editSvg.setAttribute("class", "lucide-pencil");
        editSvg.setAttribute("width", "12");
        editSvg.setAttribute("height", "12");
        editSvg.setAttribute("viewBox", "0 0 24 24");
        editSvg.setAttribute("fill", "none");
        editSvg.setAttribute("stroke", "currentColor");
        editSvg.setAttribute("stroke-width", "2");
        editSvg.setAttribute("stroke-linecap", "round");
        editSvg.setAttribute("stroke-linejoin", "round");
        editSvg.innerHTML = '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path>';
        editBtn.appendChild(editSvg);

        wrap.appendChild(a);
        wrap.appendChild(editBtn);

        bindLinkEvents(wrap);
        return wrap;
    }

    function bindLinkEvents(wrap) {
        if (!wrap) return;

        let editBtn = wrap.querySelector(".note-link-edit-btn");
        if (!editBtn) {
            editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "note-link-edit-btn";
            editBtn.title = "Chỉnh sửa liên kết";
            const editSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            editSvg.setAttribute("class", "lucide-pencil");
            editSvg.setAttribute("width", "12");
            editSvg.setAttribute("height", "12");
            editSvg.setAttribute("viewBox", "0 0 24 24");
            editSvg.setAttribute("fill", "none");
            editSvg.setAttribute("stroke", "currentColor");
            editSvg.setAttribute("stroke-width", "2");
            editSvg.setAttribute("stroke-linecap", "round");
            editSvg.setAttribute("stroke-linejoin", "round");
            editSvg.innerHTML = '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path>';
            editBtn.appendChild(editSvg);
            wrap.appendChild(editBtn);
        }

        if (wrap._boundEvents) return;
        wrap._boundEvents = true;

        const a = wrap.querySelector(".note-link");
        if (a) {
            a.addEventListener("click", function(e) {
                e.stopPropagation();
                e.preventDefault();
                const url = wrap.dataset.url;
                if (url) {
                    sendIPC("open_url", { url });
                }
            });
        }

        editBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            e.preventDefault();
            openLinkEditPopover(wrap);
        });
    }

    function setupAllLinks() {
        // Tự động nâng cấp các link thuần trong bảng hoặc nội dung thành note-link-wrap có nút cây bút
        const plainLinks = editor.querySelectorAll("a.note-link");
        plainLinks.forEach(a => {
            if (!a.closest(".note-link-wrap") && !a.closest(".link-card")) {
                const url = a.getAttribute("href") || a.textContent.trim();
                const title = a.textContent.trim() || url;
                const wrap = createLinkElement(title, url);
                a.replaceWith(wrap);
            }
        });
        const wraps = editor.querySelectorAll(".note-link-wrap, .link-card");
        wraps.forEach(bindLinkEvents);
    }

    function openLinkEditPopover(wrap) {
        currentEditingCard = wrap;
        linkInputTitle.value = wrap.dataset.title || "";
        linkInputUrl.value = wrap.dataset.url || "";
        linkEditPopover.classList.remove("hidden");

        const rect = wrap.getBoundingClientRect();
        const top = Math.min(rect.bottom + 6, window.innerHeight - 170);
        const left = Math.min(Math.max(rect.left, 10), Math.max(10, window.innerWidth - 310));
        linkEditPopover.style.top = `${top}px`;
        linkEditPopover.style.left = `${left}px`;

        linkInputTitle.focus();
        linkInputTitle.select();
    }

    function closeLinkEditPopover() {
        if (linkEditPopover) linkEditPopover.classList.add("hidden");
        currentEditingCard = null;
    }

    function saveCurrentLink() {
        if (!currentEditingCard) return;
        const newTitle = linkInputTitle.value.trim();
        let newUrl = linkInputUrl.value.trim();
        if (!newUrl) {
            showToast("Vui lòng nhập đường dẫn URL!", 2000);
            return;
        }
        if (!/^https?:\/\//i.test(newUrl) && !/^mailto:/i.test(newUrl) && !/^tel:/i.test(newUrl)) {
            newUrl = "https://" + newUrl;
        }
        const displayTitle = newTitle || newUrl;

        currentEditingCard.dataset.title = displayTitle;
        currentEditingCard.dataset.url = newUrl;

        const a = currentEditingCard.querySelector(".note-link");
        if (a) {
            a.textContent = displayTitle;
            a.title = "Nhấp để mở: " + newUrl;
        }

        closeLinkEditPopover();
        triggerSave();
    }

    function initLinkControls() {
        if (btnSaveLink) {
            btnSaveLink.addEventListener("click", (e) => {
                e.stopPropagation();
                saveCurrentLink();
            });
        }
        if (btnCancelLink) {
            btnCancelLink.addEventListener("click", (e) => {
                e.stopPropagation();
                closeLinkEditPopover();
            });
        }
        if (btnDeleteLink) {
            btnDeleteLink.addEventListener("click", (e) => {
                e.stopPropagation();
                if (currentEditingCard) {
                    currentEditingCard.remove();
                    closeLinkEditPopover();
                    triggerSave();
                }
            });
        }
        [linkInputTitle, linkInputUrl].forEach(input => {
            input?.addEventListener("keydown", function(e) {
                if (e.key === "Enter") {
                    e.preventDefault();
                    saveCurrentLink();
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    closeLinkEditPopover();
                }
            });
        });

        document.addEventListener("click", function(e) {
            if (linkEditPopover && !linkEditPopover.classList.contains("hidden")) {
                if (!linkEditPopover.contains(e.target) && !e.target.closest(".note-link-edit-btn")) {
                    closeLinkEditPopover();
                }
            }
        });

        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
                if (linkEditPopover && !linkEditPopover.classList.contains("hidden")) {
                    closeLinkEditPopover();
                }
            }
        });
    }

    // ==========================================
    // MINI-NOTION UX: FLOATING BUBBLE TOOLBAR
    // ==========================================
    function initBubbleToolbar() {
        const bubbleToolbar = document.getElementById("bubble-toolbar");
        if (!bubbleToolbar) return;

        hideBubbleToolbar = function() {
            bubbleToolbar.classList.add("hidden");
        };

        function updateBubblePosition() {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
                hideBubbleToolbar();
                return;
            }

            const range = sel.getRangeAt(0);
            if (!editor.contains(range.commonAncestorContainer)) {
                hideBubbleToolbar();
                return;
            }

            const text = sel.toString().trim();
            if (!text) {
                hideBubbleToolbar();
                return;
            }

            const rect = range.getBoundingClientRect();
            const tbWidth = 270;
            const tbHeight = 36;
            const margin = 8;

            let top = rect.top - tbHeight - margin;
            let left = rect.left + (rect.width / 2) - (tbWidth / 2);

            if (top < 45) {
                top = rect.bottom + margin;
            }
            if (left < 10) left = 10;
            if (left + tbWidth > window.innerWidth - 10) {
                left = window.innerWidth - tbWidth - 10;
            }

            bubbleToolbar.style.top = `${top}px`;
            bubbleToolbar.style.left = `${left}px`;
            bubbleToolbar.classList.remove("hidden");
        }

        document.addEventListener("selectionchange", () => {
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) {
                hideBubbleToolbar();
            }
        });

        editor.addEventListener("mouseup", () => {
            setTimeout(updateBubblePosition, 50);
        });

        bubbleToolbar.addEventListener("mousedown", (e) => {
            e.preventDefault();
        });

        bubbleToolbar.querySelectorAll(".bubble-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cmd = btn.dataset.command;

                if (cmd === "bold") {
                    document.execCommand("bold");
                    triggerSave();
                } else if (cmd === "italic") {
                    document.execCommand("italic");
                    triggerSave();
                } else if (cmd === "strike") {
                    document.execCommand("strikeThrough");
                    triggerSave();
                } else if (cmd === "todo") {
                    const sel = window.getSelection();
                    const text = sel ? sel.toString().trim() : "";
                    insertTodoAtCaret(text);
                    triggerSave();
                    hideBubbleToolbar();
                } else if (cmd === "bullet") {
                    const sel = window.getSelection();
                    const text = sel ? sel.toString().trim() : "";
                    const bulletHtml = `<ul><li>${escapeHtml(text) || "<br>"}</li></ul>`;
                    document.execCommand("insertHTML", false, bulletHtml);
                    triggerSave();
                    hideBubbleToolbar();
                } else if (cmd === "link") {
                    const sel = window.getSelection();
                    const text = sel ? sel.toString().trim() : "";
                    if (text.startsWith("http://") || text.startsWith("https://")) {
                        const linkEl = createLinkElement(text, text);
                        insertNodeAtCaret(linkEl);
                    } else {
                        // Mở popup link-edit-popover mượt mà, không dùng prompt() gây đơ
                        if (linkEditPopover && linkInputTitle && linkInputUrl) {
                            linkInputTitle.value = text;
                            linkInputUrl.value = "https://";
                            const rect = btn.getBoundingClientRect();
                            linkEditPopover.style.top = `${rect.bottom + 8}px`;
                            linkEditPopover.style.left = `${Math.max(10, rect.left - 80)}px`;
                            linkEditPopover.classList.remove("hidden");
                            currentEditingCard = null;
                            setTimeout(() => linkInputUrl.focus(), 50);
                        }
                    }
                    hideBubbleToolbar();
                    triggerSave();
                } else if (cmd === "ai") {
                    const sel = window.getSelection();
                    const text = sel ? sel.toString().trim() : "";
                    hideBubbleToolbar();
                    if (typeof toggleAIPromptBar === "function") {
                        toggleAIPromptBar(text);
                    }
                }
            });
        });
    }

    // ==========================================
    // MINI-NOTION UX: SLASH COMMAND MENU (/)
    // ==========================================
    function initSlashMenu() {
        const slashMenu = document.getElementById("slash-menu");
        const slashList = document.getElementById("slash-list");
        if (!slashMenu || !slashList) return;

        let isSlashOpen = false;
        let slashQuery = "";

        const allItems = [
            { id: "text", title: "Văn bản thường", desc: "Đoạn văn bản bình thường", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-type"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>`, keywords: ["text", "p"] },
            { id: "todo", title: "Việc cần làm", desc: "Ô To-Do checkbox hoàn thành", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-square"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>`, keywords: ["todo", "task", "check"] },
            { id: "bullet", title: "Gạch đầu dòng", desc: "Danh sách chấm tròn", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>`, keywords: ["bullet", "ul", "list"] },
            { id: "number", title: "Danh sách số", desc: "Danh sách 1, 2, 3 tăng dần", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-ordered"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`, keywords: ["number", "ol"] },
            { id: "h1", title: "Tiêu đề lớn", desc: "Tiêu đề chính cấp 1", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heading-1"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`, keywords: ["h1", "heading"] },
            { id: "h2", title: "Tiêu đề vừa", desc: "Tiêu đề phân mục cấp 2", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heading-2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`, keywords: ["h2", "heading"] },
            { id: "table", title: "Bảng biểu", desc: "Chèn bảng dữ liệu", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-table"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>`, keywords: ["table", "bang", "grid"] },
            { id: "quote", title: "Trích dẫn", desc: "Khối trích dẫn viền đứng", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>`, keywords: ["quote"] },
            { id: "callout", title: "Hộp nổi bật", desc: "Khối ghi chú viền màu nổi bật", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`, keywords: ["callout", "box"] },
            { id: "divider", title: "Đường phân cách", desc: "Vạch ngang chia phần", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus"><line x1="5" x2="19" y1="12" y2="12"/></svg>`, keywords: ["divider", "hr", "line"] },
            { id: "ai", title: "Trí tuệ nhân tạo (AI)", desc: "Nhờ AI viết tiếp, tóm tắt...", icon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`, keywords: ["ai", "ask", "prompt"] }
        ];

        closeSlashMenu = function() {
            slashMenu.classList.add("hidden");
            isSlashOpen = false;
            slashQuery = "";
        };

        function renderSlashItems(items) {
            slashList.innerHTML = "";
            if (items.length === 0) {
                slashList.innerHTML = `<div class="slash-item" style="color:var(--text-muted); cursor:default; padding: 8px;">Không tìm thấy lệnh</div>`;
                return;
            }
            items.forEach((it, idx) => {
                const el = document.createElement("div");
                el.className = `slash-item ${idx === 0 ? "active" : ""} ${it.id === "ai" ? "slash-ai-item" : ""}`;
                el.dataset.command = it.id;
                el.innerHTML = `
                    <span class="slash-icon">${it.icon}</span>
                    <div class="slash-info">
                        <span class="slash-title">${it.title}</span>
                        <span class="slash-desc">${it.desc}</span>
                    </div>
                `;
                el.addEventListener("click", () => {
                    executeSlashCommand(it.id);
                });
                slashList.appendChild(el);
            });
        }

        function filterSlashItems(query) {
            if (!query) return allItems;
            const q = query.toLowerCase().trim();
            return allItems.filter(it => 
                it.id.toLowerCase().includes(q) ||
                it.title.toLowerCase().includes(q) ||
                it.keywords.some(k => k.toLowerCase().includes(q))
            );
        }

        function openSlashMenuAtCaret() {
            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return;
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            let top = rect.bottom + 6;
            let left = rect.left;
            if (top + 280 > window.innerHeight) {
                top = Math.max(10, rect.top - 280 - 6);
            }
            if (left + 230 > window.innerWidth - 10) {
                left = window.innerWidth - 240;
            }

            slashMenu.style.top = `${top}px`;
            slashMenu.style.left = `${left}px`;
            renderSlashItems(allItems);
            slashMenu.classList.remove("hidden");
            isSlashOpen = true;
            slashQuery = "";
        }

        function executeSlashCommand(cmd) {
            closeSlashMenu();

            // Xóa dấu / và query đã gõ trên dòng hiện tại bằng Range để không mất vị trí caret
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                const node = sel.anchorNode;
                if (node && node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    const slashIdx = text.lastIndexOf("/");
                    if (slashIdx !== -1) {
                        try {
                            const range = document.createRange();
                            range.setStart(node, slashIdx);
                            range.setEnd(node, sel.anchorOffset);
                            range.deleteContents();
                            sel.removeAllRanges();
                            sel.addRange(range);
                        } catch (err) {
                            node.textContent = text.substring(0, slashIdx);
                        }
                    }
                }
            }

            editor.focus();

            if (cmd === "text") {
                document.execCommand("formatBlock", false, "p");
            } else if (cmd === "todo") {
                insertTodoAtCaret("");
            } else if (cmd === "bullet") {
                const bulletHtml = `<ul><li><br></li></ul>`;
                document.execCommand("insertHTML", false, bulletHtml);
            } else if (cmd === "number") {
                const numHtml = `<ol><li><br></li></ol>`;
                document.execCommand("insertHTML", false, numHtml);
            } else if (cmd === "h1") {
                document.execCommand("formatBlock", false, "h1");
            } else if (cmd === "h2") {
                document.execCommand("formatBlock", false, "h2");
            } else if (cmd === "table") {
                insertTable(3, 3);
            } else if (cmd === "quote") {
                document.execCommand("formatBlock", false, "blockquote");
            } else if (cmd === "callout") {
                const calloutHtml = `<blockquote style="border-left: 3px solid #f59e0b; background: rgba(245, 158, 11, 0.08); padding: 6px 12px; border-radius: 4px; font-style: normal; margin: 6px 0;">Ghi chú nổi bật...</blockquote><p><br></p>`;
                document.execCommand("insertHTML", false, calloutHtml);
            } else if (cmd === "divider") {
                document.execCommand("insertHorizontalRule");
                document.execCommand("insertHTML", false, "<p><br></p>");
            } else if (cmd === "ai") {
                if (typeof toggleAIPromptBar === "function") {
                    toggleAIPromptBar();
                }
            }
            triggerSave();
        }

        editor.addEventListener("keydown", (e) => {
            if (isSlashOpen) {
                const activeItem = slashList.querySelector(".slash-item.active");
                const items = Array.from(slashList.querySelectorAll(".slash-item:not([style*='cursor:default'])"));
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (items.length > 0) {
                        let nextIdx = (items.indexOf(activeItem) + 1) % items.length;
                        items.forEach(el => el.classList.remove("active"));
                        items[nextIdx]?.classList.add("active");
                        items[nextIdx]?.scrollIntoView({ block: "nearest" });
                    }
                    return;
                }
                if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (items.length > 0) {
                        let prevIdx = (items.indexOf(activeItem) - 1 + items.length) % items.length;
                        items.forEach(el => el.classList.remove("active"));
                        items[prevIdx]?.classList.add("active");
                        items[prevIdx]?.scrollIntoView({ block: "nearest" });
                    }
                    return;
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    if (activeItem && activeItem.dataset.command) {
                        executeSlashCommand(activeItem.dataset.command);
                    }
                    return;
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    closeSlashMenu();
                    return;
                }
                if (e.key === "Backspace") {
                    if (slashQuery.length > 0) {
                        slashQuery = slashQuery.slice(0, -1);
                        renderSlashItems(filterSlashItems(slashQuery));
                    } else {
                        closeSlashMenu();
                    }
                    return;
                }
            }

            if (e.key === "/" && !e.ctrlKey && !e.metaKey && !isSlashOpen) {
                const sel = window.getSelection();
                if (sel && sel.isCollapsed) {
                    const node = sel.anchorNode;
                    const offset = sel.anchorOffset;
                    const isAtStart = (offset === 0) || (node && node.textContent && (node.textContent.trim() === "" || node.textContent[offset - 1] === " "));
                    if (isAtStart) {
                        setTimeout(openSlashMenuAtCaret, 20);
                    }
                }
            }
        });

        editor.addEventListener("input", (e) => {
            if (isSlashOpen) {
                const sel = window.getSelection();
                if (sel && sel.anchorNode && sel.anchorNode.nodeType === Node.TEXT_NODE) {
                    const txt = sel.anchorNode.textContent;
                    const sIdx = txt.lastIndexOf("/");
                    if (sIdx !== -1) {
                        slashQuery = txt.substring(sIdx + 1, sel.anchorOffset).trim();
                        renderSlashItems(filterSlashItems(slashQuery));
                    } else {
                        closeSlashMenu();
                    }
                }
            }
        });

        document.addEventListener("click", (e) => {
            if (isSlashOpen && !slashMenu.contains(e.target)) {
                closeSlashMenu();
            }
        });
    }

    // ==========================================
    // MINI-NOTION UX: BLOCK HANDLES & CONTEXT MENU
    // ==========================================
    // NOTION-STYLE BLOCK INTERACTION ENGINE
    // Pointer Events, Closest-Edge Detection, Multi-Column & Gutter
    // ==========================================
    function initBlockHandles() {
        const gutter = document.getElementById("block-gutter-controls") || document.getElementById("block-drag-handle");
        const addBtn = document.getElementById("block-add-btn");
        const handle = document.getElementById("block-drag-handle");
        const popover = document.getElementById("block-menu-popover");
        const editorContainer = document.getElementById("editor-container");
        if (!editorContainer) return;

        let currentHoverBlock = null;
        let isDragging = false;
        let draggedBlock = null;
        let dropTarget = null;
        let dropEdge = "bottom"; // "top" | "bottom" | "left" | "right"
        let ghostEl = null;

        const dropLine = document.createElement("div");
        dropLine.className = "block-drop-line hidden";
        editorContainer.appendChild(dropLine);

        const dropLineV = document.createElement("div");
        dropLineV.className = "block-drop-line-v hidden";
        editorContainer.appendChild(dropLineV);

        function clearDrag() {
            isDragging = false;
            if (draggedBlock) draggedBlock.classList.remove("block-dragging");
            draggedBlock = null;
            dropTarget = null;
            if (ghostEl) { ghostEl.remove(); ghostEl = null; }
            dropLine.classList.add("hidden");
            dropLineV.classList.add("hidden");
        }

        // Helper: get top block element
        function getTopBlock(el) {
            if (!el || el === editor) return null;
            return el.closest("#editor > *, .block-column > *");
        }

        // Quick Add Button [+]
        if (addBtn) {
            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (!currentHoverBlock) return;
                const newP = document.createElement("p");
                newP.innerHTML = "<br>";
                currentHoverBlock.after(newP);

                // Focus caret into new block
                const range = document.createRange();
                const sel = window.getSelection();
                range.setStart(newP, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);

                if (gutter) gutter.classList.add("hidden");
                triggerSave();
            });
        }

        // Pointer-Driven Dragging on [⋮⋮]
        if (handle) {
            let startX = 0, startY = 0;
            let pointerDown = false;

            handle.addEventListener("pointerdown", (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                pointerDown = true;
                startX = e.clientX;
                startY = e.clientY;
                handle.setPointerCapture(e.pointerId);
            });

            handle.addEventListener("pointermove", (e) => {
                if (!pointerDown) return;
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;

                if (!isDragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
                    if (!currentHoverBlock) return;
                    isDragging = true;
                    draggedBlock = currentHoverBlock;
                    if (popover) popover.classList.add("hidden");
                    draggedBlock.classList.add("block-dragging");

                    // Floating ghost preview
                    ghostEl = draggedBlock.cloneNode(true);
                    ghostEl.style.cssText = `position:fixed; pointer-events:none; z-index:999999; opacity:0.85; max-width:380px; max-height:70px; overflow:hidden; border-radius:6px; box-shadow:0 8px 24px rgba(0,0,0,0.6); background:#18181b; border:1px solid #38bdf8; padding:6px 10px; transform:translate(${e.clientX + 14}px, ${e.clientY + 14}px);`;
                    document.body.appendChild(ghostEl);
                }

                if (isDragging && ghostEl) {
                    ghostEl.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 14}px)`;

                    // Probe drop target beneath ghost
                    ghostEl.style.display = "none";
                    const probed = document.elementFromPoint(e.clientX, e.clientY);
                    ghostEl.style.display = "";

                    const target = getTopBlock(probed);
                    if (!target || target === draggedBlock || target.contains(draggedBlock)) {
                        dropTarget = null;
                        dropLine.classList.add("hidden");
                        dropLineV.classList.add("hidden");
                        return;
                    }

                    dropTarget = target;
                    const rect = target.getBoundingClientRect();
                    const containerRect = editorContainer.getBoundingClientRect();

                    // Edge detection: 22% lateral threshold for creating columns
                    const lateralWidth = Math.min(65, rect.width * 0.22);
                    if (e.clientX < rect.left + lateralWidth) {
                        dropEdge = "left";
                    } else if (e.clientX > rect.right - lateralWidth) {
                        dropEdge = "right";
                    } else if (e.clientY < rect.top + rect.height / 2) {
                        dropEdge = "top";
                    } else {
                        dropEdge = "bottom";
                    }

                    if (dropEdge === "top" || dropEdge === "bottom") {
                        dropLineV.classList.add("hidden");
                        const y = (dropEdge === "bottom" ? rect.bottom : rect.top) - containerRect.top + editorContainer.scrollTop;
                        dropLine.style.top = `${y}px`;
                        dropLine.style.left = `${rect.left - containerRect.left + editorContainer.scrollLeft}px`;
                        dropLine.style.width = `${rect.width}px`;
                        dropLine.classList.remove("hidden");
                    } else {
                        dropLine.classList.add("hidden");
                        const x = (dropEdge === "left" ? rect.left : rect.right) - containerRect.left + editorContainer.scrollLeft;
                        dropLineV.style.left = `${x}px`;
                        dropLineV.style.top = `${rect.top - containerRect.top + editorContainer.scrollTop}px`;
                        dropLineV.style.height = `${rect.height}px`;
                        dropLineV.classList.remove("hidden");
                    }
                }
            });

            handle.addEventListener("pointerup", (e) => {
                if (!pointerDown) return;
                pointerDown = false;
                try { handle.releasePointerCapture(e.pointerId); } catch (_) {}

                if (isDragging) {
                    if (dropTarget && draggedBlock && dropTarget !== draggedBlock) {
                        if (dropEdge === "top") {
                            dropTarget.parentNode.insertBefore(draggedBlock, dropTarget);
                        } else if (dropEdge === "bottom") {
                            dropTarget.parentNode.insertBefore(draggedBlock, dropTarget.nextSibling);
                        } else if (dropEdge === "left" || dropEdge === "right") {
                            // Multi-column grouping
                            const inCol = dropTarget.closest(".block-column");
                            if (inCol && inCol.parentElement?.classList.contains("block-columns")) {
                                const newCol = document.createElement("div");
                                newCol.className = "block-column";
                                newCol.appendChild(draggedBlock);
                                if (dropEdge === "left") {
                                    inCol.parentElement.insertBefore(newCol, inCol);
                                } else {
                                    inCol.parentElement.insertBefore(newCol, inCol.nextSibling);
                                }
                            } else {
                                const cols = document.createElement("div");
                                cols.className = "block-columns";
                                const col1 = document.createElement("div");
                                col1.className = "block-column";
                                const col2 = document.createElement("div");
                                col2.className = "block-column";
                                dropTarget.replaceWith(cols);
                                if (dropEdge === "left") {
                                    col1.appendChild(draggedBlock);
                                    col2.appendChild(dropTarget);
                                } else {
                                    col1.appendChild(dropTarget);
                                    col2.appendChild(draggedBlock);
                                }
                                cols.appendChild(col1);
                                cols.appendChild(col2);
                            }
                        }

                        // Clean up any empty columns/containers
                        document.querySelectorAll(".block-columns").forEach(c => {
                            const cols = c.querySelectorAll(".block-column");
                            if (cols.length === 0) c.remove();
                        });

                        setupCheckboxListeners();
                        triggerSave();
                    }
                    clearDrag();
                } else {
                    // Quick click: toggle context popover
                    if (popover && currentHoverBlock) {
                        popover.__targetBlock = currentHoverBlock;
                        const rect = handle.getBoundingClientRect();
                        popover.style.top = `${rect.bottom + 4}px`;
                        popover.style.left = `${rect.left}px`;
                        popover.classList.toggle("hidden");
                    }
                }
            });

            handle.addEventListener("pointercancel", clearDrag);
        }

        // Proximity Gutter Tracking on mousemove
        editorContainer.addEventListener("mousemove", (e) => {
            if (isDragging) return;
            if (popover && !popover.classList.contains("hidden")) return;
            if (gutter && (e.target === gutter || gutter.contains(e.target))) return;

            let target = getTopBlock(e.target);
            // Left gutter proximity (< 55px)
            if (!target && e.clientX < 55) {
                const probed = document.elementFromPoint(75, e.clientY);
                target = getTopBlock(probed);
            }

            if (target && target !== editor) {
                currentHoverBlock = target;
                if (popover) popover.__targetBlock = target;
                const rect = target.getBoundingClientRect();
                const containerRect = editorContainer.getBoundingClientRect();
                if (gutter) {
                    const topPos = rect.top - containerRect.top + editorContainer.scrollTop + 2;
                    const leftPos = Math.max(2, rect.left - containerRect.left + editorContainer.scrollLeft - 44);
                    gutter.style.top = `${topPos}px`;
                    gutter.style.left = `${leftPos}px`;
                    gutter.classList.remove("hidden");
                }
            }
        });

        editorContainer.addEventListener("mouseleave", () => {
            if (!isDragging && popover && popover.classList.contains("hidden")) {
                if (gutter) gutter.classList.add("hidden");
            }
        });

        // Popover Block Transformations
        if (popover) {
            popover.querySelectorAll(".block-menu-item").forEach(item => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const targetBlock = popover.__targetBlock || currentHoverBlock;
                    if (!targetBlock) return;
                    const action = item.dataset.action;
                    const text = targetBlock.innerText || "";

                    if (action === "delete") {
                        targetBlock.remove();
                        triggerSave();
                    } else if (action === "duplicate") {
                        const clone = targetBlock.cloneNode(true);
                        targetBlock.after(clone);
                        setupCheckboxListeners();
                        triggerSave();
                    } else if (action === "turn-todo") {
                        const { div: newEl } = createTodoElement(text);
                        targetBlock.replaceWith(newEl);
                        setupCheckboxListeners();
                        triggerSave();
                    } else if (action === "turn-bullet") {
                        const ul = document.createElement("ul");
                        ul.innerHTML = `<li>${escapeHtml(text) || "<br>"}</li>`;
                        targetBlock.replaceWith(ul);
                        triggerSave();
                    } else if (action === "turn-h1") {
                        const h1 = document.createElement("h1");
                        h1.innerHTML = escapeHtml(text) || "<br>";
                        targetBlock.replaceWith(h1);
                        triggerSave();
                    } else if (action === "turn-callout") {
                        const callout = document.createElement("div");
                        callout.className = "block-callout";
                        callout.style.cssText = "background:rgba(56,189,248,0.08); border-left:3px solid #38bdf8; border-radius:6px; padding:10px 14px; margin:8px 0; font-size:14px; color:#e2e8f0; display:flex; align-items:center; gap:8px;";
                        callout.innerHTML = `<span>💡</span><span class="callout-text">${escapeHtml(text) || "Ghi chú lưu ý..."}</span>`;
                        targetBlock.replaceWith(callout);
                        triggerSave();
                    } else if (action === "turn-quote") {
                        const bq = document.createElement("blockquote");
                        bq.innerHTML = escapeHtml(text) || "<br>";
                        targetBlock.replaceWith(bq);
                        triggerSave();
                    } else if (action === "turn-text") {
                        const p = document.createElement("p");
                        p.innerHTML = escapeHtml(text) || "<br>";
                        targetBlock.replaceWith(p);
                        triggerSave();
                    }
                    popover.classList.add("hidden");
                    popover.__targetBlock = null;
                    if (gutter) gutter.classList.add("hidden");
                });
            });

            document.addEventListener("click", (e) => {
                if (!popover.contains(e.target) && (!gutter || !gutter.contains(e.target))) {
                    popover.classList.add("hidden");
                }
            });

            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && !popover.classList.contains("hidden")) {
                    popover.classList.add("hidden");
                }
            });
        }
    }

    // ==========================================
    // MINI-NOTION AI: LOCAL (OLLAMA) & CLOUD AI
    // ==========================================
    function initAIIntegration() {
        const aiPromptBar = document.getElementById("ai-prompt-bar");
        const aiPromptInput = document.getElementById("ai-prompt-input");
        const btnRunAi = document.getElementById("btn-run-ai");
        const btnCloseAiBar = document.getElementById("btn-close-ai-bar");
        const aiStatusRow = document.getElementById("ai-status-row");
        const aiStatusText = document.getElementById("ai-status-text");
        const aiProviderBadge = document.getElementById("ai-provider-badge");
        if (!aiPromptBar) return;

        let activeContextText = "";
        let savedAIRange = null;

        toggleAIPromptBar = function(context = "") {
            activeContextText = context || "";
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
                savedAIRange = sel.getRangeAt(0).cloneRange();
            } else {
                savedAIRange = null;
            }

            const cfg = getAIConfig();
            if (aiProviderBadge) {
                if (cfg.provider === "local") {
                    aiProviderBadge.textContent = `Local AI (${cfg.localModel})`;
                } else if (cfg.provider === "cloud") {
                    aiProviderBadge.textContent = `Cloud AI (${cfg.cloudModel})`;
                } else {
                    aiProviderBadge.textContent = `AI (Đang tắt)`;
                }
            }
            if (aiPromptBar.classList.contains("hidden")) {
                aiPromptBar.classList.remove("hidden");
                aiPromptInput?.focus();
            } else {
                closeAIPromptBar();
            }
        };

        closeAIPromptBar = function() {
            aiPromptBar.classList.add("hidden");
            if (aiStatusRow) aiStatusRow.classList.add("hidden");
            if (aiPromptInput) aiPromptInput.value = "";
            activeContextText = "";
            savedAIRange = null;
        };

        btnCloseAiBar?.addEventListener("click", closeAIPromptBar);

        // Preset Chips
        aiPromptBar.querySelectorAll(".ai-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const preset = chip.dataset.preset;
                let prompt = "";
                if (preset === "continue") {
                    prompt = "Hãy viết tiếp đoạn văn bản này một cách tự nhiên, mạch lạc:";
                } else if (preset === "summarize") {
                    prompt = "Hãy tóm tắt ngắn gọn các ý chính trong 3-5 gạch đầu dòng:";
                } else if (preset === "fix") {
                    prompt = "Hãy sửa các lỗi chính tả, ngữ pháp và trau chuốt câu từ mượt mà hơn:";
                } else if (preset === "translate") {
                    prompt = "Hãy dịch đoạn văn này sang tiếng Anh (hoặc tiếng Việt nếu là tiếng Anh):";
                }
                if (aiPromptInput) {
                    aiPromptInput.value = prompt;
                    executeAIPrompt(prompt);
                }
            });
        });

        btnRunAi?.addEventListener("click", () => {
            const prompt = aiPromptInput?.value.trim();
            if (prompt) executeAIPrompt(prompt);
        });

        aiPromptInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const prompt = aiPromptInput.value.trim();
                if (prompt) executeAIPrompt(prompt);
            }
        });

        async function executeAIPrompt(userPrompt) {
            const cfg = getAIConfig();
            if (cfg.provider === "off") {
                showToast("Trợ lý AI đang tắt. Hãy vào Cài đặt để bật Local AI hoặc Cloud AI!");
                return;
            }

            if (aiStatusRow && aiStatusText) {
                aiStatusRow.classList.remove("hidden");
                aiStatusText.textContent = cfg.provider === "local" ? "Ollama đang tạo phản hồi..." : "Cloud AI đang tạo phản hồi...";
            }
            if (btnRunAi) btnRunAi.disabled = true;

            const url = cfg.provider === "local"
                ? `${cfg.localUrl.replace(/\/+$/, "")}/chat/completions`
                : `${cfg.cloudUrl.replace(/\/+$/, "")}/chat/completions`;

            const model = cfg.provider === "local" ? cfg.localModel : cfg.cloudModel;
            const messages = [
                { role: "system", content: "Bạn là trợ lý AI thông minh cho NoteLocal. Hãy trả lời trực tiếp, súc tích bằng tiếng Việt hoặc ngôn ngữ phù hợp, định dạng văn bản rõ ràng." }
            ];

            if (activeContextText && activeContextText.trim()) {
                messages.push({
                    role: "user",
                    content: `Văn bản ngữ cảnh:\n"""\n${activeContextText.trim()}\n"""\n\nYêu cầu: ${userPrompt}`
                });
            } else {
                messages.push({ role: "user", content: userPrompt });
            }

            const headers = { "Content-Type": "application/json" };
            if (cfg.provider === "cloud" && cfg.cloudKey) {
                headers["Authorization"] = `Bearer ${cfg.cloudKey}`;
            }

            let timeoutId;
            try {
                const controller = new AbortController();
                timeoutId = setTimeout(() => controller.abort(), 35000);

                const res = await fetch(url, {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: 0.7
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!res.ok) {
                    const errText = await res.text();
                    let message = errText || res.statusText;
                    try {
                        const error = JSON.parse(errText);
                        message = error.error?.message || error.message || message;
                    } catch (_) { /* Plain-text API errors are valid too. */ }
                    throw new Error(`HTTP ${res.status}: ${message}`);
                }

                const data = await res.json();
                const content = data.choices?.[0]?.message?.content || "";
                if (!content) {
                    throw new Error("Phản hồi AI rỗng.");
                }

                insertAITextIntoEditor(content);
                closeAIPromptBar();
                showToast("Trợ lý AI đã phản hồi xong!");
            } catch (err) {
                console.error("AI Error:", err);
                let msg = err.message || err;
                if (err.name === "AbortError") {
                    msg = "Hết thời gian chờ phản hồi (35s).";
                } else if (cfg.provider === "local" && err instanceof TypeError) {
                    msg = "Không kết nối được Ollama. Hãy đảm bảo đã chạy: ollama run " + cfg.localModel;
                }
                showToast("Lỗi AI: " + msg);
                if (aiStatusRow) aiStatusRow.classList.add("hidden");
            } finally {
                clearTimeout(timeoutId);
                if (btnRunAi) btnRunAi.disabled = false;
            }
        }

        function insertAITextIntoEditor(text) {
            editor.focus();
            if (savedAIRange) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(savedAIRange);
            }
            const formatted = text.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
            document.execCommand("insertHTML", false, `<p>${formatted}</p>`);
            triggerSave();
        }
    }

    // Khởi tạo các bộ điều khiển
    initTableControls();
    initLinkControls();
    initBubbleToolbar();
    initSlashMenu();
    initBlockHandles();
    initAIIntegration();

    // Khởi tạo ban đầu
    sendIPC("request_init", {});
})();

(function() {
    let currentTabId = "tab_default";
    let tabs = [{ id: "tab_default", title: "Ghi chú mới" }];
    let isPinned = false;
    let saveTimeout = null;
    let pendingImages = [];
    let selectedImage = null;

    const editorContainer = document.getElementById("editor-container");
    const editor = document.getElementById("editor");
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
                showToast("Đã tạo link Web và sao chép vào Clipboard!", 3500);
            } else {
                showToast("Lỗi chia sẻ: " + (payload.error_message || "Thất bại"), 3000);
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

                // 1. To-Do Item
                if (node.classList && node.classList.contains("todo-item")) {
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
                    let label = "image";
                    if (node.style.width && node.style.width !== "100%") {
                        label = `image|${node.style.width}`;
                    }
                    lines.push(`![${label}](${assetSrc})`);
                }
                // 6. Paragraph hoặc Div
                else if (tag === "P" || tag === "DIV") {
                    const img = node.querySelector("img");
                    const todo = node.querySelector(".todo-item");

                    if (img) {
                        const assetSrc = img.dataset.assetSrc || (img.src.includes("assets/") ? img.src.substring(img.src.indexOf("assets/")) : img.src);
                        let label = "image";
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
                // 7. Bảng biểu (Table hoặc .table-wrapper)
                else if (tag === "TABLE" || (node.classList && node.classList.contains("table-wrapper")) || node.querySelector("table.note-table")) {
                    const tbl = (tag === "TABLE") ? node : node.querySelector("table.note-table");
                    if (tbl) {
                        lines.push(serializeTableToCleanHtml(tbl));
                    }
                }
            }
        }
        return lines.join("\n");
    }

    // Tự động lưu ghi chú với debounce 300ms
    function triggerSave() {
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
        sendIPC("save_note", { tab_id: currentTabId, html: editor.innerHTML });

        currentTabId = newTabId;
        renderTabs();
        sendIPC("switch_tab", { tab_id: currentTabId });
    }

    function closeTab(tabId) {
        hideImageResizer();
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

    // Tự động nhận diện [] thành ô Checkbox
    editor.addEventListener("input", function(e) {
        hideImageResizer();
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        const node = range.startContainer;
        if (node && node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const offset = range.startOffset;

            if (offset >= 2 && text.substring(offset - 2, offset) === "[]") {
                const before = text.substring(0, offset - 2);
                const after = text.substring(offset);

                const { div, span } = createTodoElement(after);
                const parentBlock = (node.parentNode && node.parentNode !== editor) ? node.parentNode : null;

                if (parentBlock) {
                    if (before.trim() === "") {
                        parentBlock.replaceWith(div);
                    } else {
                        node.textContent = before;
                        if (parentBlock.nextSibling) {
                            parentBlock.parentNode.insertBefore(div, parentBlock.nextSibling);
                        } else {
                            parentBlock.parentNode.appendChild(div);
                        }
                    }
                } else {
                    node.textContent = before;
                    if (node.nextSibling) {
                        editor.insertBefore(div, node.nextSibling);
                    } else {
                        editor.appendChild(div);
                    }
                }

                const newRange = document.createRange();
                newRange.setStart(span, 0);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);

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

    // Xử lý phím Backspace xóa Checkbox & phím Enter tạo Todo mới
    editor.addEventListener("keydown", function(e) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        const todoText = range.startContainer.parentElement?.closest(".todo-text") ||
                         (range.startContainer.classList?.contains("todo-text") ? range.startContainer : null);

        if (todoText) {
            const todoItem = todoText.closest(".todo-item");

            // Phím Backspace: xóa ô checkbox nếu text rỗng
            if (e.key === "Backspace") {
                if (todoText.textContent.length === 0 || (range.startOffset === 0 && range.endOffset === 0)) {
                    e.preventDefault();
                    const p = document.createElement("p");
                    p.innerHTML = todoText.textContent.length > 0 ? todoText.textContent : "<br>";
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
                checkAndApplyReminder(todoItem);
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
                    const { div, span } = createTodoElement("");
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
    // CÀI ĐẶT (SETTINGS MODAL)
    // ==========================================
    function openSettingsModal() {
        txturlServiceInput.value = localStorage.getItem("note_local_txturl_service") || "https://michaeltran8386.github.io/note-app/";
        settingsModal.classList.remove("hidden");
        txturlServiceInput.focus();
    }

    function closeSettingsModal() {
        settingsModal.classList.add("hidden");
    }

    btnSettings.addEventListener("click", openSettingsModal);
    btnCloseSettings.addEventListener("click", closeSettingsModal);
    btnSaveSettings.addEventListener("click", () => {
        const service = txturlServiceInput.value.trim() || "https://michaeltran8386.github.io/note-app/";
        localStorage.setItem("note_local_txturl_service", service);
        closeSettingsModal();
        showToast("Đã lưu cài đặt thành công!");
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

        // Escape: Đóng các modal đang mở
        if (e.key === "Escape") {
            if (!imageLightboxModal.classList.contains("hidden")) {
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
            const maxDim = 960;
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
            return canvas.toDataURL("image/jpeg", 0.82);
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
            if (imgNode.src.length > 500000) {
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
                if (node.classList.contains("todo-item")) {
                    const cb = node.querySelector(".todo-check");
                    const span = node.querySelector(".todo-text");
                    const mark = (cb && cb.checked) ? "x" : " ";
                    let text = span ? span.textContent.trim() : "";
                    const badge = node.querySelector(".reminder-badge");
                    if (badge && badge.dataset.display) {
                        text += ` @${badge.dataset.display}`;
                    }
                    lines.push(`- [${mark}] ${text}`);
                } else if (node.tagName === "IMG") {
                    const src = await getImageShareSrc(node);
                    let label = "image";
                    if (node.style.width && node.style.width !== "100%") {
                        label = `image|${node.style.width}`;
                    }
                    lines.push(`![${label}](${src})`);
                } else if (node.tagName === "P" || node.tagName === "DIV") {
                    let subtext = "";
                    let hasSub = false;
                    for (const child of Array.from(node.childNodes)) {
                        if (child.nodeType === Node.ELEMENT_NODE) {
                            if (child.classList && child.classList.contains("todo-item")) {
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
                                let label = "image";
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
                } else if (node.tagName === "TABLE" || (node.classList && node.classList.contains("table-wrapper")) || node.querySelector("table.note-table")) {
                    const tbl = (node.tagName === "TABLE") ? node : node.querySelector("table.note-table");
                    if (tbl) {
                        lines.push(serializeTableToCleanHtml(tbl));
                    }
                }
            }
        }
        return lines.join("\n\n");
    }

    // ==========================================
    // MÃ HÓA CLEAN TEXT URL (THAM KHẢO TXTURL)
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

    btnExportUrl.addEventListener("click", async function() {
        btnExportUrl.classList.add("loading");
        showToast("Đang tạo link chia sẻ Web 100% nội dung & ảnh...", 2000);

        try {
            const activeTab = tabs.find(t => t.id === currentTabId);
            const title = (activeTab && activeTab.title && activeTab.title !== "Ghi chú mới") ? activeTab.title : "";
            const mdContent = await getNoteMarkdown();

            // 1. Nén toàn bộ nội dung (bao gồm cả ảnh data URL nếu có) thành hash deflate-raw base64url
            const hash = await compressToTxtUrl(mdContent);
            const serviceBase = localStorage.getItem("note_local_txturl_service") || "https://michaeltran8386.github.io/note-app/";
            const cleanBase = serviceBase.endsWith("/") ? serviceBase : (serviceBase + "/");
            const publicUrl = `${cleanBase}#${hash}`;

            // 2. Sao chép vào Clipboard của trình duyệt
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(publicUrl);
                } catch (e) {}
            }

            // 3. Sao chép vào Win32 System Clipboard qua C++ IPC để chắc chắn 100%
            sendIPC("copy_to_clipboard", { text: publicUrl });

            // 4. Thu thập danh sách ảnh cục bộ và gửi lưu snapshot local
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
                public_url: publicUrl
            });

            btnExportUrl.classList.remove("loading");
            showToast("Đã sao chép link Web 100% vào Clipboard!", 3500);
        } catch (err) {
            console.error("Lỗi chia sẻ:", err);
            btnExportUrl.classList.remove("loading");
            showToast("Lỗi khi tạo link chia sẻ: " + err.message, 3000);
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

    // Khởi tạo các bộ điều khiển
    initTableControls();

    // Khởi tạo ban đầu
    sendIPC("request_init", {});
})();

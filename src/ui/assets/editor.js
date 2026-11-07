(function() {
    let currentTabId = "tab_default";
    let tabs = [{ id: "tab_default", title: "Ghi chú mới" }];
    let isPinned = false;
    let saveTimeout = null;
    let pendingImages = [];

    const editor = document.getElementById("editor");
    const tabsList = document.getElementById("tabs-list");
    const btnAddTab = document.getElementById("btn-add-tab");
    const btnPin = document.getElementById("btn-pin");
    const renameModal = document.getElementById("rename-modal");
    const renameInput = document.getElementById("rename-input");
    const btnCancelRename = document.getElementById("btn-cancel-rename");
    const btnConfirmRename = document.getElementById("btn-confirm-rename");
    let renamingTabId = null;

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
        } else if (action === "image_saved") {
            const fullUrl = "https://notelocal.app/" + payload.path;
            if (pendingImages.length > 0) {
                const img = pendingImages.shift();
                img.dataset.assetSrc = payload.path;
                img.src = fullUrl;
            } else {
                insertImage(fullUrl);
            }
            triggerSave();
        } else if (action === "update_pin") {
            isPinned = payload.always_on_top;
            btnPin.classList.toggle("pinned", isPinned);
        }
    }

    // Tự động lưu ghi chú với debounce 300ms
    function triggerSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(function() {
            sendIPC("save_note", {
                tab_id: currentTabId,
                html: editor.innerHTML
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
            closeEl.title = "Đóng tab";
            tabEl.appendChild(closeEl);

            // Click chọn tab
            tabEl.addEventListener("click", function(e) {
                if (e.target === closeEl) return;
                switchTab(tab.id);
            });

            // Double click đổi tên tab
            tabEl.addEventListener("dblclick", function() {
                openRenameModal(tab.id, tab.title);
            });

            // Click đóng tab
            closeEl.addEventListener("click", function(e) {
                e.stopPropagation();
                closeTab(tab.id);
            });

            tabsList.appendChild(tabEl);
        });
    }

    function switchTab(newTabId) {
        if (currentTabId === newTabId) return;
        // Lưu tab cũ trước khi chuyển
        sendIPC("save_note", { tab_id: currentTabId, html: editor.innerHTML });

        currentTabId = newTabId;
        renderTabs();
        sendIPC("switch_tab", { tab_id: currentTabId });
    }

    function closeTab(tabId) {
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

    // Xử lý Checkbox Tick
    function setupCheckboxListeners() {
        const checkboxes = editor.querySelectorAll(".todo-check");
        checkboxes.forEach(function(cb) {
            const item = cb.closest(".todo-item");
            if (item) {
                item.classList.toggle("checked", cb.checked);
            }
            cb.onchange = function() {
                if (item) item.classList.toggle("checked", cb.checked);
                triggerSave();
            };
        });
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

        div.appendChild(cb);
        div.appendChild(span);

        cb.onchange = function() {
            div.classList.toggle("checked", cb.checked);
            triggerSave();
        };

        return { div, cb, span };
    }

    // Tự động nhận diện [] thành ô Checkbox
    editor.addEventListener("input", function(e) {
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const range = sel.getRangeAt(0);

        // Kiểm tra text node hiện tại
        const node = range.startContainer;
        if (node && node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            const offset = range.startOffset;

            // Nếu vừa gõ xong '[]'
            if (offset >= 2 && text.substring(offset - 2, offset) === "[]") {
                const before = text.substring(0, offset - 2);
                const after = text.substring(offset);

                node.textContent = before;

                const { div, span } = createTodoElement(after);
                
                // Chèn todo item sau text node
                if (node.nextSibling) {
                    node.parentNode.insertBefore(div, node.nextSibling);
                } else {
                    node.parentNode.appendChild(div);
                }

                // Nếu node cha trước đó rỗng, xóa thẻ P thừa
                if (before.trim() === "" && node.parentNode && node.parentNode !== editor && node.parentNode.tagName === "P") {
                    node.parentNode.replaceWith(div);
                }

                // Đặt con trỏ vào trong span của todo
                const newRange = document.createRange();
                newRange.setStart(span, 0);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);

                triggerSave();
                return;
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

        // Kiểm tra xem con trỏ có đang trong span.todo-text không
        const todoText = range.startContainer.parentElement?.closest(".todo-text") ||
                         (range.startContainer.classList?.contains("todo-text") ? range.startContainer : null);

        if (todoText) {
            const todoItem = todoText.closest(".todo-item");

            // Phím Backspace: nếu text rỗng, xóa todo-item
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

            // Phím Enter: tạo todo tiếp theo hoặc thoát todo nếu dòng rỗng
            if (e.key === "Enter") {
                e.preventDefault();
                if (todoText.textContent.trim() === "") {
                    // Dòng rỗng -> biến thành dòng văn bản thường
                    const p = document.createElement("p");
                    p.innerHTML = "<br>";
                    todoItem.replaceWith(p);
                    const newRange = document.createRange();
                    newRange.setStart(p, 0);
                    newRange.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(newRange);
                } else {
                    // Tạo todo tiếp theo
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

    // Xử lý dán ảnh Ctrl+V từ clipboard
    editor.addEventListener("paste", function(e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;
        const items = clipboardData.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.indexOf("image") !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (!blob) continue;

                const reader = new FileReader();
                reader.onload = function(event) {
                    const dataUrl = event.target.result;
                    // Chèn ảnh vào editor ngay lập tức với Data URL để người dùng nhìn thấy tức thì
                    const img = insertImage(dataUrl);

                    // Gửi Base64 sang C++ để lưu vào assets/img_xxx.png
                    sendIPC("save_image", {
                        data: dataUrl,
                        ext: "png"
                    });

                    pendingImages.push(img);
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
    });

    // Chèn ảnh vào vị trí con trỏ
    function insertImage(src) {
        const img = document.createElement("img");
        img.src = src;
        img.className = "note-image";
        img.alt = "Ảnh ghi chú";

        const sel = window.getSelection();
        if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.insertNode(img);
            range.collapse(false);
        } else {
            editor.appendChild(img);
        }

        // Tạo thêm dòng mới dưới ảnh để viết tiếp
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        if (img.nextSibling) {
            img.parentNode.insertBefore(p, img.nextSibling);
        } else {
            img.parentNode.appendChild(p);
        }

        // Chuyển con trỏ xuống dòng mới
        try {
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.collapse(true);
            sel.removeAllRanges();
            sel.addRange(newRange);
        } catch (err) {}

        triggerSave();
        return img;
    }

    // Khởi tạo ban đầu
    sendIPC("request_init", {});
})();

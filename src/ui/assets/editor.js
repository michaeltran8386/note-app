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
            hideImageResizer();
        } else if (action === "image_saved") {
            const fullUrl = "https://notelocal.app/" + payload.path;
            if (pendingImages.length > 0) {
                const img = pendingImages.shift();
                if (img && img.parentNode) {
                    img.dataset.assetSrc = payload.path;
                    const tester = new Image();
                    tester.onload = function() {
                        img.src = fullUrl;
                    };
                    tester.src = fullUrl;
                }
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

                node.textContent = before;

                const { div, span } = createTodoElement(after);

                if (node.nextSibling) {
                    node.parentNode.insertBefore(div, node.nextSibling);
                } else {
                    node.parentNode.appendChild(div);
                }

                if (before.trim() === "" && node.parentNode && node.parentNode !== editor && node.parentNode.tagName === "P") {
                    node.parentNode.replaceWith(div);
                }

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

    // Chèn ảnh vào vị trí con trỏ
    function insertImage(src) {
        editor.focus();
        const img = document.createElement("img");
        img.src = src;
        img.className = "note-image";
        img.alt = "";

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(img);
            range.collapse(false);
        } else {
            editor.appendChild(img);
        }

        const p = document.createElement("p");
        p.innerHTML = "<br>";
        if (img.nextSibling) {
            img.parentNode.insertBefore(p, img.nextSibling);
        } else {
            img.parentNode.appendChild(p);
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

    // Xử lý dán ảnh Ctrl+V từ clipboard
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

            const reader = new FileReader();
            reader.onload = function(event) {
                const dataUrl = event.target.result;
                if (!dataUrl) return;

                const img = insertImage(dataUrl);

                sendIPC("save_image", {
                    data: dataUrl,
                    ext: "png"
                });

                pendingImages.push(img);
            };
            reader.readAsDataURL(imageFile);
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
    // XUẤT URL LÊN TRÌNH DUYỆT (GITHUB GIST)
    // ==========================================
    function getNoteMarkdown() {
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
                    const text = span ? span.textContent.trim() : "";
                    lines.push(`- [${mark}] ${text}`);
                } else if (node.tagName === "IMG") {
                    const src = node.dataset.assetSrc ? ("https://notelocal.app/" + node.dataset.assetSrc) : node.src;
                    lines.push(`![](${src})`);
                } else if (node.tagName === "P" || node.tagName === "DIV") {
                    let subtext = "";
                    let hasSub = false;
                    node.childNodes.forEach(child => {
                        if (child.nodeType === Node.ELEMENT_NODE) {
                            if (child.classList && child.classList.contains("todo-item")) {
                                hasSub = true;
                                const cb = child.querySelector(".todo-check");
                                const span = child.querySelector(".todo-text");
                                const mark = (cb && cb.checked) ? "x" : " ";
                                const text = span ? span.textContent.trim() : "";
                                lines.push(`- [${mark}] ${text}`);
                            } else if (child.tagName === "IMG") {
                                hasSub = true;
                                const src = child.dataset.assetSrc ? ("https://notelocal.app/" + child.dataset.assetSrc) : child.src;
                                lines.push(`![](${src})`);
                            } else {
                                subtext += child.textContent;
                            }
                        } else if (child.nodeType === Node.TEXT_NODE) {
                            subtext += child.textContent;
                        }
                    });
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
        const activeTab = tabs.find(t => t.id === currentTabId);
        const title = (activeTab && activeTab.title && activeTab.title !== "Ghi chú mới") ? activeTab.title : "";
        const mdContent = getNoteMarkdown();

        let fullText = mdContent;
        if (title) {
            fullText = `# ${title}\n\n${mdContent}`;
        }
        if (!fullText.trim()) {
            fullText = title ? `# ${title}` : "";
        }

        try {
            const hash = await compressToTxtUrl(fullText);
            let serviceUrl = localStorage.getItem("note_local_txturl_service") || "https://michaeltran8386.github.io/note-app/";
            if (!serviceUrl.endsWith("/")) serviceUrl += "/";
            const cleanTxtUrl = `${serviceUrl}#${hash}`;

            // 1. Sao chép vào Clipboard qua Web API
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(cleanTxtUrl).catch(() => {});
            }

            // 2. Đảm bảo sao chép vào Clipboard qua Windows Win32 Native API
            sendIPC("copy_to_clipboard", { text: cleanTxtUrl });

            // 3. Hiển thị thông báo đúng chuẩn chức năng: "Đã sao chép URL vào Clipboard của bạn"
            showToast("Đã sao chép URL vào Clipboard của bạn", 3000);
        } catch (err) {
            console.error("TxtUrl Compress Error:", err);
            showToast("Không thể tạo URL: " + err.message, 3000);
        }
    });

    // Khởi tạo ban đầu
    sendIPC("request_init", {});
})();

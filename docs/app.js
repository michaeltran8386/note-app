(function() {
    const display = document.getElementById("display");
    const editor = document.getElementById("editor");
    const docTitle = document.getElementById("doc-title");
    const btnToggleMode = document.getElementById("btn-toggle-mode");
    const btnCopyRaw = document.getElementById("btn-copy-raw");
    const btnShare = document.getElementById("btn-share");
    const toast = document.getElementById("toast");

    let isEditorMode = false;
    let currentRawText = "";
    let toastTimeout = null;

    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.remove("hidden");
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.add("hidden"), duration);
    }

    // ==========================================
    // DEFLATE-RAW COMPRESSION & DECOMPRESSION
    // ==========================================
    async function compress(text) {
        if (!text) return "";
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

    async function decompress(b64url) {
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

    // ==========================================
    // MINIMAL MARKDOWN RENDERER
    // ==========================================
    function escapeHtml(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function renderMarkdown(md) {
        if (!md.trim()) {
            return `<p style="color: var(--text-subtle); font-style: italic;">(Ghi chú trống. Nhấn nút "Soạn thảo" ở trên để viết nội dung)</p>`;
        }

        const lines = md.split("\n");
        let html = "";
        let inCodeBlock = false;
        let codeBlockContent = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Code blocks ```
            if (line.startsWith("```")) {
                if (inCodeBlock) {
                    html += `<pre><code>${escapeHtml(codeBlockContent.join("\n"))}</code></pre>`;
                    codeBlockContent = [];
                    inCodeBlock = false;
                } else {
                    inCodeBlock = true;
                    codeBlockContent = [];
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockContent.push(line);
                continue;
            }

            // Headings
            if (line.startsWith("# ")) {
                html += `<h1>${parseInline(line.slice(2))}</h1>`;
                continue;
            }
            if (line.startsWith("## ")) {
                html += `<h2>${parseInline(line.slice(3))}</h2>`;
                continue;
            }
            if (line.startsWith("### ")) {
                html += `<h3>${parseInline(line.slice(4))}</h3>`;
                continue;
            }

            // Checkbox / Todo Items
            const todoMatch = line.match(/^[-*]?\s*\[([ xX])\]\s*(.*)$/);
            if (todoMatch) {
                const checked = todoMatch[1].toLowerCase() === "x";
                let text = todoMatch[2];
                let badgeHtml = "";
                
                // Detect @reminder pattern, e.g. @15:30 15/11/2026 or @15:30 15/11 or @15:30
                const remMatch = text.match(/@([0-1]?[0-9]|2[0-3]):[0-5][0-9](?:\s+[0-3]?[0-9]\/[0-1]?[0-9](?:\/[0-9]{4})?)?/);
                if (remMatch) {
                    badgeHtml = ` <span class="reminder-badge${checked ? ' completed' : ''}">⏱ ${escapeHtml(remMatch[0].substring(1))}</span>`;
                    text = text.replace(remMatch[0], "").trim();
                }

                html += `<div class="todo-item ${checked ? 'checked' : ''}">
                    <input type="checkbox" class="todo-check" ${checked ? 'checked' : ''} disabled>
                    <span>${parseInline(text)}</span>${badgeHtml}
                </div>`;
                continue;
            }

            // Bullet List Items (- item or * item)
            const bulletMatch = line.trim().match(/^[-*]\s+(.*)$/);
            if (bulletMatch && !line.trim().startsWith("- [") && !line.trim().startsWith("* [")) {
                const text = bulletMatch[1].trim();
                html += `<ul><li>${parseInline(text)}</li></ul>`;
                continue;
            }

            // Numbered List Items (1. item)
            const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
                const text = numMatch[2].trim();
                html += `<ol><li>${parseInline(text)}</li></ol>`;
                continue;
            }

            // Standalone Link: [title](url) hoặc [title]<url> hoặc https://...
            const standaloneLinkMatch = line.trim().match(/^(?:\[([^\]]+)\][<\(](https?:\/\/[^\s>\)]+)[>\)]|(https?:\/\/[^\s]+))$/i);
            if (standaloneLinkMatch) {
                const title = (standaloneLinkMatch[1] || standaloneLinkMatch[3] || "").trim();
                const url = (standaloneLinkMatch[2] || standaloneLinkMatch[3] || "").trim();
                const displayTitle = title || url;
                html += `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="note-link">${escapeHtml(displayTitle)}</a></p>`;
                continue;
            }

            // Quotes & Legacy Link Bookmarks (> [hiển thị]<link url> hoặc > [title](url) hoặc > url)
            if (line.trim().startsWith(">")) {
                const bqContent = line.trim().slice(1).trim();
                const legacyMatch = bqContent.match(/^(?:\[([^\]]*)\][<\(]([^>\)]+)[>\)]|<([^>]+)>|(https?:\/\/\S+))$/i);
                if (legacyMatch) {
                    const title = (legacyMatch[1] || legacyMatch[3] || legacyMatch[4] || "").trim();
                    const url = (legacyMatch[2] || legacyMatch[3] || legacyMatch[4] || "").trim();
                    const displayTitle = title || url;
                    html += `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="note-link">${escapeHtml(displayTitle)}</a></p>`;
                    continue;
                }
                html += `<blockquote>${parseInline(bqContent)}</blockquote>`;
                continue;
            }

            // Tables (HTML block <table...)
            if (line.trim().startsWith("<table") || line.trim().startsWith("<div class=\"table-wrapper\"")) {
                let tableHtml = line;
                while (!tableHtml.includes("</table>") && i + 1 < lines.length) {
                    i++;
                    tableHtml += " " + lines[i];
                }
                // Sửa lỗi thẻ hỏng do foster parenting hoặc dữ liệu cũ
                tableHtml = tableHtml.replace(/<th\s+ead=""[^>]*>.*?<\/th>/gi, "")
                                     .replace(/<th\s+contenteditable="true"\s*ead=""[^>]*>.*?<\/th>/gi, "")
                                     .replace(/<\/thead>/gi, "")
                                     .replace(/<thead[^>]*>/gi, "")
                                     .replace(/<button[^>]*class="note-link-edit-btn"[^>]*>[\s\S]*?<\/button>/gi, "")
                                     .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, "")
                                     .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
                                     .replace(/<span[^>]*class="note-link-wrap"[^>]*>[\s\S]*?<a[^>]*class="note-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/span>/gi, '<a class="note-link" href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
                                     .replace(/<span[^>]*class="note-link-wrap"[^>]*data-title="([^"]*)"[^>]*data-url="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, '<a class="note-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                                     .replace(/<span[^>]*class="note-link-wrap"[^>]*data-url="([^"]*)"[^>]*data-title="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, '<a class="note-link" href="$1" target="_blank" rel="noopener noreferrer">$2</a>')
                                     .replace(/<span[^>]*class="note-link-wrap"[^>]*data-url="([^"]*)"[^>]*>[\s\S]*?<\/span>/gi, '<a class="note-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
                                     .replace(/<p><br\s*\/?><\/p>/gi, "")
                                     .replace(/<tr>\s*<p>/gi, "<tr><td>")
                                     .replace(/<\/p>\s*<td>/gi, "</td><td>")
                                     .replace(/<\/p>\s*<\/tr>/gi, "</td></tr>");
                if (!tableHtml.includes("class=\"table-wrapper\"")) {
                    html += `<div class="table-wrapper">${tableHtml}</div>`;
                } else {
                    html += tableHtml;
                }
                continue;
            }

            // Horizontal rule
            if (/^---$|^\*\*\*$/.test(line.trim())) {
                html += `<hr>`;
                continue;
            }

            // Images ![alt|width](url)
            const trimmedLine = line.trim();
            const imgMatch = trimmedLine.match(/^!\[(.*?)\]\((.+)\)$/);
            if (imgMatch) {
                const label = imgMatch[1];
                const src = imgMatch[2];
                let width = "30%";
                if (label.includes("|")) {
                    const w = label.split("|")[1].trim();
                    if (w) width = w;
                }
                const style = ` style="width: ${width}; max-width: 100%;"`;
                html += `<p><img src="${src}" alt="" class="note-image"${style}></p>`;
                continue;
            }

            // Regular paragraph or line
            if (line.trim() === "") {
                html += `<br>`;
            } else {
                html += `<p>${parseInline(line)}</p>`;
            }
        }

        if (inCodeBlock && codeBlockContent.length > 0) {
            html += `<pre><code>${escapeHtml(codeBlockContent.join("\n"))}</code></pre>`;
        }

        html = html.replace(/<\/ul>\s*<ul>/gi, "").replace(/<\/ol>\s*<ol>/gi, "");
        return html;
    }

    function parseInline(text) {
        let out = escapeHtml(text);
        // Parse inline images first before links - mặc định width: 30%
        out = out.replace(/!\[(.*?)\]\((.+?)\)/g, (m, label, src) => {
            let width = "30%";
            if (label.includes("|")) {
                const w = label.split("|")[1].trim();
                if (w) width = w;
            }
            return `<img src="${src}" alt="" class="note-image" style="width: ${width}; max-width: 100%;">`;
        });

        // Then parse links, bold, italic, strikethrough, inline code
        return out
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/~~(.*?)~~/g, "<del>$1</del>")
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\[([^\]]+)\][<\(](https?:\/\/[^\s>\)]+)[>\)]/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="note-link">$1</a>')
            .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="note-link">$2</a>');
    }

    function extractTitle(text) {
        for (const line of text.split("\n")) {
            const m = line.match(/^#+\s+(.*\S)/);
            if (m) return m[1].trim();
        }
        return "";
    }

    // ==========================================
    // RÚT GỌN LINK TINYURL & IS.GD
    // ==========================================
    async function shortenUrl(longUrl) {
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
            console.warn("TinyURL failed, trying is.gd:", e);
        }

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
            console.warn("is.gd failed:", e);
        }

        return longUrl;
    }

    // ==========================================
    // INITIALIZATION & EVENT HANDLERS
    // ==========================================
    async function loadFromHash() {
        let rawData = window.location.hash.slice(1);
        if (!rawData) {
            const urlParams = new URLSearchParams(window.location.search);
            rawData = urlParams.get("p") || urlParams.get("data") || "";
        }

        if (rawData) {
            currentRawText = await decompress(rawData);
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const shareId = urlParams.get("share");
            if (shareId) {
                try {
                    const res = await fetch(`viewer/shares/${shareId}.json`);
                    if (res.ok) {
                        const data = await res.json();
                        currentRawText = data.markdown || "";
                    }
                } catch (e) {}
            }
            if (!currentRawText) currentRawText = "";
        }

        updateDisplay();
    }

    function updateDisplay() {
        const title = extractTitle(currentRawText);
        if (title) {
            document.title = `${title} - Note Local`;
            docTitle.textContent = title;
        } else {
            document.title = "Note Local - Clean Text Viewer";
            docTitle.textContent = currentRawText ? "Ghi chú" : "Clean Text";
        }

        display.innerHTML = renderMarkdown(currentRawText);
        editor.value = currentRawText;
    }

    // Toggle Mode (Xem <-> Soạn thảo)
    btnToggleMode.addEventListener("click", function() {
        isEditorMode = !isEditorMode;
        btnToggleMode.classList.toggle("active", isEditorMode);

        const shareLabel = btnShare.querySelector(".btn-label");
        if (isEditorMode) {
            btnToggleMode.querySelector(".btn-label").textContent = "Xem";
            if (shareLabel) shareLabel.textContent = "Gửi bản sửa";
            display.classList.add("hidden");
            editor.classList.remove("hidden");
            editor.focus();
        } else {
            btnToggleMode.querySelector(".btn-label").textContent = "Soạn thảo";
            if (shareLabel) shareLabel.textContent = "Chia sẻ";
            editor.classList.add("hidden");
            display.classList.remove("hidden");
            updateDisplay();
        }
    });

    // Real-time update hash as user edits
    let editTimeout = null;
    editor.addEventListener("input", function() {
        currentRawText = editor.value;
        if (editTimeout) clearTimeout(editTimeout);
        editTimeout = setTimeout(async function() {
            if (currentRawText.trim()) {
                const hash = await compress(currentRawText);
                history.replaceState(null, "", `#${hash}`);
            } else {
                history.replaceState(null, "", window.location.pathname);
            }
            const title = extractTitle(currentRawText);
            docTitle.textContent = title || "Ghi chú";
        }, 300);
    });

    // Sao chép nội dung thô
    btnCopyRaw.addEventListener("click", async function() {
        if (!currentRawText) {
            showToast("Nội dung ghi chú trống!");
            return;
        }
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(currentRawText);
            showToast("Đã sao chép nội dung Markdown!");
        }
    });


    // Share Modal Elements
    const shareModal = document.getElementById("share-modal");
    const shareModalTitle = document.getElementById("share-modal-title");
    const shareModalDesc = document.getElementById("share-modal-desc");
    const shareModalUrl = document.getElementById("share-modal-url");
    const btnCopyModalUrl = document.getElementById("btn-copy-modal-url");
    const btnCloseShareModal = document.getElementById("btn-close-share-modal");

    function closeShareModal() {
        if (shareModal) shareModal.classList.add("hidden");
    }

    if (btnCloseShareModal) {
        btnCloseShareModal.addEventListener("click", closeShareModal);
    }
    if (shareModal) {
        shareModal.addEventListener("click", function(e) {
            if (e.target === shareModal) closeShareModal();
        });
    }
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") closeShareModal();
    });

    if (btnCopyModalUrl && shareModalUrl) {
        btnCopyModalUrl.addEventListener("click", async function() {
            shareModalUrl.focus();
            shareModalUrl.select();
            let copied = false;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(shareModalUrl.value);
                    copied = true;
                } catch (e) {}
            }
            if (!copied) {
                try {
                    document.execCommand("copy");
                    copied = true;
                } catch (e) {}
            }
            showToast("Đã sao chép đường link vào Clipboard!", 3000);
        });
    }

    // Sao chép & Rút gọn URL chia sẻ / Gửi bản sửa
    btnShare.addEventListener("click", async function() {
        btnShare.classList.add("loading");
        try {
            const targetText = isEditorMode ? editor.value : currentRawText;
            const hash = await compress(targetText);
            const fullUrl = `${window.location.origin}${window.location.pathname}#${hash}`;

            let copied = false;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(fullUrl);
                    copied = true;
                } catch (e) {}
            }
            if (!copied) {
                const ta = document.createElement("textarea");
                ta.value = fullUrl;
                ta.style.position = "fixed";
                ta.style.opacity = "0";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                try {
                    document.execCommand("copy");
                    copied = true;
                } catch (e) {}
                document.body.removeChild(ta);
            }

            btnShare.classList.remove("loading");
            if (shareModal && shareModalUrl) {
                if (isEditorMode) {
                    if (shareModalTitle) shareModalTitle.textContent = "Chia sẻ bản chỉnh sửa";
                    if (shareModalDesc) shareModalDesc.textContent = "Đường link dưới đây chứa bản ghi chú bạn vừa sửa. Hãy sao chép và gửi lại cho người tạo ghi chú để họ áp dụng (Merge).";
                } else {
                    if (shareModalTitle) shareModalTitle.textContent = "Chia sẻ ghi chú";
                    if (shareModalDesc) shareModalDesc.textContent = "Đường link dưới đây chứa 100% nội dung (Zero-backend). Bất kỳ ai mở link cũng có thể xem và bấm 'Soạn thảo' để sửa tiếp mà không cần cấu hình máy chủ.";
                }
                shareModalUrl.value = fullUrl;
                shareModal.classList.remove("hidden");
                shareModalUrl.focus();
                shareModalUrl.select();
            }
            if (isEditorMode) {
                showToast("Đã tạo link bản sửa và sao chép vào Clipboard!", 3500);
            } else {
                showToast("Đã tạo link chia sẻ và sao chép vào Clipboard!", 3500);
            }
        } catch (err) {
            console.error("Lỗi chia sẻ:", err);
            btnShare.classList.remove("loading");
            showToast("Lỗi khi tạo link chia sẻ: " + err.message, 3000);
        }
    });

    // Lắng nghe thay đổi hash
    window.addEventListener("hashchange", loadFromHash);

    // Bắt đầu
    loadFromHash();
})();


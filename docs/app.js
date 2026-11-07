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

            // Quotes
            if (line.startsWith("> ")) {
                html += `<blockquote>${parseInline(line.slice(2))}</blockquote>`;
                continue;
            }

            // Tables (HTML block <table...)
            if (line.trim().startsWith("<table") || line.trim().startsWith("<div class=\"table-wrapper\"")) {
                let tableHtml = line;
                while (!tableHtml.includes("</table>") && i + 1 < lines.length) {
                    i++;
                    tableHtml += " " + lines[i];
                }
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
                let style = "";
                if (label.includes("|")) {
                    const w = label.split("|")[1].trim();
                    if (w) style = ` style="width: ${w}; max-width: 100%;"`;
                }
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

        return html;
    }

    function parseInline(text) {
        let out = escapeHtml(text);
        // Parse inline images first before links
        out = out.replace(/!\[(.*?)\]\((.+?)\)/g, (m, label, src) => {
            let style = "";
            if (label.includes("|")) {
                const w = label.split("|")[1].trim();
                if (w) style = ` style="width: ${w}; max-width: 100%;"`;
            }
            return `<img src="${src}" alt="" class="note-image"${style}>`;
        });

        // Then parse links, bold, italic, strikethrough, inline code
        return out
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/~~(.*?)~~/g, "<del>$1</del>")
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    }

    function extractTitle(text) {
        for (const line of text.split("\n")) {
            const m = line.match(/^#+\s+(.*\S)/);
            if (m) return m[1].trim();
        }
        return "";
    }

    // ==========================================
    // INITIALIZATION & EVENT HANDLERS
    // ==========================================
    async function loadFromHash() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            currentRawText = await decompress(hash);
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

        if (isEditorMode) {
            btnToggleMode.querySelector(".btn-label").textContent = "Xem";
            display.classList.add("hidden");
            editor.classList.remove("hidden");
            editor.focus();
        } else {
            btnToggleMode.querySelector(".btn-label").textContent = "Soạn thảo";
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

    // Sao chép URL
    btnShare.addEventListener("click", async function() {
        const url = window.location.href;
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(url);
        }
        showToast("Đã sao chép URL vào Clipboard của bạn");
    });

    // Lắng nghe thay đổi hash
    window.addEventListener("hashchange", loadFromHash);

    // Bắt đầu
    loadFromHash();
})();


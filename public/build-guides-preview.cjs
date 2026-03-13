#!/usr/bin/env node
/**
 * Parses GUIDES_CONTENT.md and generates guides-preview.html
 * with all tutorial data embedded as JSON.
 *
 * Usage: node Others/build-guides-preview.cjs
 */

const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, 'GUIDES_CONTENT.md');
const outPath = path.join(__dirname, 'guides-preview.html');

const md = fs.readFileSync(mdPath, 'utf-8');

// Split into tutorial blocks by "### Tutorial N:" headings
const tutorialRegex = /^### Tutorial \d+:\s*(.+)$/gm;
const matches = [...md.matchAll(tutorialRegex)];

const tutorials = [];

for (let i = 0; i < matches.length; i++) {
  const startIdx = matches[i].index;
  const endIdx = i + 1 < matches.length ? matches[i + 1].index : md.length;
  const block = md.substring(startIdx, endIdx).trim();

  const title = matches[i][1].trim();

  // Extract metadata
  const slugMatch = block.match(/\*\*Slug:\*\*\s*`([^`]+)`/);
  const categoryMatch = block.match(/\*\*Category:\*\*\s*(.+)/);
  const orderMatch = block.match(/\*\*Display Order:\*\*\s*(\d+)/);
  const parentMatch = block.match(/\*\*Parent:\*\*\s*(.+)/);
  const excerptMatch = block.match(/\*\*Excerpt:\*\*\s*(.+)/);

  const slug = slugMatch ? slugMatch[1].trim() : '';
  const category = categoryMatch ? categoryMatch[1].trim() : '';
  const displayOrder = orderMatch ? parseInt(orderMatch[1]) : 0;
  const parentRaw = parentMatch ? parentMatch[1].trim() : '';
  const parent = parentRaw === 'None (Top-level)' ? '' : parentRaw;
  const excerpt = excerptMatch ? excerptMatch[1].trim() : '';

  // Extract content: everything after "**Content:**" line
  const contentMarker = '**Content:**';
  const contentStart = block.indexOf(contentMarker);
  let content = '';
  if (contentStart !== -1) {
    content = block.substring(contentStart + contentMarker.length).trim();
    // Remove trailing --- separators, ## Category headers, and "Additional Tutorial Ideas"
    content = content.replace(/(\n---\s*)+(\n+## .*)?$/gs, '').trim();
  }

  tutorials.push({ title, slug, category, displayOrder, parent, excerpt, content });
}

console.log(`Parsed ${tutorials.length} tutorials`);

const jsonData = JSON.stringify(tutorials, null, 2);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpenHR Guides — Preview & Copy</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #1a1a1a; display: flex; height: 100vh; }

    /* Sidebar */
    .sidebar { width: 300px; min-width: 300px; background: #1e293b; color: #e2e8f0; overflow-y: auto; padding: 16px 0; }
    .sidebar h2 { padding: 0 16px 12px; font-size: 15px; color: #94a3b8; border-bottom: 1px solid #334155; margin-bottom: 8px; }
    .sidebar .cat-label { padding: 10px 16px 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    .sidebar a { display: block; padding: 6px 16px 6px 24px; font-size: 13px; color: #cbd5e1; text-decoration: none; line-height: 1.4; }
    .sidebar a:hover, .sidebar a.active { background: #334155; color: #fff; }

    /* Main */
    .main { flex: 1; overflow-y: auto; padding: 32px 48px; }
    .tutorial-card { background: #fff; border-radius: 8px; padding: 32px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .tutorial-card .meta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .tutorial-card .meta span { font-size: 12px; padding: 2px 10px; border-radius: 99px; background: #e0f2fe; color: #0369a1; }
    .tutorial-card .meta span.slug { background: #f0fdf4; color: #15803d; font-family: monospace; }
    .tutorial-card h2 { font-size: 22px; margin-bottom: 8px; }
    .tutorial-card .excerpt { color: #64748b; font-size: 14px; margin-bottom: 16px; }

    /* Content area */
    .content-html { border: 1px solid #e2e8f0; border-radius: 6px; padding: 24px; margin-top: 12px; font-size: 15px; line-height: 1.7; }
    .content-html h4 { font-size: 18px; margin: 24px 0 8px; }
    .content-html h5 { font-size: 15px; margin: 16px 0 6px; }
    .content-html ul, .content-html ol { padding-left: 24px; margin: 8px 0; }
    .content-html li { margin-bottom: 4px; }
    .content-html a { color: #2563eb; text-decoration: underline; }
    .content-html table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    .content-html th, .content-html td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 14px; }
    .content-html th { background: #f8fafc; }
    .content-html p { margin: 8px 0; }
    .content-html strong { font-weight: 600; }
    .content-html hr { display: none; }

    /* Buttons */
    .btn-row { display: flex; gap: 8px; margin-top: 16px; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; }
    .btn-copy { background: #2563eb; color: #fff; }
    .btn-copy:hover { background: #1d4ed8; }
    .btn-copy.copied { background: #16a34a; }

    /* Toast */
    .toast { position: fixed; bottom: 24px; right: 24px; background: #16a34a; color: #fff; padding: 12px 24px; border-radius: 8px; font-size: 14px; display: none; z-index: 999; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .toast.show { display: block; animation: fadeInOut 2s ease; }
    @keyframes fadeInOut { 0% { opacity: 0; transform: translateY(10px); } 10% { opacity: 1; transform: translateY(0); } 80% { opacity: 1; } 100% { opacity: 0; } }
  </style>
</head>
<body>

<div class="sidebar" id="sidebar">
  <h2>OpenHR Tutorials (25)</h2>
</div>

<div class="main" id="main">
  <div style="background:#fffbeb; border:1px solid #f59e0b; border-radius:8px; padding:16px; margin-bottom:24px; font-size:14px;">
    <strong>How to use:</strong> Click <strong>"Copy Content HTML"</strong> on any tutorial, then paste into the SuperAdmin rich text editor. All internal links (<code>/how-to-use/...</code> and <code>/features/...</code>) will be preserved correctly.
  </div>
</div>

<div class="toast" id="toast">Content HTML copied to clipboard!</div>

<script>
const TUTORIALS = ${jsonData};

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  let currentCat = '';
  TUTORIALS.forEach((t, i) => {
    if (t.category !== currentCat) {
      currentCat = t.category;
      const catEl = document.createElement('div');
      catEl.className = 'cat-label';
      catEl.textContent = currentCat;
      sidebar.appendChild(catEl);
    }
    const a = document.createElement('a');
    a.href = '#tutorial-' + i;
    a.textContent = t.title;
    sidebar.appendChild(a);
  });
}

function renderTutorials() {
  const main = document.getElementById('main');
  TUTORIALS.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'tutorial-card';
    card.id = 'tutorial-' + i;

    const contentHtml = marked.parse(t.content);

    card.innerHTML =
      '<div class="meta">' +
        '<span>' + t.category + '</span>' +
        '<span class="slug">' + t.slug + '</span>' +
        '<span>Order: ' + t.displayOrder + '</span>' +
        (t.parent ? '<span>Parent: ' + t.parent + '</span>' : '') +
      '</div>' +
      '<h2>' + t.title + '</h2>' +
      '<p class="excerpt">' + t.excerpt + '</p>' +
      '<div class="btn-row">' +
        '<button class="btn btn-copy" onclick="copyContentHtml(' + i + ', this)">Copy Content HTML</button>' +
      '</div>' +
      '<div class="content-html" id="content-' + i + '">' + contentHtml + '</div>';

    main.appendChild(card);
  });
}

function copyContentHtml(index, btn) {
  var el = document.getElementById('content-' + index);
  var html = el.innerHTML;

  // Copy as rich text (HTML) so it pastes correctly into the rich text editor
  var blob = new Blob([html], { type: 'text/html' });
  var plainBlob = new Blob([html], { type: 'text/plain' });
  var item = new ClipboardItem({
    'text/html': blob,
    'text/plain': plainBlob
  });
  navigator.clipboard.write([item]).then(function() {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    showToast();
    setTimeout(function() {
      btn.textContent = 'Copy Content HTML';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(function() {
    // Fallback: copy as plain HTML string
    navigator.clipboard.writeText(html).then(function() {
      btn.textContent = 'Copied (plain)!';
      btn.classList.add('copied');
      showToast();
      setTimeout(function() {
        btn.textContent = 'Copy Content HTML';
        btn.classList.remove('copied');
      }, 2000);
    });
  });
}

function showToast() {
  var toast = document.getElementById('toast');
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(function() { toast.classList.remove('show'); }, 2200);
}

renderSidebar();
renderTutorials();
<\/script>

</body>
</html>`;

fs.writeFileSync(outPath, html, 'utf-8');
console.log('Written to ' + outPath);

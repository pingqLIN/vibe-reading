'use strict';

// A small, dependency-free page/range selector shared by the PDF viewer and tests.
(function () {
  function parse(spec, totalPages) {
    if (!Number.isSafeInteger(totalPages) || totalPages < 1) {
      throw new Error('請先載入有效的 PDF');
    }
    const input = String(spec ?? '').trim().replace(/[，、]/g, ',');
    if (!input) throw new Error('請輸入頁碼，例如 1,3,4 或 2-20');
    const pages = new Set();
    for (const entry of input.split(',')) {
      const match = /^\s*(\d+)\s*(?:[-–—]\s*(\d+)\s*)?$/.exec(entry);
      if (!match) throw new Error('無效的頁碼或範圍：' + (entry.trim() || '空白項目'));
      const first = Number(match[1]);
      const last = match[2] === undefined ? first : Number(match[2]);
      if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) ||
          first < 1 || last < first || last > totalPages) {
        throw new Error('頁碼必須在 1–' + totalPages + '，且範圍由小到大：' + entry.trim());
      }
      for (let page = first; page <= last; page++) pages.add(page);
    }
    return pages;
  }

  function includesParagraph(paragraph, selectedPages) {
    const parts = Array.isArray(paragraph?.parts) && paragraph.parts.length
      ? paragraph.parts : [paragraph];
    return parts.some(part => selectedPages.has(part.page));
  }

  function selectIndices(paragraphs, pageSelection) {
    return paragraphs.reduce((out, paragraph, index) => {
      if (!pageSelection || includesParagraph(paragraph, pageSelection)) out.push(index);
      return out;
    }, []);
  }

  globalThis.VibePageSelection = Object.freeze({ parse, includesParagraph, selectIndices });
})();

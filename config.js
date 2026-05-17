/**
 * ═══════════════════════════════════════════════════════
 *   TOEIC THẦY SANG — CẤU HÌNH TRUNG TÂM
 *   File: config.js (root)
 *
 *   Sửa file này khi cần:
 *   - Đổi tên web, domain
 *   - Thêm/bớt mục menu
 *   - Thay thông tin footer
 * ═══════════════════════════════════════════════════════
 */
const SITE = {

  /* ─── THÔNG TIN WEB ─── */
  name:        'TOEIC Thầy Sang',
  shortName:   'ToeicThaySang',
  tagline:     'Luyện TOEIC hiệu quả cùng Thầy Sang',
  description: 'Luyện thi TOEIC cùng Thầy Sang — Đề thi ETS chuẩn format, có giải thích chi tiết từng câu.',
  url:         'https://toeicthaysang.pages.dev',
  logo:        'assets/logo.png',                 /* ← relative từ root, nav.js tự tính */
  favicon:     'assets/favicon.png',
  ogImage:     'assets/og-image.png',             /* ← upload sau */
  themeColor:  '#1d6ff2',
  locale:      'vi_VN',
  author:      'Thầy Sang',

  /* ─── NAV LINKS ─── */
  /* Thêm mục sau: { label: '...', icon: '...', href: '...' } */
  nav: [
    { label: 'Luyện đề', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>', href: 'exams/index.html' },
  ],

  /* ─── FOOTER ─── */
  footer: {
    about:     'Luyện thi TOEIC cùng Thầy Sang — Đề thi ETS chuẩn format, có giải thích chi tiết.',
    copyright: `© ${new Date().getFullYear()} TOEIC Thầy Sang. All rights reserved.`,
  },

};

window.SITE = SITE;

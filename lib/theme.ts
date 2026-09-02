export type Theme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'vi-rieng/theme'

/**
 * Chạy trước khi paint để không nháy sai màu, và để `data-theme` trên <html>
 * luôn tồn tại — trạng thái "đang chọn" của nút Sáng/Tối vẽ bằng CSS chứ
 * không bằng state React, nên server và client render ra cùng một markup.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}
document.documentElement.dataset.theme=t;
}catch(e){document.documentElement.dataset.theme='dark';}})();`

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // chế độ riêng tư chặn localStorage — vẫn đổi được theme trong phiên này
  }
}

export const SIDEBAR_MIN_WIDTH = 220;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_DEFAULT_WIDTH = 260;
export const SIDEBAR_WIDTH_VAR = "--sidebar-width";
export const SIDEBAR_WIDTH_STORAGE_KEY = "client_engine_sidebar_width";

export function clampSidebarWidth(width: number): number {
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width));
}

export const SIDEBAR_WIDTH_SCRIPT = `
(function(){
  try {
    var saved = localStorage.getItem("${SIDEBAR_WIDTH_STORAGE_KEY}");
    if (saved) {
      var w = parseInt(saved, 10);
      if (!isNaN(w) && w >= ${SIDEBAR_MIN_WIDTH} && w <= ${SIDEBAR_MAX_WIDTH}) {
        document.documentElement.style.setProperty("${SIDEBAR_WIDTH_VAR}", w + "px");
      }
    }
  } catch(e) {}
})();
`;

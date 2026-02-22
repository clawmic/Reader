const BASE_PATH = window.location.pathname.replace(/[^/]*$/, "");
const DATA_URL = `${BASE_PATH}comic_db.json`;
const ABOUT_URL = `${BASE_PATH}about_the_editor.txt`;
const EDITOR_PHOTO_URL = `${BASE_PATH}editor_photo.png`;
const IMAGE_ROOT = `${BASE_PATH}img/`;
const THUMB_ROOT = `${BASE_PATH}thumbnail/`;
const STORAGE_KEY = "clawmic-reader-state-v1";

const state = {
  issues: [],
  editorAbout: { ch: "", en: "" },
  lang: "en",
  librarySort: "desc",
  issueId: null,
  page: 0,
  zoom: 1,
  panX: 0,
  panY: 0
};

const app = document.getElementById("app");
const languageSelect = document.getElementById("languageSelect");
const aboutEditorBtn = document.getElementById("aboutEditorBtn");
const brandTitleEn = document.getElementById("brandTitleEn");
const brandTitleCh = document.getElementById("brandTitleCh");

function updateBrandTitle() {
  const isChinese = state.lang === "ch";
  brandTitleEn.hidden = isChinese;
  brandTitleCh.hidden = !isChinese;
}

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.lang === "en" || saved.lang === "ch") state.lang = saved.lang;
    if (saved.librarySort === "asc" || saved.librarySort === "desc") state.librarySort = saved.librarySort;
    if (Number.isInteger(saved.issueId)) state.issueId = saved.issueId;
    if (Number.isInteger(saved.page)) state.page = saved.page;
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    lang: state.lang,
    librarySort: state.librarySort,
    issueId: state.issueId,
    page: state.page
  }));
}

function getIssueById(id) {
  return state.issues.find((issue) => issue.issue_id === id) || null;
}

function getNextIssue(issueId) {
  if (!state.issues.length) return null;
  const currentIndex = state.issues.findIndex((issue) => issue.issue_id === issueId);
  if (currentIndex < 0) return state.issues[0];
  return state.issues[(currentIndex + 1) % state.issues.length];
}

function getTitle(issue) {
  return state.lang === "ch" ? issue.title_ch : issue.title_en;
}

function getDescription(issue) {
  return state.lang === "ch" ? issue.text_ch : issue.text_en;
}

function getStartHint() {
  return state.lang === "ch" ? "按下 Start 開始閱讀。" : "Press Start to begin reading.";
}

function getAboutTitle() {
  return state.lang === "ch" ? "關於編輯" : "About the Editor";
}

function getBackToLibraryLabel() {
  return state.lang === "ch" ? "← 圖書館" : "← Library";
}

function getAboutEditorBtnLabel() {
  return state.lang === "ch" ? "關於編輯" : "About the Editor";
}

function getPages(issue) {
  const pages = state.lang === "ch" ? issue.comics_ch : issue.comics_en;
  return pages.map((file) => `${IMAGE_ROOT}issue${issue.issue_id}/${file}`);
}

function getTotalPages(issue) {
  return getPages(issue).length + 1;
}

function getThumb(issue) {
  const file = state.lang === "ch" ? issue.thumbnail_ch : issue.thumbnail_en;
  return `${THUMB_ROOT}${file}`;
}

function routeTo(hash) {
  if (window.location.hash !== hash) {
    window.location.hash = hash;
    return;
  }
  renderRoute();
}

function parseReaderRoute() {
  const match = window.location.hash.match(/^#\/reader\/(\d+)(?:\/(\d+))?$/);
  if (!match) return null;
  return { issueId: Number(match[1]), page: Number(match[2] || 1) - 1 };
}

function parseAboutText(rawText) {
  const parts = rawText.split(/-{6}\s*[\r\n]+English Version\s*[\r\n]+-{6}/);
  const chRaw = parts[0] || "";
  const enRaw = parts[1] || "";
  const ch = chRaw.replace(/-{6}\s*[\r\n]+Chinese Version\s*[\r\n]+-{6}/, "").trim();
  return { ch, en: enRaw.trim() };
}

function renderAbout() {
  const tpl = document.getElementById("aboutTemplate");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));
  document.getElementById("aboutTitle").textContent = getAboutTitle();
  document.getElementById("editorPhoto").src = EDITOR_PHOTO_URL;
  const aboutContent = document.getElementById("aboutContent");
  aboutContent.textContent = state.lang === "ch" ? state.editorAbout.ch : state.editorAbout.en;
  const contactLine = document.createElement("div");
  contactLine.innerHTML = `\n\nContact: <a href="mailto:satoshi@kankakuya.com">satoshi@kankakuya.com</a>`;
  aboutContent.appendChild(contactLine);
  const aboutBackBtn = document.getElementById("aboutBackBtn");
  aboutBackBtn.textContent = getBackToLibraryLabel();
  aboutBackBtn.addEventListener("click", () => routeTo("#/library"));
}

function renderLibrary() {
  const tpl = document.getElementById("libraryTemplate");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));
  const sectionTitle = app.querySelector(".section-title");
  sectionTitle.textContent = state.lang === "ch" ? "圖書館" : "Library";
  const sortBtn = document.createElement("button");
  sortBtn.type = "button";
  sortBtn.textContent = state.lang === "ch"
    ? `日期：${state.librarySort === "asc" ? "升冪" : "降冪"}`
    : `Date: ${state.librarySort === "asc" ? "Ascending" : "Descending"}`;
  sortBtn.addEventListener("click", () => {
    state.librarySort = state.librarySort === "asc" ? "desc" : "asc";
    persistState();
    renderLibrary();
  });
  sectionTitle.insertAdjacentElement("afterend", sortBtn);
  const grid = document.getElementById("libraryGrid");
  const sortedIssues = [...state.issues].sort((a, b) => {
    const result = a.date.localeCompare(b.date);
    return state.librarySort === "asc" ? result : -result;
  });

  sortedIssues.forEach((issue) => {
    const card = document.createElement("article");
    card.className = "issue-card";
    const image = `<img src="${getThumb(issue)}" alt="${getTitle(issue)}">`;
    const desc = getDescription(issue).slice(0, 120).trim() + "...";
    card.innerHTML = `
      ${image}
      <div class="issue-content">
        <h2>${getTitle(issue)}</h2>
        <div class="issue-meta">${issue.author} · ${issue.date}</div>
        <div class="issue-summary">${desc}</div>
        <div class="issue-actions">
          <button data-open="${issue.issue_id}" type="button">${state.lang === "ch" ? "閱讀" : "Read"}</button>
          <a href="${issue.url}" target="_blank" rel="noopener noreferrer">${state.lang === "ch" ? "來源" : "Source"}</a>
        </div>
      </div>
    `;
    card.querySelector("img").addEventListener("click", () => {
      routeTo(`#/reader/${issue.issue_id}/1`);
    });
    card.querySelector("button").addEventListener("click", () => {
      routeTo(`#/reader/${issue.issue_id}/1`);
    });
    grid.appendChild(card);
  });
}

function preloadAround(issue, page) {
  const pages = getPages(issue);
  const imageIndex = page - 1;
  [imageIndex - 1, imageIndex, imageIndex + 1].forEach((idx) => {
    if (idx >= 0 && idx < pages.length) {
      const img = new Image();
      img.src = pages[idx];
    }
  });
}

function clampPage(issue, page) {
  const max = getTotalPages(issue) - 1;
  return Math.max(0, Math.min(page, max));
}

function setZoom(image, stage) {
  image.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  stage.style.cursor = state.zoom > 1 ? "grab" : "default";
}

function renderReader(issue, incomingPage) {
  const tpl = document.getElementById("readerTemplate");
  app.innerHTML = "";
  app.appendChild(tpl.content.cloneNode(true));
  const pages = getPages(issue);
  state.page = clampPage(issue, incomingPage);
  state.issueId = issue.issue_id;
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  persistState();

  const image = document.getElementById("comicImage");
  const introPage = document.getElementById("introPage");
  const readerTitle = document.getElementById("readerTitle");
  const readerFigure = document.getElementById("readerFigure");
  const progress = document.getElementById("readerProgress");
  const stage = document.getElementById("readerStage");
  const zoomControls = document.getElementById("zoomControls");
  const zoomResetBtn = document.getElementById("zoomResetBtn");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const tapPrev = document.getElementById("tapPrev");
  const tapNext = document.getElementById("tapNext");
  const updateZoomLabel = () => {
    zoomResetBtn.textContent = `${Math.round(state.zoom * 100)}%`;
  };

  const updatePage = (nextPage) => {
    state.page = clampPage(issue, nextPage);
    persistState();
    readerTitle.textContent = getTitle(issue);
    const totalPages = getTotalPages(issue);
    progress.textContent = `${state.page + 1} / ${totalPages}`;
    window.location.hash = `#/reader/${issue.issue_id}/${state.page + 1}`;
    const maxPage = totalPages - 1;
    const prevTarget = state.page - 1;
    prevPageBtn.hidden = prevTarget < 0 || prevTarget > maxPage;
    nextPageBtn.hidden = false;
    if (state.page === 0) {
      stage.classList.add("is-intro");
      readerFigure.scrollTop = 0;
      readerFigure.scrollLeft = 0;
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      setZoom(image, stage);
      updateZoomLabel();
      image.hidden = true;
      introPage.hidden = false;
      zoomControls.style.visibility = "hidden";
      nextPageBtn.textContent = state.lang === "ch" ? "開始" : "Start";
      tapPrev.hidden = true;
      tapNext.hidden = true;
      introPage.innerHTML = `
        <h2>${getTitle(issue)}</h2>
        <div class="intro-meta">${issue.author} · ${issue.date}</div>
        <a class="intro-link" href="${issue.url}" target="_blank" rel="noopener noreferrer">${issue.url}</a>
        <div class="intro-hint">${getStartHint()}</div>
        <section class="intro-text">${getDescription(issue)}</section>
      `;
      return;
    }
    stage.classList.remove("is-intro");
    introPage.hidden = true;
    image.hidden = false;
    zoomControls.style.visibility = "visible";
    nextPageBtn.textContent = state.lang === "ch" ? "下一頁" : "Next";
    tapPrev.hidden = false;
    tapNext.hidden = false;
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    setZoom(image, stage);
    updateZoomLabel();
    readerFigure.scrollTop = 0;
    readerFigure.scrollLeft = 0;
    image.src = pages[state.page - 1];
    image.alt = `${getTitle(issue)} - page ${state.page}`;
    preloadAround(issue, state.page);
  };

  const prev = () => updatePage(state.page - 1);
  const next = () => {
    const lastPage = getTotalPages(issue) - 1;
    if (state.page >= lastPage) {
      const nextIssue = getNextIssue(issue.issue_id);
      if (nextIssue) {
        routeTo(`#/reader/${nextIssue.issue_id}/1`);
      }
      return;
    }
    updatePage(state.page + 1);
  };

  const backToLibraryBtn = document.getElementById("backToLibraryBtn");
  backToLibraryBtn.textContent = getBackToLibraryLabel();
  prevPageBtn.textContent = state.lang === "ch" ? "上一頁" : "Previous";
  backToLibraryBtn.addEventListener("click", () => routeTo("#/library"));
  prevPageBtn.addEventListener("click", prev);
  nextPageBtn.addEventListener("click", next);
  tapPrev.addEventListener("click", prev);
  tapNext.addEventListener("click", next);

  document.getElementById("zoomOutBtn").addEventListener("click", () => {
    state.zoom = Math.max(1, state.zoom - 0.25);
    if (state.zoom === 1) {
      state.panX = 0;
      state.panY = 0;
    }
    setZoom(image, stage);
    updateZoomLabel();
  });
  document.getElementById("zoomInBtn").addEventListener("click", () => {
    state.zoom = Math.min(3, state.zoom + 0.25);
    setZoom(image, stage);
    updateZoomLabel();
  });
  zoomResetBtn.addEventListener("click", () => {
    state.zoom = 1;
    state.panX = 0;
    state.panY = 0;
    setZoom(image, stage);
    updateZoomLabel();
  });

  let dragging = false;
  let startX = 0;
  let startY = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (state.zoom <= 1) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    state.panX += e.clientX - startX;
    state.panY += e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;
    setZoom(image, stage);
  });
  stage.addEventListener("pointerup", () => {
    dragging = false;
  });

  let touchStartX = 0;
  stage.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) prev();
    else next();
  });

  setZoom(image, stage);
  updatePage(state.page);
}

function renderRoute() {
  const readerRoute = parseReaderRoute();
  if (!window.location.hash || window.location.hash === "#") {
    routeTo("#/library");
    return;
  }
  if (window.location.hash === "#/about") {
    renderAbout();
    return;
  }
  if (readerRoute) {
    const issue = getIssueById(readerRoute.issueId);
    if (!issue) {
      routeTo("#/library");
      return;
    }
    renderReader(issue, readerRoute.page);
    return;
  }
  renderLibrary();
}

function bindGlobalControls() {
  languageSelect.value = state.lang;
  updateBrandTitle();
  aboutEditorBtn.textContent = getAboutEditorBtnLabel();
  languageSelect.addEventListener("change", () => {
    state.lang = languageSelect.value;
    persistState();
    updateBrandTitle();
    aboutEditorBtn.textContent = getAboutEditorBtnLabel();
    renderRoute();
  });
  aboutEditorBtn.addEventListener("click", () => routeTo("#/about"));
  window.addEventListener("keydown", (e) => {
    if (!window.location.hash.startsWith("#/reader/")) return;
    const readerRoute = parseReaderRoute();
    if (!readerRoute) return;
    const issue = getIssueById(readerRoute.issueId);
    if (!issue) return;
    if (e.key === "ArrowLeft") routeTo(`#/reader/${issue.issue_id}/${clampPage(issue, readerRoute.page - 1) + 1}`);
    if (e.key === "ArrowRight") {
      const lastPage = getTotalPages(issue) - 1;
      if (readerRoute.page >= lastPage) {
        const nextIssue = getNextIssue(issue.issue_id);
        if (nextIssue) routeTo(`#/reader/${nextIssue.issue_id}/1`);
        return;
      }
      routeTo(`#/reader/${issue.issue_id}/${clampPage(issue, readerRoute.page + 1) + 1}`);
    }
  });
  window.addEventListener("hashchange", renderRoute);
}

async function loadData() {
  const response = await fetch(DATA_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("comic_db.json load failed");
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Invalid comic data");
  state.issues = data;
}

async function loadAboutEditor() {
  const response = await fetch(ABOUT_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("about_the_editor.txt load failed");
  const raw = await response.text();
  state.editorAbout = parseAboutText(raw);
}

async function bootstrap() {
  loadSavedState();
  bindGlobalControls();
  try {
    await Promise.all([loadData(), loadAboutEditor()]);
    renderRoute();
  } catch (error) {
    app.textContent = "Failed to load required data.";
    console.error(error);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`${BASE_PATH}sw.js`).catch((error) => {
      console.error("SW registration failed", error);
    });
  }
}

bootstrap();

import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, Moon, Plus, Sun, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface MoodGridItem {
  id: string;
  url: string | null;
}

// ✅ HEX 유효성 체크 & 정규화 (#RGB/#RRGGBB 지원)
const normalizeHex = (raw: string) => {
  const v = raw.trim();
  const withHash = v.startsWith("#") ? v : `#${v}`;

  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) return withHash.toLowerCase();
  return null;
};

// ✅ 이미지 로드 (blob: URL도 OK)
const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// ✅ object-cover처럼 꽉 채우기
const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;

  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
};

// ✅ 라이트/다크 팔레트 (상어 무드)
const PALETTE = {
  light: {
    siteBg: "#F6F8F9",
    siteTitle: "#0F1E2E",
    siteDesc: "#5B6B7A",

    boardDefaultBg: "#F8FAFB",
    boardBorder: "rgba(15,30,46,0.10)",
    emptyFill: "rgba(15,30,46,0.035)",
    emptyStroke: "rgba(15,30,46,0.14)",
    footer: "rgba(15,30,46,0.30)",
    boardTitleDefault: "#111827",
    hint: "rgba(15,30,46,0.55)",

    // 버튼 톤 (라이트)
    btnOutlineBg: "rgba(255,255,255,0.55)",
    btnOutlineBorder: "rgba(15,30,46,0.14)",
    btnOutlineText: "#0F1E2E",

    btnGhostMuted: "rgba(15,30,46,0.55)",
    btnGhostHoverBg: "rgba(15,30,46,0.06)",

    saveBg: "#0F1E2E",
    saveText: "#F6F8F9",

    // ✅ 성공 토스트 (라이트)
    toastSuccessBg: "rgba(255,255,255,0.92)",
    toastSuccessText: "#0F1E2E",
    toastSuccessBorder: "rgba(15,30,46,0.12)",
    toastSuccessIcon: "#0F1E2E",

    // ✅ 에러 토스트 (라이트)
    toastErrorBg: "rgba(255,255,255,0.92)",
    toastErrorText: "#0F1E2E",
    toastErrorBorder: "rgba(176, 34, 34, 0.25)",
    toastErrorIcon: "#B02222",
  },
  dark: {
    siteBg: "#0B141C",
    siteTitle: "#E6EDF3",
    siteDesc: "#8FA1B3",

    boardDefaultBg: "#111E27",
    boardBorder: "rgba(230,237,243,0.10)",
    emptyFill: "rgba(230,237,243,0.06)",
    emptyStroke: "rgba(230,237,243,0.14)",
    footer: "rgba(230,237,243,0.35)",
    boardTitleDefault: "#E6EDF3",
    hint: "rgba(230,237,243,0.55)",

    // 버튼 톤 (다크)
    btnOutlineBg: "rgba(17,30,39,0.35)",
    btnOutlineBorder: "rgba(230,237,243,0.16)",
    btnOutlineText: "#E6EDF3",

    btnGhostMuted: "rgba(230,237,243,0.55)",
    btnGhostHoverBg: "rgba(230,237,243,0.10)",

    // 다크 저장 버튼: 밤바다 CTA
    saveBg: "#122332",
    saveText: "#E6EDF3",

    // ✅ 성공 토스트 (다크)
    toastSuccessBg: "rgba(17,30,39,0.92)",
    toastSuccessText: "#E6EDF3",
    toastSuccessBorder: "rgba(230,237,243,0.14)",
    toastSuccessIcon: "#E6EDF3",

    // ✅ 에러 토스트 (다크)
    toastErrorBg: "rgba(17,30,39,0.92)",
    toastErrorText: "#E6EDF3",
    toastErrorBorder: "rgba(255, 99, 99, 0.28)",
    toastErrorIcon: "#FF6363",
  },
} as const;

type ThemePref = "system" | "light" | "dark";
type Theme = "light" | "dark";

export default function Home() {
  const PAGE_TITLE = "MOODMAP";

  // ✅ 기본은 시스템 따라감, 토글하면 사용자 선택이 우선
  const [themePref, setThemePref] = useState<ThemePref>("system");
  const [systemTheme, setSystemTheme] = useState<Theme>("light");

  // ✅ 저장 이미지/파일명에 들어갈 제목(사용자 입력)
  const [boardTitle, setBoardTitle] = useState("");

  // ✅ 보드 색상: 입력값 + 적용값 분리 (사용자 커스텀 여부 추적)
  const [boardBgInput, setBoardBgInput] = useState(PALETTE.light.boardDefaultBg);
  const [boardBgColor, setBoardBgColor] = useState(PALETTE.light.boardDefaultBg);
  const [boardBgTouched, setBoardBgTouched] = useState(false);

  // ✅ 보드 제목 색상: 입력값 + 적용값 분리 (사용자 커스텀 여부 추적)
  const [titleColorInput, setTitleColorInput] = useState(PALETTE.light.boardTitleDefault);
  const [titleColor, setTitleColor] = useState(PALETTE.light.boardTitleDefault);
  const [titleColorTouched, setTitleColorTouched] = useState(false);

  // ✅ 간격/크기: 슬라이더
  const [gapPx, setGapPx] = useState(16); // 0~40
  const [cellPx, setCellPx] = useState(360); // 240~560

  // 그리드(기본 9칸)
  const [gridItems, setGridItems] = useState<MoodGridItem[]>(
    Array.from({ length: 9 }, () => ({ id: crypto.randomUUID(), url: null }))
  );

  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filledCount = useMemo(() => gridItems.filter((i) => !!i.url).length, [gridItems]);

  // ✅ 현재 적용 테마(시스템/사용자 선택 반영)
  const theme: Theme = useMemo(() => {
    if (themePref === "system") return systemTheme;
    return themePref;
  }, [themePref, systemTheme]);

  const palette = PALETTE[theme];

  // ✅ 시스템 다크/라이트 감지 + 로컬 설정 불러오기
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const updateSystem = () => setSystemTheme(mq?.matches ? "dark" : "light");
    updateSystem();
    mq?.addEventListener?.("change", updateSystem);

    const saved = (localStorage.getItem("moodmap-theme") as ThemePref | null) ?? "system";
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemePref(saved);
    }

    return () => mq?.removeEventListener?.("change", updateSystem);
  }, []);

  // ✅ 테마 바뀔 때, "사용자가 안 만진 값"만 기본값으로 따라가게
  useEffect(() => {
    if (!boardBgTouched) {
      const next = palette.boardDefaultBg;
      setBoardBgColor(next);
      setBoardBgInput(next);
    }
    if (!titleColorTouched) {
      const next = palette.boardTitleDefault;
      setTitleColor(next);
      setTitleColorInput(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // ✅ blob URL 메모리 누수 방지
  const revokeIfNeeded = (url: string | null) => {
    if (!url) return;
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  // ✅ 보드 색상 HEX 적용
  const applyBoardBgIfValid = (next: string) => {
    setBoardBgTouched(true);
    setBoardBgInput(next);
    const norm = normalizeHex(next);
    if (norm) setBoardBgColor(norm);
  };

  // ✅ 제목 색 HEX 적용
  const applyTitleColorIfValid = (next: string) => {
    setTitleColorTouched(true);
    setTitleColorInput(next);
    const norm = normalizeHex(next);
    if (norm) setTitleColor(norm);
  };

  // ✅ 라이트/다크 토글
  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemePref(next);
    localStorage.setItem("moodmap-theme", next);
  };

  // 이미지 업로드: 빈칸부터 채우고 남으면 칸 추가
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems = [...gridItems];
    let fileIndex = 0;

    for (let i = 0; i < newItems.length && fileIndex < files.length; i++) {
      if (newItems[i].url === null) {
        const file = files[fileIndex];
        const url = URL.createObjectURL(file);
        newItems[i].url = url;
        fileIndex++;
      }
    }

    while (fileIndex < files.length) {
      const file = files[fileIndex];
      const url = URL.createObjectURL(file);
      newItems.push({ id: crypto.randomUUID(), url });
      fileIndex++;
    }

    setGridItems(newItems);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 개별 이미지 삭제(칸은 유지, 이미지만 비우기)
  const removeImage = (id: string) => {
    setGridItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        revokeIfNeeded(item.url);
        return { ...item, url: null };
      })
    );
  };

  // 칸 추가
  const addGridSlot = () => {
    setGridItems((prev) => [...prev, { id: crypto.randomUUID(), url: null }]);
  };

  // 칸 삭제
  const removeGridSlot = (id: string) => {
    setGridItems((prev) => {
      if (prev.length <= 1) return prev;
      const removing = prev.find((x) => x.id === id);
      if (removing?.url) revokeIfNeeded(removing.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  // 드래그 앤 드롭
  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setGridItems((items) =>
          items.map((item) => {
            if (item.id !== id) return item;
            revokeIfNeeded(item.url);
            return { ...item, url };
          })
        );
      }
    }
  };

  // ✅ 저장: 캔버스 직접 합성 후 JPG 다운로드
  const exportToImage = async () => {
    try {
      setIsExporting(true);

      const date = new Date().toISOString().slice(0, 10);
      const safeTitle = (boardTitle || "moodmap")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .slice(0, 30);

      const cols = 3;
      const rows = Math.ceil(gridItems.length / cols);

      const cell = cellPx;
      const gap = gapPx;

      const pad = 56;
      const titleH = 90;
      const footerH = 50;

      const width = pad * 2 + cols * cell + (cols - 1) * gap;
      const height = pad * 2 + titleH + rows * cell + (rows - 1) * gap + footerH;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      // 배경(보드 색상)
      ctx.fillStyle = boardBgColor;
      ctx.fillRect(0, 0, width, height);

      // 제목(저장 이미지)
      const exportTitle = boardTitle || PAGE_TITLE;
      ctx.fillStyle = titleColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "48px serif";
      ctx.fillText(exportTitle, width / 2, pad + titleH / 2);

      const startY = pad + titleH;

      // 이미지 로드
      const loadedMap = new Map<string, HTMLImageElement>();
      await Promise.all(
        gridItems
          .filter((it) => !!it.url)
          .map(async (it) => {
            try {
              const img = await loadImage(it.url!);
              loadedMap.set(it.id, img);
            } catch {}
          })
      );

      // 칸 그리기
      for (let i = 0; i < gridItems.length; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;

        const x = pad + c * (cell + gap);
        const y = startY + r * (cell + gap);

        const radius = Math.max(12, Math.min(22, Math.floor(cell * 0.05)));

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + cell, y, x + cell, y + cell, radius);
        ctx.arcTo(x + cell, y + cell, x, y + cell, radius);
        ctx.arcTo(x, y + cell, x, y, radius);
        ctx.arcTo(x, y, x + cell, y, radius);
        ctx.closePath();
        ctx.clip();

        const item = gridItems[i];
        const img = loadedMap.get(item.id);

        if (img) {
          drawCover(ctx, img, x, y, cell, cell);
        } else {
          ctx.fillStyle = palette.emptyFill;
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = palette.emptyStroke;
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 6, y + 6, cell - 12, cell - 12);
        }

        ctx.restore();
      }

      // footer
      ctx.fillStyle = palette.footer;
      ctx.font = "16px serif";
      ctx.fillText("CREATED WITH MOODMAP", width / 2, height - pad / 2);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("toBlob failed");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeTitle}-${date}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // ✅ 성공 토스트: 타입별 className 부여
      toast.success("이미지로 저장되었습니다!", {
        className: "moodmap-toast moodmap-toast--success",
      });
    } catch (error) {
      console.error("Export failed:", error);

      // ✅ 에러 토스트: 타입별 className 부여
      toast.error("저장에 실패했습니다.", {
        className: "moodmap-toast moodmap-toast--error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="min-h-screen font-sans selection:bg-primary/20 moodmap-root"
      style={{
        backgroundColor: palette.siteBg,
        color: palette.siteTitle,

        // ✅ CSS 변수로 hover/토스트 제어
        ["--ghost-hover-bg" as any]: palette.btnGhostHoverBg,

        // ✅ 성공 토스트 변수
        ["--toast-success-bg" as any]: palette.toastSuccessBg,
        ["--toast-success-text" as any]: palette.toastSuccessText,
        ["--toast-success-border" as any]: palette.toastSuccessBorder,
        ["--toast-success-icon" as any]: palette.toastSuccessIcon,

        // ✅ 에러 토스트 변수
        ["--toast-error-bg" as any]: palette.toastErrorBg,
        ["--toast-error-text" as any]: palette.toastErrorText,
        ["--toast-error-border" as any]: palette.toastErrorBorder,
        ["--toast-error-icon" as any]: palette.toastErrorIcon,
      }}
    >
      {/* ✅ 토스트(sonner) 스타일: 성공/에러 분리 + 아이콘 컬러까지 */}
      <style>{`
        /* 공통 토스트 베이스 */
        .moodmap-root [data-sonner-toast].moodmap-toast{
          box-shadow: 0 12px 30px -16px rgba(0,0,0,0.35) !important;
          backdrop-filter: blur(10px);
        }

        /* ✅ 성공 토스트 */
        .moodmap-root [data-sonner-toast].moodmap-toast--success{
          background: var(--toast-success-bg) !important;
          color: var(--toast-success-text) !important;
          border: 1px solid var(--toast-success-border) !important;
        }
        .moodmap-root [data-sonner-toast].moodmap-toast--success [data-title],
        .moodmap-root [data-sonner-toast].moodmap-toast--success [data-description]{
          color: var(--toast-success-text) !important;
        }
        .moodmap-root [data-sonner-toast].moodmap-toast--success svg{
          color: var(--toast-success-icon) !important;
        }

        /* ✅ 에러 토스트 */
        .moodmap-root [data-sonner-toast].moodmap-toast--error{
          background: var(--toast-error-bg) !important;
          color: var(--toast-error-text) !important;
          border: 1px solid var(--toast-error-border) !important;
        }
        .moodmap-root [data-sonner-toast].moodmap-toast--error [data-title],
        .moodmap-root [data-sonner-toast].moodmap-toast--error [data-description]{
          color: var(--toast-error-text) !important;
        }
        .moodmap-root [data-sonner-toast].moodmap-toast--error svg{
          color: var(--toast-error-icon) !important;
        }

        /* ✅ 칸 추가하기 hover 배경 */
        .moodmap-ghost:hover{
          background: var(--ghost-hover-bg) !important;
        }
      `}</style>

      <main className="container max-w-4xl py-12 md:py-20 px-4 mx-auto flex flex-col items-center">
        {/* Header */}
        <header className="text-center mb-10 space-y-4 w-full relative">
          {/* 우측 상단 작은 토글 */}
          <button
            type="button"
            onClick={toggleTheme}
            className="absolute right-0 top-0 flex items-center gap-2 text-xs"
            style={{ color: palette.siteDesc }}
            aria-label="라이트/다크 전환"
            title="라이트/다크 전환"
          >
            {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="tracking-wide">{theme === "dark" ? "DARK" : "LIGHT"}</span>
          </button>

          <h1
            className="text-4xl md:text-5xl font-serif font-light tracking-tight"
            style={{ color: palette.siteTitle }}
          >
            {PAGE_TITLE}
          </h1>

          <p
            className="font-light text-lg max-w-md mx-auto leading-relaxed"
            style={{ color: palette.siteDesc }}
          >
            좋아하는 순간들을 모아 한 장의 그림으로.<br />
            MOODMAP으로 복잡함 없이, 오직 사진과 당신의 감각으로만.
          </p>

          <div className="flex flex-col items-center gap-4 pt-2">
            {/* 제목 입력 */}
            <input
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              placeholder="제목을 입력하세요 (선택)"
              className="w-full max-w-xs mx-auto rounded-full px-4 py-2 text-center border outline-none"
              style={{
                borderColor: palette.btnOutlineBorder,
                backgroundColor: palette.btnOutlineBg,
                color: palette.siteTitle,
              }}
            />

            {/* 보드 색상/제목 색상: 가로 */}
            <div className="flex flex-wrap items-end justify-center gap-8">
              {/* 보드 색상 */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs" style={{ color: palette.siteDesc }}>
                  보드 색상
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={boardBgColor}
                    onChange={(e) => applyBoardBgIfValid(e.target.value)}
                    className="w-10 h-10 p-0 border-0 bg-transparent cursor-pointer"
                    aria-label="보드 색상 선택"
                    title="보드 색상 선택"
                  />
                  <input
                    value={boardBgInput}
                    onChange={(e) => applyBoardBgIfValid(e.target.value)}
                    placeholder={palette.boardDefaultBg}
                    className="w-36 rounded-full px-3 py-2 text-center border outline-none"
                    style={{
                      borderColor: palette.btnOutlineBorder,
                      backgroundColor: palette.btnOutlineBg,
                      color: palette.siteTitle,
                    }}
                  />
                </div>
                {boardBgInput.trim() && !normalizeHex(boardBgInput) ? (
                  <div className="text-xs" style={{ color: palette.hint }}>
                    HEX 형식으로 입력해줘 (예: {palette.boardDefaultBg})
                  </div>
                ) : null}
              </div>

              {/* 제목 색상 */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs" style={{ color: palette.siteDesc }}>
                  제목 색상
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={titleColor}
                    onChange={(e) => applyTitleColorIfValid(e.target.value)}
                    className="w-10 h-10 p-0 border-0 bg-transparent cursor-pointer"
                    aria-label="제목 색상 선택"
                    title="제목 색상 선택"
                  />
                  <input
                    value={titleColorInput}
                    onChange={(e) => applyTitleColorIfValid(e.target.value)}
                    placeholder={palette.boardTitleDefault}
                    className="w-36 rounded-full px-3 py-2 text-center border outline-none"
                    style={{
                      borderColor: palette.btnOutlineBorder,
                      backgroundColor: palette.btnOutlineBg,
                      color: palette.siteTitle,
                    }}
                  />
                </div>
                {titleColorInput.trim() && !normalizeHex(titleColorInput) ? (
                  <div className="text-xs" style={{ color: palette.hint }}>
                    HEX 형식으로 입력해줘 (예: {palette.boardTitleDefault})
                  </div>
                ) : null}
              </div>
            </div>

            {/* 간격/크기 슬라이더 */}
            <div className="w-full max-w-md flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs" style={{ color: palette.siteDesc }}>
                  <span>간격</span>
                  <span>{gapPx}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={40}
                  step={1}
                  value={gapPx}
                  onChange={(e) => setGapPx(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs" style={{ color: palette.siteDesc }}>
                  <span>크기</span>
                  <span>{cellPx}px</span>
                </div>
                <input
                  type="range"
                  min={240}
                  max={560}
                  step={1}
                  value={cellPx}
                  onChange={(e) => setCellPx(parseInt(e.target.value, 10))}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4 justify-center mb-3">
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" multiple accept="image/*" />

          {/* 사진 가져오기 */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-12 shadow-sm"
            style={{
              backgroundColor: palette.btnOutlineBg,
              borderColor: palette.btnOutlineBorder,
              color: palette.btnOutlineText,
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            사진 가져오기
          </Button>

          {/* 칸 추가하기 */}
          <Button
            onClick={addGridSlot}
            variant="ghost"
            size="lg"
            className="rounded-full px-6 h-12 moodmap-ghost"
            style={{
              color: palette.btnGhostMuted,
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            칸 추가하기
          </Button>
        </div>

        {/* 채운 사진 */}
        <div className="mb-6 text-xs" style={{ color: palette.siteDesc }}>
          채운 사진: {filledCount} / {gridItems.length}
        </div>

        {/* 보드 */}
        <div
          className="w-full p-4 md:p-8 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] mb-24 border"
          style={{
            backgroundColor: boardBgColor,
            borderColor: palette.boardBorder,
          }}
        >
          {boardTitle ? (
            <div className="text-center mb-6">
              <div className="text-2xl md:text-3xl font-serif font-light tracking-tight" style={{ color: titleColor }}>
                {boardTitle}
              </div>
            </div>
          ) : (
            <div className="mb-6" />
          )}

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: `${gapPx}px` }}>
            {gridItems.map((item) => {
              const isEmpty = !item.url;

              return (
                <div
                  key={item.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, item.id)}
                  className="relative group rounded-lg overflow-hidden transition-all duration-500 ease-out"
                  style={{
                    aspectRatio: "1 / 1",
                    backgroundColor: isEmpty ? palette.emptyFill : "transparent",
                    border: isEmpty ? `2px dashed ${palette.emptyStroke}` : "none",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => removeGridSlot(item.id)}
                    className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="칸 삭제"
                    title="칸 삭제"
                  >
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full border shadow-sm"
                      style={{
                        backgroundColor: palette.btnOutlineBg,
                        borderColor: palette.btnOutlineBorder,
                      }}
                    >
                      <X className="w-4 h-4" style={{ color: palette.siteDesc }} />
                    </span>
                  </button>

                  {item.url ? (
                    <>
                      <img
                        src={item.url}
                        alt="Mood"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="rounded-full w-10 h-10 shadow-lg scale-90 hover:scale-100 transition-transform"
                          onClick={() => removeImage(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ color: palette.hint }}
                    >
                      <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-sm font-light">Drop or Click</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8 text-xs font-serif tracking-widest uppercase" style={{ color: palette.footer }}>
            Created with MoodMap
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none z-50">
          <Button
            onClick={exportToImage}
            disabled={isExporting}
            size="lg"
            className="pointer-events-auto rounded-full px-8 h-14 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-70 text-base font-medium"
            style={{
              backgroundColor: palette.saveBg,
              color: palette.saveText,
              border: `1px solid ${palette.btnOutlineBorder}`,
            }}
          >
            {isExporting ? (
              <span className="animate-pulse">저장 중...</span>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                한 장으로 저장하기 (JPG)
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}

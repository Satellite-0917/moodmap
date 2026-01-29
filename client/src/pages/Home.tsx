import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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

export default function Home() {
  const PAGE_TITLE = "MOODMAP";

  // ✅ 저장 이미지/파일명에 들어갈 제목(사용자 입력)
  const [boardTitle, setBoardTitle] = useState("");

  // ✅ 보드 색상: 입력값 + 적용값 분리
  const [boardBgInput, setBoardBgInput] = useState("#fafaf9");
  const [boardBgColor, setBoardBgColor] = useState("#fafaf9");

  // ✅ 제목 색상: 입력값 + 적용값 분리
  const [titleColorInput, setTitleColorInput] = useState("#111827");
  const [titleColor, setTitleColor] = useState("#111827");

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

  // ✅ blob URL 메모리 누수 방지
  const revokeIfNeeded = (url: string | null) => {
    if (!url) return;
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  // ✅ 보드 색상 HEX 적용
  const applyBoardBgIfValid = (next: string) => {
    setBoardBgInput(next);
    const norm = normalizeHex(next);
    if (norm) setBoardBgColor(norm);
  };

  // ✅ 제목 색 HEX 적용
  const applyTitleColorIfValid = (next: string) => {
    setTitleColorInput(next);
    const norm = normalizeHex(next);
    if (norm) setTitleColor(norm);
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

    // input 초기화(같은 파일 재선택 가능)
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

      // 파일명(입력 없으면 moodmap)
      const safeTitle = (boardTitle || "moodmap")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .slice(0, 30);

      const cols = 3;
      const rows = Math.ceil(gridItems.length / cols);

      // 출력 크기(슬라이더 반영)
      const cell = cellPx;
      const gap = gapPx;

      // 바깥 여백/타이틀/푸터
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

      // 저장 이미지 제목
      const exportTitle = boardTitle || PAGE_TITLE;

      // 제목 색상
      ctx.fillStyle = titleColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "48px serif";
      ctx.fillText(exportTitle, width / 2, pad + titleH / 2);

      const startY = pad + titleH;

      // 이미지 로드(있는 것만)
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

        // 라운드 클립(크기에 맞춰 적당히)
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
          ctx.fillStyle = "rgba(0,0,0,0.04)";
          ctx.fillRect(x, y, cell, cell);
          ctx.strokeStyle = "rgba(0,0,0,0.12)";
          ctx.lineWidth = 3;
          ctx.strokeRect(x + 6, y + 6, cell - 12, cell - 12);
        }

        ctx.restore();
      }

      // footer
      ctx.fillStyle = "rgba(17,24,39,0.35)";
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

      toast.success("이미지로 저장되었습니다!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen text-foreground font-sans selection:bg-primary/20 bg-background">
      <main className="container max-w-4xl py-12 md:py-20 px-4 mx-auto flex flex-col items-center">
        {/* Header */}
        <header className="text-center mb-10 space-y-4 w-full">
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-foreground/90">
            {PAGE_TITLE}
          </h1>

          <p className="text-muted-foreground font-light text-lg max-w-md mx-auto leading-relaxed">
            좋아하는 순간들을 모아 한 장의 그림으로.<br />
            MOODMAP으로 복잡함 없이, 오직 사진과 당신의 감각으로만.
          </p>

          <div className="flex flex-col items-center gap-4 pt-2">
            {/* 제목 입력 */}
            <input
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              placeholder="제목을 입력하세요 (선택)"
              className="w-full max-w-xs mx-auto rounded-full px-4 py-2 text-center border border-border/50 bg-background/70 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* 보드 색상/제목 색상: 가로 */}
            <div className="flex flex-wrap items-end justify-center gap-8">
              {/* 보드 색상 */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs text-muted-foreground/70">보드 색상</div>
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
                    placeholder="#fafaf9"
                    className="w-36 rounded-full px-3 py-2 text-center border border-border/50 bg-background/70 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {boardBgInput.trim() && !normalizeHex(boardBgInput) ? (
                  <div className="text-xs text-muted-foreground/60">
                    HEX 형식으로 입력해줘 (예: #fafaf9 또는 fafaf9)
                  </div>
                ) : null}
              </div>

              {/* 제목 색상 */}
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs text-muted-foreground/70">제목 색상</div>
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
                    placeholder="#111827"
                    className="w-36 rounded-full px-3 py-2 text-center border border-border/50 bg-background/70 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                {titleColorInput.trim() && !normalizeHex(titleColorInput) ? (
                  <div className="text-xs text-muted-foreground/60">
                    HEX 형식으로 입력해줘 (예: #111827 또는 111827)
                  </div>
                ) : null}
              </div>
            </div>

            {/* ✅ 간격/크기 슬라이더 */}
            <div className="w-full max-w-md flex flex-col gap-4 pt-2">
              {/* 간격 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground/70">
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
                  aria-label="간격 조절"
                />
              </div>

              {/* 크기 */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground/70">
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
                  aria-label="사진 크기 조절"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4 justify-center mb-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            multiple
            accept="image/*"
          />

          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-12 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Upload className="w-4 h-4 mr-2" />
            사진 가져오기
          </Button>

          <Button
            onClick={addGridSlot}
            variant="ghost"
            size="lg"
            className="rounded-full px-6 h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            칸 추가하기
          </Button>
        </div>

        {/* ✅ 채운 사진: Action Bar 아래 / 보드 위 */}
        <div className="mb-6 text-xs text-muted-foreground/70">
          채운 사진: {filledCount} / {gridItems.length}
        </div>

        {/* 보드 */}
        <div
          className="w-full p-4 md:p-8 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] mb-24 border"
          style={{
            backgroundColor: boardBgColor,
            borderColor: "rgba(0,0,0,0.06)",
          }}
        >
          {boardTitle ? (
            <div className="text-center mb-6">
              <div
                className="text-2xl md:text-3xl font-serif font-light tracking-tight"
                style={{ color: titleColor }}
              >
                {boardTitle}
              </div>
            </div>
          ) : (
            <div className="mb-6" />
          )}

          <div
            className="grid grid-cols-1 md:grid-cols-3"
            style={{ gap: `${gapPx}px` }}
          >
            {gridItems.map((item) => (
              <div
                key={item.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`relative group rounded-lg overflow-hidden transition-all duration-500 ease-out
                  ${
                    item.url
                      ? "bg-transparent shadow-sm"
                      : "bg-secondary/30 border-2 border-dashed border-muted-foreground/10 hover:border-primary/30 hover:bg-secondary/50"
                  }`}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                }}
              >
                <button
                  type="button"
                  onClick={() => removeGridSlot(item.id)}
                  className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="칸 삭제"
                  title="칸 삭제"
                >
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-background/80 border border-border/40 shadow-sm hover:bg-background">
                    <X className="w-4 h-4 text-muted-foreground" />
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
                    className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/40 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    <span className="text-sm font-light">Drop or Click</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8 text-xs text-muted-foreground/30 font-serif tracking-widest uppercase">
            Created with MoodMap
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none z-50">
          <Button
            onClick={exportToImage}
            disabled={isExporting}
            size="lg"
            className="pointer-events-auto rounded-full px-8 h-14 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] bg-foreground text-background hover:bg-foreground/90 transition-all duration-500 hover:scale-105 active:scale-95 disabled:opacity-70 text-base font-medium"
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

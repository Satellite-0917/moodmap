import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import {
  Download,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Minus,
  RotateCcw,
  Palette,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface MoodGridItem {
  id: string;
  url: string | null;
}

function safeFileName(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "moodmap";
  return trimmed
    .replace(/[\\/:*?"<>|]/g, "") // 윈도우 금지 문자 제거
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export default function Home() {
  /** 페이지 표시용 타이틀(큰 제목) */
  const [pageTitle, setPageTitle] = useState("MOODMAP");

  /** 저장용 제목(이미지에 찍히고 파일명에도 쓰임) */
  const [exportTitle, setExportTitle] = useState("내 무드맵");

  /** 배경색 */
  const [bgColor, setBgColor] = useState("#fafaf9"); // warm white

  /** 기본 9칸 */
  const initialGrid = useMemo<MoodGridItem[]>(
    () => Array.from({ length: 9 }, () => ({ id: crypto.randomUUID(), url: null })),
    []
  );

  const [gridItems, setGridItems] = useState<MoodGridItem[]>(initialGrid);
  const [isExporting, setIsExporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 저장 대상(제목 포함한 카드 전체) */
  const exportRef = useRef<HTMLDivElement>(null);

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems = [...gridItems];
    let fileIndex = 0;

    // 빈 슬롯 찾아서 채우기
    for (let i = 0; i < newItems.length && fileIndex < files.length; i++) {
      if (newItems[i].url === null) {
        const file = files[fileIndex];
        const url = URL.createObjectURL(file);
        newItems[i].url = url;
        fileIndex++;
      }
    }

    // 빈 슬롯보다 파일이 더 많으면 추가
    while (fileIndex < files.length) {
      const file = files[fileIndex];
      const url = URL.createObjectURL(file);
      newItems.push({ id: crypto.randomUUID(), url });
      fileIndex++;
    }

    setGridItems(newItems);

    // input 초기화
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 개별 이미지 삭제
  const removeImage = (id: string) => {
    setGridItems((items) =>
      items.map((item) => (item.id === id ? { ...item, url: null } : item))
    );
  };

  // 그리드 추가
  const addGridSlot = () => {
    setGridItems((prev) => [...prev, { id: crypto.randomUUID(), url: null }]);
  };

  // 그리드 마지막 칸 삭제(안전하게)
  const removeLastGridSlot = () => {
    if (gridItems.length <= 1) return;
    setGridItems((prev) => prev.slice(0, -1));
  };

  // 9칸으로 초기화
  const resetToNine = () => {
    setGridItems(Array.from({ length: 9 }, () => ({ id: crypto.randomUUID(), url: null })));
    toast.success("9칸으로 초기화했습니다.");
  };

  // 드래그 앤 드롭
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setGridItems((items) => items.map((item) => (item.id === id ? { ...item, url } : item)));
      }
    }
  };

  // 이미지로 저장
  const exportToImage = async () => {
    if (!exportRef.current) return;

    try {
      setIsExporting(true);

      // 폰트/레이아웃 안정화용 한 박자
      await new Promise((r) => setTimeout(r, 50));

      // html2canvas가 스크롤 위치 영향을 받는 경우가 있어서 보정
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        backgroundColor: bgColor,
        useCORS: true,
        logging: false,
        scrollX: -scrollX,
        scrollY: -scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });

      const image = canvas.toDataURL("image/png");

      const a = document.createElement("a");
      a.href = image;

      const date = new Date().toISOString().slice(0, 10);
      a.download = `${safeFileName(exportTitle)}-${date}.png`;

      // iOS/Safari 등에서 click이 가끔 무시되는 케이스 방지
      document.body.appendChild(a);
      a.click();
      a.remove();

      toast.success("이미지로 저장되었습니다!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <main className="container max-w-4xl py-12 md:py-20 px-4 mx-auto flex flex-col items-center">
        {/* Header Section */}
        <header className="text-center mb-10 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-foreground/90">
            {pageTitle}
          </h1>

          <p className="text-muted-foreground font-light text-lg max-w-md mx-auto leading-relaxed">
            내가 좋아한 장면을 모아 나만의 무드 지도를 만드세요.<br />
            MOODMAP은 당신의 순간과 취향을 지도처럼 저장합니다.
          </p>

          {/* 제목/설정 영역 (기존 감성 유지하면서 추가) */}
          <div className="mt-6 flex flex-col gap-3 items-center">
            {/* 페이지 제목(화면 표시용) */}
            <input
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="페이지 제목"
              className="w-full max-w-sm rounded-full px-4 py-2 text-center border border-border/50 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* 저장용 제목 */}
            <input
              value={exportTitle}
              onChange={(e) => setExportTitle(e.target.value)}
              placeholder="저장할 이미지 제목 (파일명/이미지 상단)"
              className="w-full max-w-sm rounded-full px-4 py-2 text-center border border-border/50 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* 배경색 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Palette className="w-4 h-4" />
              <span>배경색</span>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-8 w-10 rounded-md border border-border/40 bg-transparent"
                aria-label="배경색 선택"
              />
              <span className="font-mono text-xs opacity-70">{bgColor}</span>
            </div>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-3 justify-center mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
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
            칸 추가
          </Button>

          <Button
            onClick={removeLastGridSlot}
            variant="ghost"
            size="lg"
            className="rounded-full px-6 h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300"
            disabled={gridItems.length <= 1}
          >
            <Minus className="w-4 h-4 mr-2" />
            칸 삭제
          </Button>

          <Button
            onClick={resetToNine}
            variant="ghost"
            size="lg"
            className="rounded-full px-6 h-12 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-300"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            9칸 초기화
          </Button>
        </div>

        {/* Export Area (이 영역이 그대로 이미지가 됨) */}
        <div
          ref={exportRef}
          style={{ backgroundColor: bgColor }}
          className="w-full bg-card p-4 md:p-8 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] mb-24 border border-border/40"
        >
          {/* 저장 이미지 상단 제목 */}
          <div className="text-center mb-6">
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground/50 font-serif">
              {pageTitle}
            </div>
            <div className="mt-2 text-2xl md:text-3xl font-serif font-light text-foreground/80">
              {exportTitle.trim() ? exportTitle : " "}
            </div>
          </div>

          {/* Mood Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gridItems.map((item) => (
              <div
                key={item.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`aspect-square relative group rounded-lg overflow-hidden transition-all duration-500 ease-out
                  ${
                    item.url
                      ? "bg-transparent shadow-sm"
                      : "bg-secondary/30 border-2 border-dashed border-muted-foreground/10 hover:border-primary/30 hover:bg-secondary/50"
                  }`}
              >
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
                        aria-label="이미지 삭제"
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
                한 장으로 저장하기
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { Download, Image as ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface MoodGridItem {
  id: string;
  url: string | null;
}

const BG_PRESETS = [
  { label: "Warm White", value: "#fafaf9" },
  { label: "Ivory", value: "#fff7ed" },
  { label: "Beige", value: "#f5f5dc" },
  { label: "Light Gray", value: "#f3f4f6" },
  { label: "Black", value: "#0b0b0f" },
];

export default function Home() {
  // 제목(저장 파일명에도 반영)
  const [title, setTitle] = useState("MOODMAP");

  // 배경색 선택
  const [bgColor, setBgColor] = useState("#fafaf9");

  // 그리드(기본 9칸)
  const [gridItems, setGridItems] = useState<MoodGridItem[]>(
    Array.from({ length: 9 }, () => ({ id: crypto.randomUUID(), url: null }))
  );

  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filledCount = useMemo(
    () => gridItems.filter((i) => !!i.url).length,
    [gridItems]
  );

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
      items.map((item) => (item.id === id ? { ...item, url: null } : item))
    );
  };

  // 칸 추가
  const addGridSlot = () => {
    setGridItems((prev) => [...prev, { id: crypto.randomUUID(), url: null }]);
  };

  // ✅ 칸 삭제(추가한 칸도 줄일 수 있도록)
  const removeGridSlot = (id: string) => {
    setGridItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((x) => x.id !== id);
    });
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
        setGridItems((items) =>
          items.map((item) => (item.id === id ? { ...item, url } : item))
        );
      }
    }
  };

  // ✅ 저장: JPG로 저장(모바일 성공률↑, 용량↓)
  const exportToImage = async () => {
    if (!gridRef.current) return;

    try {
      setIsExporting(true);

      // 모바일/태블릿은 scale 낮추기(메모리 터짐 방지)
      const isMobile = window.innerWidth < 900;

      const canvas = await html2canvas(gridRef.current, {
        scale: isMobile ? 1 : 2,
        backgroundColor: bgColor, // 배경색 반영
        useCORS: true,
        logging: false,
      });

      const date = new Date().toISOString().slice(0, 10);
      const safeTitle = (title || "moodmap")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .slice(0, 30);

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
    <div
      className="min-h-screen text-foreground font-sans selection:bg-primary/20"
      style={{ backgroundColor: bgColor }}
    >
      <main className="container max-w-4xl py-12 md:py-20 px-4 mx-auto flex flex-col items-center">
        {/* Header */}
        <header className="text-center mb-10 space-y-4 w-full">
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-foreground/90">
            {title || "MOODMAP"}
          </h1>

          <p className="text-muted-foreground font-light text-lg max-w-md mx-auto leading-relaxed">
            내가 좋아한 장면을 모아 나만의 무드 지도를 만드세요.<br />
            MOODMAP은 당신의 순간과 취향을 지도처럼 저장합니다.
          </p>

          {/* 제목 입력 (페이지 + 저장 파일명에 반영) */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full max-w-xs mx-auto rounded-full px-4 py-2 text-center border border-border/50 bg-background/70 text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />

            {/* 배경색 선택 */}
            <div className="flex flex-wrap gap-2 justify-center">
              {BG_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setBgColor(p.value)}
                  className="flex items-center gap-2 rounded-full px-3 py-1 border border-border/40 bg-background/70 hover:bg-background transition"
                >
                  <span
                    className="inline-block w-4 h-4 rounded-full border border-border/40"
                    style={{ backgroundColor: p.value }}
                  />
                  <span className="text-sm text-muted-foreground">{p.label}</span>
                </button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground/70">
              채운 사진: {filledCount} / {gridItems.length}
            </div>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
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

        {/* Export 대상 영역 */}
        <div
          ref={gridRef}
          className="w-full p-4 md:p-8 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] mb-24 border"
          style={{
            backgroundColor: bgColor, // ✅ 캡처 영역 배경도 동일하게
            borderColor: "rgba(0,0,0,0.06)",
          }}
        >
          {/* ✅ 저장 이미지에 제목도 같이 들어가게 */}
          <div className="text-center mb-6">
            <div className="text-2xl md:text-3xl font-serif font-light tracking-tight">
              {title || "MOODMAP"}
            </div>
          </div>

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
                {/* ✅ 칸 삭제 버튼 (hover 시 우상단) */}
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
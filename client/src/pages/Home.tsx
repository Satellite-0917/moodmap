import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { Download, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface MoodGridItem {
  id: string;
  url: string | null;
}

export default function Home() {
  const [title, setTitle] = useState("MOODMAP");

  const [gridItems, setGridItems] = useState<MoodGridItem[]>(
    Array.from({ length: 9 }, () => ({ id: crypto.randomUUID(), url: null }))
  );
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // 이미지 업로드
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 이미지 삭제
  const removeImage = (id: string) => {
    setGridItems(items =>
      items.map(item =>
        item.id === id ? { ...item, url: null } : item
      )
    );
  };

  // 칸 추가
  const addGridSlot = () => {
    setGridItems(prev => [...prev, { id: crypto.randomUUID(), url: null }]);
  };

  // 저장
  const exportToImage = async () => {
    if (!gridRef.current) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        backgroundColor: "#fafaf9",
        useCORS: true,
        logging: false,
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `moodmap-${new Date().toISOString().slice(0, 10)}.png`;
      link.click();

      toast.success("이미지로 저장되었습니다!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

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
        setGridItems(items =>
          items.map(item =>
            item.id === id ? { ...item, url } : item
          )
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <main className="container max-w-4xl py-12 md:py-20 px-4 mx-auto flex flex-col items-center">

        {/* Header */}
        <header className="text-center mb-12 space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-foreground/90">
            {title}
          </h1>

          {/* 제목 입력 */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            className="mt-4 w-full max-w-xs mx-auto rounded-full px-4 py-2 text-center border border-border/50 bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />

          <p className="text-muted-foreground font-light text-lg max-w-md mx-auto leading-relaxed">
            내가 좋아한 장면을 모아 나만의 무드 지도를 만드세요.<br />
            MOODMAP은 당신의 순간과 취향을 지도처럼 저장합니다.
          </p>
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
            className="rounded-full px-8 h-12"
          >
            <Upload className="w-4 h-4 mr-2" />
            사진 가져오기
          </Button>

          <Button
            onClick={addGridSlot}
            variant="ghost"
            size="lg"
            className="rounded-full px-6 h-12"
          >
            <Plus className="w-4 h-4 mr-2" />
            칸 추가하기
          </Button>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          className="w-full bg-card p-4 md:p-8 rounded-xl shadow mb-12 border border-border/40"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gridItems.map((item) => (
              <div
                key={item.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`aspect-square relative group rounded-lg overflow-hidden
                  ${item.url ? "bg-transparent" : "bg-secondary/30 border-2 border-dashed"}
                `}
              >
                {item.url ? (
                  <>
                    <img
                      src={item.url}
                      alt="Mood"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Button
                        variant="destructive"
                        size="icon"
                        className="rounded-full w-10 h-10"
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
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">Drop or Click</span>
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
        <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50">
          <Button
            onClick={exportToImage}
            disabled={isExporting}
            size="lg"
            className="rounded-full px-8 h-14 bg-foreground text-background"
          >
            {isExporting ? "저장 중..." : (
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

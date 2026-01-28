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
  const [gridItems, setGridItems] = useState<MoodGridItem[]>(
    Array.from({ length: 9 }, () => ({ id: crypto.randomUUID(), url: null }))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportBg, setExportBg] = useState("#fafaf9"); // ✅ 배경색 상태

  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // 이미지 업로드 핸들러
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

  const removeImage = (id: string) => {
    setGridItems((items) =>
      items.map((item) => (item.id === id ? { ...item, url: null } : item))
    );
  };

  const addGridSlot = () => {
    setGridItems((prev) => [...prev, { id: crypto.randomUUID(), url: null }]);
  };

  // 이미지로 저장
  const exportToImage = async () => {
    if (!gridRef.current) return;

    try {
      setIsExporting(true);
      const canvas = await html2canvas(gridRef.current, {
        scale: 2,
        backgroundColor: exportBg, // ✅ 선택한 색 적용
        useCORS: true,
        logging: false,
        removeContainer: true,
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
        setGridItems((items) =>
          items.map((item) =>
            item.id === id ? { ...item, url } : item
          )
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="container max-w-4xl py-12 px-4 mx-auto flex flex-col items-center">

        <header className="text-center mb-12 space-y-4">
          <h1 className="text-4xl font-serif font-light tracking-tight">
            MOODMAP
          </h1>
<p className="text-muted-foreground text-lg">
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

          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            사진 가져오기
          </Button>

          <Button onClick={addGridSlot} variant="ghost">
            <Plus className="w-4 h-4 mr-2" />
            칸 추가하기
          </Button>

          {/* ✅ 배경색 선택 */}
          <label className="flex items-center gap-2 px-4 h-10 border rounded-full text-sm">
            배경색
            <input
              type="color"
              value={exportBg}
              onChange={(e) => setExportBg(e.target.value)}
              className="h-6 w-6 cursor-pointer"
            />
          </label>
        </div>

        {/* Mood Grid */}
        <div
          ref={gridRef}
          style={{ backgroundColor: exportBg }} // ✅ 실제 배경 반영
          className="w-full p-6 rounded-xl shadow mb-12"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gridItems.map((item) => (
              <div
                key={item.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`aspect-square relative rounded-lg overflow-hidden ${
                  item.url
                    ? "bg-transparent"
                    : "bg-secondary/30 border-2 border-dashed"
                }`}
              >
                {item.url ? (
                  <>
                    <img
                      src={item.url}
                      alt="Mood"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/20">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => removeImage(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">Drop or Click</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8 text-xs text-muted-foreground">
            Created with MoodMap
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-8 left-0 right-0 flex justify-center">
          <Button
            onClick={exportToImage}
            disabled={isExporting}
            className="rounded-full px-8 h-14"
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
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

    // 만약 빈 슬롯보다 파일이 더 많으면 추가
    while (fileIndex < files.length) {
      const file = files[fileIndex];
      const url = URL.createObjectURL(file);
      newItems.push({ id: crypto.randomUUID(), url });
      fileIndex++;
    }

    setGridItems(newItems);
    
    // input 초기화 (같은 파일 다시 선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 개별 이미지 삭제
  const removeImage = (id: string) => {
    setGridItems(items => items.map(item => 
      item.id === id ? { ...item, url: null } : item
    ));
  };

  // 그리드 추가
  const addGridSlot = () => {
    setGridItems(prev => [...prev, { id: crypto.randomUUID(), url: null }]);
  };

  // 이미지로 저장
  const exportToImage = async () => {
    if (!gridRef.current) return;
    
    try {
      setIsExporting(true);
      const canvas = await html2canvas(gridRef.current, {
        scale: 2, // 고해상도
        backgroundColor: "#fafaf9", // 배경색 유지 (warm white)
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

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setGridItems(items => items.map(item => 
          item.id === id ? { ...item, url } : item
        ));
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <main className="container max-w-4xl py-12 md:py-20 px-4 mx-auto flex flex-col items-center">
        
        {/* Header Section */}
        <header className="text-center mb-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-foreground/90">
            MOODMAP
          </h1>
          <p className="text-muted-foreground font-light text-lg max-w-md mx-auto leading-relaxed">
            좋아하는 순간들을 모아 한 장의 그림으로.<br/>
            복잡함 없이, 오직 사진과 당신의 감각으로만.
          </p>
        </header>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-4 justify-center mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
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

        {/* Mood Grid */}
        <div 
          ref={gridRef}
          className="w-full bg-card p-4 md:p-8 rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] mb-12 animate-in fade-in zoom-in-95 duration-700 delay-200 border border-border/40"
        >
          {/* Grid Title Area for Export */}
          <div className="text-center mb-8 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Export 시에만 보일 수도 있고, 항상 보일 수도 있음. 디자인상 깔끔하게 유지 */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gridItems.map((item) => (
              <div
                key={item.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item.id)}
                className={`
                  aspect-square relative group rounded-lg overflow-hidden transition-all duration-500 ease-out
                  ${item.url ? 'bg-transparent shadow-sm' : 'bg-secondary/30 border-2 border-dashed border-muted-foreground/10 hover:border-primary/30 hover:bg-secondary/50'}
                `}
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

        {/* Footer Action */}
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

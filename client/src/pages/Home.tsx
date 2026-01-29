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

// ✅ 저장 성공률을 올리기 위한 유틸(이미지 로딩/디코딩 완료 대기)
const waitForImages = async (root: HTMLElement) => {
  const imgs = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    imgs.map(async (img) => {
      // 로딩 완료까지 기다리기
      if (!img.complete) {
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej();
        });
      }

      // decode()가 있으면 디코딩까지 기다리기 (캡처 실패 줄임)
      // 일부 환경에서 decode가 reject될 수 있어 try/catch로 무시
      // @ts-ignore
      if (typeof img.decode === "function") {
        try {
          // @ts-ignore
          await img.decode();
        } catch {}
      }
    })
  );
};

// ✅ 레이아웃/렌더 안정화용(다음 프레임 대기)
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame

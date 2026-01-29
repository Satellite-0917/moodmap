import React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  // system이면 OS 설정 따라가게
  const resolvedTheme =
    theme === "system"
      ? typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const isDark = resolvedTheme === "dark";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // ✅ 모바일에서 아래 버튼(저장)과 겹치지 않게 여유를 두고,
      // ✅ PC에서는 원래대로 자연스럽게
      className="toaster group bottom-20 sm:bottom-4"
      toastOptions={{
        // ✅ 공통(배경/글자/테두리) + 모바일 레이아웃
        className:
          "bg-[var(--toast-bg)] text-[var(--toast-text)] border border-[var(--toast-border)] " +
          // 모바일 너비/여백
          "max-w-[92vw] sm:max-w-md mx-auto " +
          // 모바일 타이포
          "text-sm sm:text-base leading-relaxed",

        success: {
          className:
            "bg-[var(--toast-success-bg)] text-[var(--toast-success-text)] border border-[var(--toast-success-border)] " +
            "max-w-[92vw] sm:max-w-md mx-auto text-sm sm:text-base leading-relaxed",
          iconTheme: {
            primary: "var(--toast-success-icon)",
            secondary: "transparent",
          },
        },

        error: {
          className:
            "bg-[var(--toast-error-bg)] text-[var(--toast-error-text)] border border-[var(--toast-error-border)] " +
            "max-w-[92vw] sm:max-w-md mx-auto text-sm sm:text-base leading-relaxed",
          iconTheme: {
            primary: "var(--toast-error-icon)",
            secondary: "transparent",
          },
        },
      }}
      style={
        {
          "--toast-bg": isDark ? "rgba(17,30,39,0.92)" : "rgba(255,255,255,0.92)",
          "--toast-text": isDark ? "#E6EDF3" : "#0F1E2E",
          "--toast-border": isDark
            ? "rgba(230,237,243,0.14)"
            : "rgba(15,30,46,0.12)",

          "--toast-success-bg": isDark
            ? "rgba(17,30,39,0.92)"
            : "rgba(255,255,255,0.92)",
          "--toast-success-text": isDark ? "#E6EDF3" : "#0F1E2E",
          "--toast-success-border": isDark
            ? "rgba(88,166,255,0.35)"
            : "rgba(31,111,235,0.25)",
          "--toast-success-icon": isDark ? "#58A6FF" : "#1F6FEB",

          "--toast-error-bg": isDark
            ? "rgba(17,30,39,0.92)"
            : "rgba(255,255,255,0.92)",
          "--toast-error-text": isDark ? "#E6EDF3" : "#0F1E2E",
          "--toast-error-border": isDark
            ? "rgba(248,113,113,0.35)"
            : "rgba(220,38,38,0.25)",
          "--toast-error-icon": isDark ? "#F87171" : "#DC2626",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

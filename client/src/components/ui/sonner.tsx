import React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  // system이면 OS 설정 따라가게 (너가 이미 그렇게 쓰고 있어서 유지)
  const resolvedTheme =
    theme === "system"
      ? (typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")
      : theme;

  const isDark = resolvedTheme === "dark";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        // ✅ 공통(배경/글자/테두리) + 레이아웃
        className:
          "bg-[var(--toast-bg)] text-[var(--toast-text)] border border-[var(--toast-border)]",

        // ✅ 성공: 배경/글자도 세트로 바꾸고 싶다면 여기에서 한 번 더 지정 가능
        success: {
          className:
            "bg-[var(--toast-success-bg)] text-[var(--toast-success-text)] border-[var(--toast-success-border)]",
          iconTheme: {
            primary: "var(--toast-success-icon)",
            secondary: "transparent",
          },
        },

        // ✅ 실패
        error: {
          className:
            "bg-[var(--toast-error-bg)] text-[var(--toast-error-text)] border-[var(--toast-error-border)]",
          iconTheme: {
            primary: "var(--toast-error-icon)",
            secondary: "transparent",
          },
        },
      }}
      style={
        {
          // ✅ “기본(normal)”도 팔레트에 맞춰둠 (혹시 info 같은 게 뜰 때 대비)
          "--toast-bg": isDark ? "rgba(17,30,39,0.92)" : "rgba(255,255,255,0.92)",
          "--toast-text": isDark ? "#E6EDF3" : "#0F1E2E",
          "--toast-border": isDark ? "rgba(230,237,243,0.14)" : "rgba(15,30,46,0.12)",

          // ✅ 성공 세트
          "--toast-success-bg": isDark ? "rgba(17,30,39,0.92)" : "rgba(255,255,255,0.92)",
          "--toast-success-text": isDark ? "#E6EDF3" : "#0F1E2E",
          "--toast-success-border": isDark ? "rgba(88,166,255,0.35)" : "rgba(31,111,235,0.25)",
          "--toast-success-icon": isDark ? "#58A6FF" : "#1F6FEB",

          // ✅ 에러 세트
          "--toast-error-bg": isDark ? "rgba(17,30,39,0.92)" : "rgba(255,255,255,0.92)",
          "--toast-error-text": isDark ? "#E6EDF3" : "#0F1E2E",
          "--toast-error-border": isDark ? "rgba(248,113,113,0.35)" : "rgba(220,38,38,0.25)",
          "--toast-error-icon": isDark ? "#F87171" : "#DC2626",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

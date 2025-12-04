"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop - fixed full screen */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 9998,
        }}
        onClick={() => onOpenChange(false)}
      />
      {/* Modal container - fixed centered */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "90%",
          maxWidth: "700px",
          maxHeight: "85vh",
        }}
      >
        {children}
      </div>
    </>
  );
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export function DialogContent({ children, className, onClose }: DialogContentProps) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "85vh",
        overflow: "hidden",
      }}
      className={className}
    >
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            right: "16px",
            top: "16px",
            padding: "4px",
            borderRadius: "4px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            zIndex: 10,
          }}
          className="hover:bg-gray-100"
        >
          <X style={{ width: "20px", height: "20px" }} />
        </button>
      )}
      {children}
    </div>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: "20px 24px 16px 24px",
        borderBottom: "1px solid #e5e7eb",
        flexShrink: 0,
      }}
      className={className}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      style={{
        fontSize: "18px",
        fontWeight: 600,
        margin: 0,
        paddingRight: "32px",
      }}
      className={className}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      style={{
        fontSize: "14px",
        color: "#6b7280",
        margin: "4px 0 0 0",
      }}
      className={className}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        minHeight: 0,
      }}
      className={className}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
        padding: "16px 24px",
        borderTop: "1px solid #e5e7eb",
        backgroundColor: "#f9fafb",
        flexShrink: 0,
      }}
      className={className}
      {...props}
    />
  );
}

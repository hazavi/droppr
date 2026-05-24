"use client"

import React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ArrowUp, Link2, X, Loader2, Globe } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// ─── Utils ────────────────────────────────────────────────────────────────────

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ")

// ─── Tooltip ─────────────────────────────────────────────────────────────────

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-lg border border-white/10 bg-black/80 px-3 py-1.5 text-xs text-white shadow-md backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// ─── Dialog ──────────────────────────────────────────────────────────────────

const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-full max-w-[90vw] md:max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#111] p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-1.5 text-white/60 hover:bg-white/20 hover:text-white transition-all">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

// ─── Context ──────────────────────────────────────────────────────────────────

interface PromptCtx {
  isLoading: boolean
  value: string
  setValue: (v: string) => void
  maxHeight: number | string
  onSubmit?: () => void
  disabled?: boolean
}

const PromptCtx = React.createContext<PromptCtx>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 200,
})

function usePromptCtx() {
  return React.useContext(PromptCtx)
}

// ─── Internal sub-components ─────────────────────────────────────────────────

interface PromptInputProps {
  isLoading?: boolean
  value?: string
  onValueChange?: (v: string) => void
  maxHeight?: number | string
  onSubmit?: () => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ className, isLoading = false, maxHeight = 200, value, onValueChange, onSubmit, disabled = false, children }, ref) => {
    const [internal, setInternal] = React.useState(value ?? "")
    return (
      <TooltipProvider>
        <PromptCtx.Provider value={{
          isLoading,
          value: value ?? internal,
          setValue: onValueChange ?? setInternal,
          maxHeight,
          onSubmit,
          disabled,
        }}>
          <div
            ref={ref}
            className={cn(
              "rounded-3xl border border-slate-200/80 bg-white/80 p-2 shadow-sm backdrop-blur-xl transition-all duration-300",
              isLoading && "border-indigo-300",
              className
            )}
          >
            {children}
          </div>
        </PromptCtx.Provider>
      </TooltipProvider>
    )
  }
)
PromptInput.displayName = "PromptInput"

const PromptTextarea: React.FC<{ placeholder?: string; className?: string }> = ({ placeholder, className }) => {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptCtx()
  const ref = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = "auto"
    ref.current.style.height =
      typeof maxHeight === "number"
        ? `${Math.min(ref.current.scrollHeight, maxHeight)}px`
        : `min(${ref.current.scrollHeight}px, ${maxHeight})`
  }, [value, maxHeight])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit?.() }
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "w-full resize-none bg-transparent px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-50",
        className
      )}
    />
  )
}

const PromptActions: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("flex items-center gap-2", className)}>{children}</div>
)

interface PromptActionProps {
  tooltip: React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
}
const PromptAction: React.FC<PromptActionProps> = ({ tooltip, children, side = "top" }) => {
  const { disabled } = usePromptCtx()
  return (
    <Tooltip>
      <TooltipTrigger asChild disabled={disabled}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface PromptBoxSubmitPayload {
  url: string
}

export interface PromptInputBoxProps {
  onSubmit: (payload: PromptBoxSubmitPayload) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

export const PromptInputBox = React.forwardRef<HTMLDivElement, PromptInputBoxProps>(
  ({ onSubmit, isLoading = false, placeholder, className }, ref) => {
    const [url, setUrl] = React.useState("")
    const hasContent = url.trim().length > 0

    function handleSubmit() {
      const trimmed = url.trim()
      if (!trimmed) return
      onSubmit({ url: trimmed })
    }

    return (
      <PromptInput
        ref={ref}
        value={url}
        onValueChange={setUrl}
        isLoading={isLoading}
        onSubmit={handleSubmit}
        disabled={isLoading}
        className={className}
      >
        <PromptTextarea
          placeholder={placeholder ?? "Paste a product URL to track its price…"}
        />

        <PromptActions className="justify-between px-1 pt-1">
          {/* Left: hint icon */}
          <div className="flex items-center gap-2 text-slate-400">
            <Link2 className="h-4 w-4" />
            <span className="text-xs">Paste any product link</span>
          </div>

          {/* Right: submit */}
          <PromptAction tooltip={isLoading ? "Fetching…" : hasContent ? "Track price" : "Enter a URL"}>
            <button
              onClick={handleSubmit}
              disabled={!hasContent || isLoading}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200",
                hasContent && !isLoading
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              )}
            >
              {isLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowUp className="h-4 w-4" />
              }
            </button>
          </PromptAction>
        </PromptActions>
      </PromptInput>
    )
  }
)
PromptInputBox.displayName = "PromptInputBox"

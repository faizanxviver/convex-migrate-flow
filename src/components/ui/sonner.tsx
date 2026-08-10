import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/hooks/use-hope"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group-[.toaster]:!rounded-2xl group-[.toaster]:!font-sans",
          description:
            "group-[.toaster]:!text-xs group-[.toaster]:!text-muted-foreground",
          actionButton:
            "group-[.toaster]:!rounded-xl group-[.toaster]:!bg-primary group-[.toaster]:!text-primary-foreground group-[.toaster]:!font-semibold",
          cancelButton:
            "group-[.toaster]:!rounded-xl group-[.toaster]:!bg-muted group-[.toaster]:!text-muted-foreground",
          closeButton:
            "group-[.toaster]:!rounded-full group-[.toaster]:!border group-[.toaster]:!border-border/70 group-[.toaster]:!bg-card/80 group-[.toaster]:!text-muted-foreground",
        },
      }}
      style={
        {
          "--width": "360px",
          "--border-radius": "1.25rem",
          "--normal-bg": "color-mix(in oklab, var(--card) 88%, transparent)",
          "--normal-bg-hover": "color-mix(in oklab, var(--card) 95%, transparent)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--glass-border)",
          "--normal-border-hover": "var(--glass-border)",
          "--success-bg": "color-mix(in oklab, var(--success) 13%, transparent)",
          "--success-text": "var(--foreground)",
          "--success-border": "color-mix(in oklab, var(--success) 45%, transparent)",
          "--error-bg": "color-mix(in oklab, var(--destructive) 13%, transparent)",
          "--error-text": "var(--foreground)",
          "--error-border": "color-mix(in oklab, var(--destructive) 45%, transparent)",
          "--info-bg": "color-mix(in oklab, var(--primary) 13%, transparent)",
          "--info-text": "var(--foreground)",
          "--info-border": "color-mix(in oklab, var(--primary) 45%, transparent)",
          "--warning-bg": "color-mix(in oklab, var(--warning) 15%, transparent)",
          "--warning-text": "var(--foreground)",
          "--warning-border": "color-mix(in oklab, var(--warning) 50%, transparent)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

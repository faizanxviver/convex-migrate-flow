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
      position="top-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast glass !rounded-2xl !border !border-primary/25 !bg-[color-mix(in_oklab,var(--card)_88%,var(--primary))] !text-foreground !shadow-[var(--shadow-elegant)] !backdrop-blur-xl",
          title: "!font-bold !text-foreground !text-sm",
          description: "!text-xs !text-muted-foreground",
          icon: "!text-primary",
          actionButton:
            "!rounded-xl !bg-primary !px-4 !py-1.5 !text-primary-foreground !font-semibold !text-xs",
          cancelButton:
            "!rounded-xl !bg-muted !text-muted-foreground !font-semibold !text-xs",
          closeButton:
            "!rounded-full !border !border-border/70 !bg-card/80 !text-muted-foreground",
          success:
            "!border-success/40 !bg-[color-mix(in_oklab,var(--card)_86%,var(--success))] [&_[data-icon]]:!text-success",
          error:
            "!border-destructive/40 !bg-[color-mix(in_oklab,var(--card)_86%,var(--destructive))] [&_[data-icon]]:!text-destructive",
          warning:
            "!border-gold/45 !bg-[color-mix(in_oklab,var(--card)_86%,var(--gold))] [&_[data-icon]]:!text-gold",
          info: "!border-primary/40 !bg-[color-mix(in_oklab,var(--card)_88%,var(--primary))] [&_[data-icon]]:!text-primary",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--width": "360px",
          "--border-radius": "1.25rem",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-none",
          title: "group-[.toast]:text-foreground group-[.toast]:font-medium",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-none group-[.toast]:text-sm",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-none group-[.toast]:text-sm",
          error:
            "group-[.toaster]:border-destructive/50 group-[.toaster]:bg-destructive/10",
          success:
            "group-[.toaster]:border-primary/50 group-[.toaster]:bg-primary/10",
          warning:
            "group-[.toaster]:border-yellow-500/50 group-[.toaster]:bg-yellow-500/10",
          info:
            "group-[.toaster]:border-blue-500/50 group-[.toaster]:bg-blue-500/10",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

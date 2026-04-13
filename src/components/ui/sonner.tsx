import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-left"
      duration={4000}
      style={{ bottom: '5rem', left: '0.5rem' }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:text-[0.65rem] group-[.toaster]:px-2 group-[.toaster]:py-1.5 group-[.toaster]:max-w-[200px] group-[.toaster]:min-h-0",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-[0.6rem]",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:text-[0.6rem]",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:text-[0.6rem]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }

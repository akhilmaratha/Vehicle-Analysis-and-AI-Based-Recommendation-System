import { cn } from "@/lib/utils";

export function PageContainer({ as: Component = "div", className, children, ...props }) {
  return (
    <Component className={cn("page-container", className)} {...props}>
      {children}
    </Component>
  );
}

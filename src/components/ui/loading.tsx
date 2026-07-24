import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Loading({ className, size = "md" }: LoadingProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-2 border-gray-300 border-t-primary-600",
          {
            "h-4 w-4": size === "sm",
            "h-8 w-8": size === "md",
            "h-12 w-12": size === "lg",
          }
        )}
      />
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loading size="lg" />
    </div>
  );
}

export function TableLoading({ columns = 5 }: { columns?: number }) {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex space-x-4 py-4 border-b border-gray-200">
          {[...Array(columns)].map((_, j) => (
            <div key={j} className="flex-1 h-4 bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

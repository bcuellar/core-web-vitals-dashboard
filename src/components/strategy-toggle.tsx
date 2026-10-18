import Link from "next/link";
import { STRATEGIES, type Strategy } from "@/db/schema";
import { withStrategy } from "@/lib/strategy";
import { cn } from "./ui";

export function StrategyToggle({ current, basePath }: { current: Strategy; basePath: string }) {
  return (
    <nav aria-label="Device strategy" className="inline-flex rounded-lg bg-slate-100 p-1 text-sm">
      {STRATEGIES.map((strategy) => (
        <Link
          key={strategy}
          href={withStrategy(basePath, strategy)}
          aria-current={strategy === current ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 font-medium capitalize transition",
            strategy === current ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
          )}
        >
          {strategy}
        </Link>
      ))}
    </nav>
  );
}

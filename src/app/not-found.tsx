import Link from "next/link";
import { Card, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <Card>
      <EmptyState title="Page not found">
        <Link href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
          Back to dashboard
        </Link>
      </EmptyState>
    </Card>
  );
}

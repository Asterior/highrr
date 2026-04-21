import { Link } from "react-router-dom";
import { ArrowRight, Hash } from "lucide-react";
import { ForumCategory } from "@/data/types";

interface ForumCategoryCardProps {
  category: ForumCategory;
}

const ForumCategoryCard = ({ category }: ForumCategoryCardProps) => (
  <Link
    to={`/forums/${category.slug}`}
    className="group block rounded-[1.5rem] border border-border bg-card p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20">
          <Hash className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
        </div>
      </div>
      <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
        {category.thread_count} threads
      </div>
    </div>
    <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary transition-transform group-hover:translate-x-1">
      Explore category
      <ArrowRight className="h-4 w-4" />
    </div>
  </Link>
);

export default ForumCategoryCard;

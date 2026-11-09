import PreviousPage from "@/components/mockup/PreviousPage";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  showBorder?: boolean;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  showBorder = false,
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col gap-3 pt-2 pb-6 ${
        showBorder ? "mb-6 border-b border-gray-200" : "mb-2"
      }`}
    >
      <PreviousPage />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          {badge && (
            <span className="text-[#1f7a3d] text-xs uppercase font-bold tracking-widest">
              {badge}
            </span>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-gray-600 max-w-[68ch] leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    </div>
  );
}


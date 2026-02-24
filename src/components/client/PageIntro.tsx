type PageIntroProps = {
  title: string;
  description: string;
  icon?: string;
};

export default function PageIntro({ title, description, icon }: PageIntroProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        {icon && (
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 text-primary-700 text-lg">
            {icon}
          </span>
        )}
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      </div>
      <p className="text-slate-600 text-sm max-w-2xl">{description}</p>
    </div>
  );
}

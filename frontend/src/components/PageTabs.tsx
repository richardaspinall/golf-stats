type Tab = {
  key: string;
  label: string;
};

type PageTabsProps = {
  activePage: string;
  tabs: Tab[];
  onChange: (page: string) => void;
};

export function PageTabs({ activePage, tabs, onChange }: PageTabsProps) {
  return (
    <nav className="page-tabs" aria-label="page tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={activePage === tab.key ? 'tab-btn active' : 'tab-btn'}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}


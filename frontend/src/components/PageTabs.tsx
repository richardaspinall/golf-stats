import type { ReactNode } from 'react';

type Tab = {
  key: string;
  label: string;
  icon?: ReactNode;
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
          type="button"
          key={tab.key}
          className={activePage === tab.key ? 'tab-btn active' : 'tab-btn'}
          onClick={() => onChange(tab.key)}
          aria-current={activePage === tab.key ? 'page' : undefined}
        >
          {tab.icon ? <span className="tab-btn-icon" aria-hidden="true">{tab.icon}</span> : null}
          <span className="tab-btn-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

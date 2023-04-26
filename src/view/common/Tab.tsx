import './Tab.less';
import React, { FC, ReactNode } from 'react';

interface TabProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ name: string; content: ReactNode }>;
}

export const Tab: FC<TabProps> = ({ currentTab, onTabChange, tabs }) => {
  return (
    <div className="sg-tab-can">
      <div className="sg-tab-head">
        {tabs.map(tab => (
          <div
            key={tab.name}
            className="sg-tab-title"
            data-aria-selected={tab.name === currentTab}
            onClick={() => tab.name !== currentTab && onTabChange(tab.name)}>
            {tab.name}
          </div>
        ))}
      </div>
      <div className="sg-tab-body">{tabs.find(i => i.name === currentTab)?.content}</div>
    </div>
  );
};

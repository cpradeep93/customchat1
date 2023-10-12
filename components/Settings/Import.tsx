import { IconFileImport , IconUser } from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import { SupportedExportFormats } from '@/types/export';

import { SidebarButton } from '../Sidebar/SidebarButton';

interface Props {
  onImport: (data: SupportedExportFormats) => void;
}

export const Import: FC<Props> = ({ onImport }) => {
  const { t } = useTranslation('sidebar');
  return (
    <>
      <input
        id="import-file"
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept=".json"
        onChange={(e) => {
          if (!e.target.files?.length) return;

          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (e) => {
            let json = JSON.parse(e.target?.result as string);
            onImport(json);
          };
          reader.readAsText(file);
        }}
      />

      <SidebarButton
        text={t('Upgrade to Plus')}
        icon={<IconUser size={18} />}
        onClick={() => {
            const element12 = document.getElementById('overlay_top');
            const element13 = document.getElementById('setting_section_cover_premium');
            const element1 = document.getElementById('side_popup_id');
              // Check if the element exists and hide it
            if (element12 && element13 && element1) {
              element12.style.display = 'block';
              element13.style.display = 'block';
              element1.style.display = 'none';        
            }  
      }}
      />
    </>
  );
};

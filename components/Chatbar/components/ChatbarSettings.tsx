import { IconFileExport } from '@tabler/icons-react';
import { useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';


import { Key } from '../../Settings/Key';
import { SidebarButton } from '../../Sidebar/SidebarButton';

import { MyButtonCom } from '../../btns/MyButtonCom';

import ChatbarContext from '../Chatbar.context';

import { PluginKeys } from './PluginKeys';
import MyImg from '@/components/imgs/MyImg';

import Model from '../../Models/Model'; // Import the Model component
import {Chat} from '../../Chat/Chat';






// CUSTOM JS CODE - LEFT BOTTOM BELOW POPUP (SETTINGS / LOGOUT / CUSTOM INSTRUCTIONS) HIDE (TOGGLE) WHEN CLICK ON LEFT BELOW ... FRONT TO OXTIA JAILBREAK TEXT - START 

const side_popup = () => {
  const element1 = document.getElementById('side_popup_id');
// Check if the element exists and hide it
  if (element1) {   
    if(element1.style.display=="none")
    {
      element1.style.display = 'block';
    }
    else if(element1.style.display=="block")
    {
      element1.style.display = 'none';
    }
  }  
};

// CUSTOM JS CODE -LEFT BOTTOM BELOW POPUP (SETTINGS / LOGOUT / CUSTOM INSTRUCTIONS) HIDE (TOGGLE) WHEN CLICK ON LEFT BELOW ... FRONT TO OXTIA JAILBREAK TEXT - END 


//===================================================================================================================================================================


// CUSTOM JS CODE - OVERLAY AND SETTING MODEL DISPLAY FUNCTION WHEN CLICK ON SETTING OPTION (LEFT BELOW MODEL)  - START 


//overlay setting
const overlay_open = () => {
  const element12 = document.getElementById('overlay_top');
  const element13 = document.getElementById('setting_section_cover');
  const element1 = document.getElementById('side_popup_id');
// Check if the element exists and hide it
  if (element12 && element13 && element1) {
    element12.style.display = 'block';
    element13.style.display = 'block';
    element1.style.display = 'none';
   
  }  
};


const empty_clz = () => {

};


// CUSTOM JS CODE - OVERLAY AND SETTING MODEL DISPLAY FUNCTION WHEN CLICK ON SETTING OPTION (LEFT BELOW MODEL)  - END 

//====================================================================================================================================================================




export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);

  const {
    state: {
      apiKey,
      lightMode,
      serverSideApiKeyIsSet,
      serverSidePluginKeysSet,
      conversations,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const {
    handleClearConversations,
    handleImportConversations,
    handleExportData,
    handleApiKeyChange,
  } = useContext(ChatbarContext);

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
      {/* {conversations.length > 0 ? (
        <ClearConversations onClearConversations={handleClearConversations} />
      ) : null} */}


  
      <Import onImport={handleImportConversations} />

      <MyImg />

      {/* <SidebarButton text={t('Export data')} icon={<IconFileExport size={18} />} onClick={() => handleExportData()}/> */}



        <div className="side_settings" id='side_popup_id' style={{display:'none'}}>
              <div className="setting1">
                <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 25 25" className="h-4 w-4 shrink-0 icons_position" fill="none">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M21.44 15.707a2 2 0 0 1-2 2h-12l-4 4v-16a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"></path>
                  <path fill="currentColor" stroke="currentColor" stroke-linecap="round" 
                  stroke-linejoin="round" stroke-width="1.7" 
                  d="M7.825 11.375a.687.687 0 1 0 0-1.375.687.687 0 0 0 0 1.375ZM12.5 11.375a.687.687 0 1 0 0-1.375.687.687 0 0 0 0 1.375ZM17.175 11.375a.687.687 0 1 0 0-1.375.687.687 0 0 0 0 1.375Z">
                    </path></svg>
                  <h1>Custom Instructions </h1>
              </div>


              <div className="setting1" onClick={() => overlay_open()}>
                <svg stroke="currentColor"  fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"
                    className="h-4 w-4 icons_position" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 
                    1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 
                    0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0
                    0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 
                    0 0-1.51 1z"></path>
                </svg>
                <h1>Settings</h1>
              </div>


              <hr style={{marginBottom:'8px'}}></hr>
              <div className="setting1">
                  <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4 icons_position" 
                  height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7">
                    </polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <h1>Log out </h1>
              </div>
        </div>



            <div style={{ color:'white' , position:'relative' , left:'-20px' }}>
              <SidebarButton text={t('Oxtia Jailbreak')} icon={<IconFileExport size={18} style={{display:'none'}} />} onClick={() => empty_clz()}/>
            </div>

            <div style={{ color:'white' , position:'absolute' , left:'200px' , marginTop:'50px' }}>
              <SidebarButton text={t('...')} icon={<IconFileExport size={18} style={{display:'none'}} />} onClick={() => side_popup()} />
            </div>

     
    

      {/* <MyButtonCom
        text={t('New')}
        icon={<IconFileExport size={18} />}        
        onClick={() => handleExportData()}
      /> */}
   

      {!serverSideApiKeyIsSet ? (
        <Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
      ) : null}

      {!serverSidePluginKeysSet ? <PluginKeys /> : null}

      <SettingDialog
        open={isSettingDialogOpen}
        onClose={() => {
          setIsSettingDialog(false);
        }}
      />
    </div>
  );
};

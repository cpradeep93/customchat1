import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'react-query';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';




import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';
import { getSettings } from '@/utils/app/settings';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { OpenAIModelID, OpenAIModels, fallbackModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import Promptbar from '@/components/Promptbar';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import { v4 as uuidv4 } from 'uuid';

interface Props {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: OpenAIModelID;
}

const Home = ({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
}: Props) => {
  const { t } = useTranslation('chat');
  const { getModels } = useApiService();
  const { getModelsError } = useErrorService();
  const [initialRender, setInitialRender] = useState<boolean>(true);

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: {
      apiKey,
      lightMode,
      folders,
      conversations,
      selectedConversation,
      prompts,
      temperature,
    },
    dispatch,
  } = contextValue;

  const stopConversationRef = useRef<boolean>(false);

  const { data, error, refetch } = useQuery(
    ['GetModels', apiKey, serverSideApiKeyIsSet],
    ({ signal }) => {
      if (!apiKey && !serverSideApiKeyIsSet) return null;

      return getModels(
        {
          key: apiKey,
        },
        signal,
      );
    },
    { enabled: true, refetchOnMount: false },
  );

  useEffect(() => {
    if (data) dispatch({ field: 'models', value: data });
  }, [data, dispatch]);

  useEffect(() => {
    dispatch({ field: 'modelError', value: getModelsError(error) });
  }, [dispatch, error, getModelsError]);

  // FETCH MODELS ----------------------------------------------

  const handleSelectConversation = (conversation: Conversation) => {
    dispatch({
      field: 'selectedConversation',
      value: conversation,
    });

    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });

    dispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folderId === folderId) {
        return {
          ...p,
          folderId: null,
        };
      }

      return p;
    });

    dispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      messages: [],
      model: lastConversation?.model || {
        id: OpenAIModels[defaultModelId].id,
        name: OpenAIModels[defaultModelId].name,
        maxLength: OpenAIModels[defaultModelId].maxLength,
        tokenLimit: OpenAIModels[defaultModelId].tokenLimit,
      },
      prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
      folderId: null,
    };

    const updatedConversations = [...conversations, newConversation];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    dispatch({ field: 'loading', value: false });
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    dispatch({ field: 'selectedConversation', value: single });
    dispatch({ field: 'conversations', value: all });
  };


  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [selectedConversation]);

  useEffect(() => {
    defaultModelId &&
      dispatch({ field: 'defaultModelId', value: defaultModelId });
    serverSideApiKeyIsSet &&
      dispatch({
        field: 'serverSideApiKeyIsSet',
        value: serverSideApiKeyIsSet,
      });
    serverSidePluginKeysSet &&
      dispatch({
        field: 'serverSidePluginKeysSet',
        value: serverSidePluginKeysSet,
      });
  }, [defaultModelId, serverSideApiKeyIsSet, serverSidePluginKeysSet]);

  // ON LOAD --------------------------------------------

  useEffect(() => {
    const settings = getSettings();
    if (settings.theme) {
      dispatch({
        field: 'lightMode',
        value: settings.theme,
      });
    }

    const apiKey = localStorage.getItem('apiKey');

    if (serverSideApiKeyIsSet) {
      dispatch({ field: 'apiKey', value: '' });

      localStorage.removeItem('apiKey');
    } else if (apiKey) {
      dispatch({ field: 'apiKey', value: apiKey });
    }

    const pluginKeys = localStorage.getItem('pluginKeys');
    if (serverSidePluginKeysSet) {
      dispatch({ field: 'pluginKeys', value: [] });
      localStorage.removeItem('pluginKeys');
    } else if (pluginKeys) {
      dispatch({ field: 'pluginKeys', value: pluginKeys });
    }

    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
      dispatch({ field: 'showPromptbar', value: false });
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }

    const showPromptbar = localStorage.getItem('showPromptbar');
    if (showPromptbar) {
      dispatch({ field: 'showPromptbar', value: showPromptbar === 'true' });
    }

    const folders = localStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      dispatch({ field: 'prompts', value: JSON.parse(prompts) });
    }

    const conversationHistory = localStorage.getItem('conversationHistory');
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );

      dispatch({ field: 'conversations', value: cleanedConversationHistory });
    }

    const selectedConversation = localStorage.getItem('selectedConversation');
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(
        parsedSelectedConversation,
      );

      dispatch({
        field: 'selectedConversation',
        value: cleanedSelectedConversation,
      });
    } else {
      const lastConversation = conversations[conversations.length - 1];
      dispatch({
        field: 'selectedConversation',
        value: {
          id: uuidv4(),
          name: t('New Conversation'),
          messages: [],
          model: OpenAIModels[defaultModelId],
          prompt: DEFAULT_SYSTEM_PROMPT,
          temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
          folderId: null,
        },
      });
    }
  }, [
    defaultModelId,
    dispatch,
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
  ]);















  // CUSTOM JS CODE - IF PREVIOUS CHATS (CHAT HISTORY) AVAILABLE , BLOCK OPENING DYNAMIC ITEMS BELOW THE CHAT AREA SECTION  - START 
 

  useEffect(() => {
    if (localStorage.getItem("selectedConversation") !== null) {
      const show_bottom_list = document.getElementById('bottom_main_id'); 
      if(show_bottom_list)
      {
       show_bottom_list.style.display="none" ;    
      }  
    } 
  });
  
    // CUSTOM JS CODE - IF PREVIOUS CHATS (CHAT HISTORY) AVAILABLE , BLOCK OPENING DYNAMIC ITEMS BELOW THE CHAT AREA SECTION  - END 
  
  
  // ====================================================================================================================================  // 

    // CUSTOM JS CODE - THIS IS THE OVERLAY AND SETTING MODEL/ BEHIND THE MODELS THERE IS AN OVERLAY WITH LOW OPACITY. THIS FUNCTION HIDE IT WHEN CLICK ON CLOSE BUTTON ON THE SETTING MODEL - START 

  const overlay_close = () => {
    const element12 = document.getElementById('overlay_top');
    const element13 = document.getElementById('setting_section_cover');

  // Check if the element exists and hide it
    if (element12 && element13) {
      element12.style.display = 'none';
      element13.style.display = 'none'; 
    }  
  };

  const overlay_close_premium = () => {
    const element12 = document.getElementById('overlay_top');
    const element13 = document.getElementById('setting_section_cover_premium');
  
  // Check if the element exists and hide it
    if (element12 && element13) {
      element12.style.display = 'none';
      element13.style.display = 'none'; 
    }  
  };
  

    // CUSTOM JS CODE -  THIS IS THE OVERLAY AND SETTING MODEL/ BEHIND THE MODELS THERE IS AN OVERLAY WITH LOW OPACITY. THIS FUNCTION HIDE IT WHEN CLICK ON CLOSE BUTTON ON THE SETTING MODEL - END 
  

  // ====================================================================================================================================  // 

  

        // const right_show_func1 = () => {
        //   const element12 = document.getElementById('right_second_content');
        //   const element13 = document.getElementById('right_first_content');
        //   if (element12 && element13 ) {
        //   element12.style.display = 'none';
        //   element13.style.display = 'block';
        //  }  
        // };



        // CUSTOM JS CODE - TWO FUNCTIONS TO SHOW AND HIDE RIGHT SIDE CONTENT / COLO CHANGES ETC - START



        const right_show_func = () => {

            // get ids of two content of right sections
            const element12 = document.getElementById('right_second_content');
            const element13 = document.getElementById('right_first_content');

            // get ids of  data controll text and icon
            const element14 = document.getElementById('data_control_icon');
            const element15 = document.getElementById('data_control_text');
           
            // get ids of general icon and texts
            const element16 = document.getElementById('general_icon');
            const element17 = document.getElementById('general_text');

            if (element12 && element13 && element14 && element15 &&element16 && element17 ) {

                 // right side two dives hide and show
                element12.style.display = 'block';
                element13.style.display = 'none';

                 // right side data contro icon and text hide show
                element14.style.fill = '#d5d4d4';
                element15.style.color = '#d5d4d4';


                // right side General icon and text hide show
                element16.style.color = '#8e8ea0';
                element17.style.fill = '#8e8ea0';

            }  
        };


        const right_show_func3 = () => {

          // get ids of two content of right sections
          const element12 = document.getElementById('right_second_content');
          const element13 = document.getElementById('right_first_content');

          // get ids of  general text and icon
          const element14 = document.getElementById('data_control_icon');
          const element15 = document.getElementById('data_control_text');
         
          // get ids of general icon and texts
          const element16 = document.getElementById('general_icon');
          const element17 = document.getElementById('general_text');

          if (element12 && element13 && element14 && element15 &&element16 && element17 ) {

               // right side two dives hide and show
              element12.style.display = 'none';
              element13.style.display = 'block';

               // right side general icon and text hide show
              element14.style.fill = '#8e8ea0';
              element15.style.color = '#8e8ea0';


              // right side General icon and text hide show
              element16.style.color = '#d5d4d4';
              element17.style.fill = '#d5d4d4';

          }  
      };



        // CUSTOM JS CODE - TWO FUNCTIONS TO SHOW AND HIDE RIGHT SIDE CONTENT / COLO CHANGES ETC - END
        



    

  const changeColor = () => {
    const selected_item = document.getElementById('colorDropdown') as HTMLInputElement;;
    const color_system = document.getElementById('body_style');

    const setting_popup = document.getElementById('setting_model_id');
    const setting_popup_left_col = document.getElementById('setting-model-left-col-id');


    // const chat_text = document.getElementById('xxx');



    const top_two_section = document.getElementById('top_tow_section_back');
    const top_two_section_gp4 = document.getElementById('top_gp4');


    const top_two_section_gp3 = document.getElementById('top_gp3_button');


    // get IDs of fist bottom  tab of the list in the chat area (big text / small text and section)

    const bottom_list_1id = document.getElementById('bottom_list_1');
    const bottom_list_1id_text1 = document.getElementById('hibro');
    const bottom_list_1id_text2 = document.getElementById('hibro1');


    // get IDs of second bottom  tab of the list in the chat area (big text / small text and section)

    const bottom_list_2id = document.getElementById('bottom_list_2');
    const bottom_list_2id_text1 = document.getElementById('hibro2');
    const bottom_list_2id_text2 = document.getElementById('hibro3');


    // get IDs of third bottom  tab of the list in the chat area (big text / small text and section)

    const bottom_list_3id = document.getElementById('bottom_list_3');
    const bottom_list_3id_text1 = document.getElementById('hibro4');
    const bottom_list_3id_text2 = document.getElementById('hibro5');




  // get IDs of fourth bottom  tab of the list in the chat area (big text / small text and section)
    const bottom_list_4id = document.getElementById('bottom_list_4');
    const bottom_list_4id_text1 = document.getElementById('hibro6');
    const bottom_list_4id_text2 = document.getElementById('hibro7');


      // send a message text 
    const send_msg_area = document.getElementById('send_msg');

      // below black area change color
    const chat_area_below_section = document.getElementById('below_chat_area_bottom');


  
      // below black area change color
      const chat_list_dynamic_var = document.getElementById('chat_list_dynamic');




      const options1_select_var = document.getElementById('option1_id');   
      const options2_select_var = document.getElementById('option2_id');
      const options3_select_var = document.getElementById('option3_id');



      
      
  
    if (selected_item && color_system && setting_popup && setting_popup_left_col   && top_two_section && top_two_section_gp4  && top_two_section_gp3 
        && bottom_list_4id 
      
      &&  bottom_list_1id &&  bottom_list_1id_text1 && bottom_list_1id_text2 
      &&  bottom_list_2id && bottom_list_2id_text1 && bottom_list_2id_text2
      &&  bottom_list_3id && bottom_list_3id_text1 && bottom_list_3id_text2 
      &&  bottom_list_4id && bottom_list_4id_text1 && bottom_list_4id_text2 

      && send_msg_area && chat_area_below_section  

      && options1_select_var && options2_select_var && options3_select_var

  


      
      ) {

      if (selected_item.value === "option1") 
      {
       
      }
      
      else if (selected_item.value === "option2") 
      {

        // chat area background dark
        color_system.style.background = "#343541";

        // setting popup dark (middle model)
        setting_popup.style.background = "#202123";

        // setting popup dark color change as light
        setting_popup.style.color = "#b1b1bc";

       // setting popup dark color change as light - in theleft col section
        setting_popup_left_col.style.backgroundColor = "#202123";

      // selcted theme dropdown background
        selected_item.style.background = "#202123";




        // there are two options called GPT 3.4 and 3.5  /thease styles chage the background / border colors  as dark 
        top_two_section.style.background="#202123";
        top_two_section.style.borderColor="#202123";
        top_two_section_gp4.style.background="#202123";
        top_two_section_gp4.style.borderColor="#202123";


         // there are two options called GPT 3.4 and 3.5 / thease styles chnage left button (GPT 3.5 button color background and border color)
        top_two_section_gp3.style.background="#40414f";
        top_two_section_gp3.style.borderColor="#40414f";
        top_two_section_gp3.style.color="#ececf1";



 
        // change the background color / border color / big text color and small text color of first bottom  section of the four - DARK COLOR
        bottom_list_1id.style.background="#343541";
        bottom_list_1id.style.borderColor="#565869";
        bottom_list_1id_text1.style.color="#c5c5d2";
        bottom_list_1id_text2.style.color="#747580";

        
       // change the background color / border color / big text color and small text color of second bottom  section of the four
       bottom_list_2id.style.background="#343541";
       bottom_list_2id.style.borderColor="#565869";
       bottom_list_2id_text1.style.color="#c5c5d2";
       bottom_list_2id_text2.style.color="#747580";



       // change the background color / border color / big text color and small text color of third bottom  section of the four
       bottom_list_3id.style.background="#343541";
       bottom_list_3id.style.borderColor="#565869";
       bottom_list_3id_text1.style.color="#c5c5d2";
       bottom_list_3id_text2.style.color="#747580";


       // change the background color / border color / big text color and small text color of fourth  bottom  section of the four
       bottom_list_4id.style.background="#343541";
       bottom_list_4id.style.borderColor="#565869";
       bottom_list_4id_text1.style.color="#c5c5d2";
       bottom_list_4id_text2.style.color="#747580";
        

        //input box background
        send_msg_area.style.background="#40414f";

        //input box background    
       chat_area_below_section.style.background="#343541";


             // three color chnaging option in the dropdown
      options1_select_var.style.background="#202123";
      options2_select_var.style.background="#202123";
      options3_select_var.style.background="#202123";


      }
      
      
      else 
      {

        color_system.style.background = "white";
        setting_popup.style.background = "white";
        setting_popup.style.color = "black";
        setting_popup_left_col.style.backgroundColor = "white";
        selected_item.style.background = "white";


        // there are two options called GPT 3.4 and 3.5  /thease styles chage the background / border colors  as light 
        top_two_section.style.background="#ececf1";
        top_two_section.style.borderColor="#ececf1";
        top_two_section_gp4.style.background="#ececf1";
        top_two_section_gp4.style.borderColor="#ececf1";

        
        // there are two options called GPT 3.4 and 3.5 / thease styles chnage left button (GPT 3.5 button color background and border color)
        top_two_section_gp3.style.background="#ffffff";
        top_two_section_gp3.style.borderColor="#ffffff";
        top_two_section_gp3.style.color="#000000bf";



        // change the background color / border color / big text color and small text color of first bottom  section of the four
        bottom_list_1id.style.background="#ffffff";
        bottom_list_1id.style.borderColor="#c9c9c9";
        bottom_list_1id_text1.style.color="#40414f";
        bottom_list_1id_text2.style.color="#c6c6cb";


       // change the background color / border color / big text color and small text color of second bottom  section of the four
        bottom_list_2id.style.background="#ffffff";
        bottom_list_2id.style.borderColor="#c9c9c9";
        bottom_list_2id_text1.style.color="#40414f";
        bottom_list_2id_text2.style.color="#c6c6cb";



        // change the background color / border color / big text color and small text color of third bottom  section of the four
        bottom_list_3id.style.background="#ffffff";
        bottom_list_3id.style.borderColor="#c9c9c9";
        bottom_list_3id_text1.style.color="#40414f";
        bottom_list_3id_text2.style.color="#c6c6cb";


        // change the background color / border color / big text color and small text color of fourth  bottom  section of the four
        bottom_list_4id.style.background="#ffffff";
        bottom_list_4id.style.borderColor="#c9c9c9";
        bottom_list_4id_text1.style.color="#40414f";
        bottom_list_4id_text2.style.color="#c6c6cb";
       

        //input box background
       send_msg_area.style.background="#ffffff";

        //input box background -below part of the backgound   
       chat_area_below_section.style.background="#ffffff";


      //  chat_list_dynamic_var.style.background="red";

      // three color chnaging option in the dropdown - light
      options1_select_var.style.background="white";
      options2_select_var.style.background="white";
      options3_select_var.style.background="white";




      
      }
    }
  };


  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleNewConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectConversation,
        handleUpdateConversation,
      }}
    >
      <Head>
        <title>ChatGPT</title>
        <meta name="description" content="ChatGPT but better." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {selectedConversation && (
        
        <main
          className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}>

           {/* Setting Model with functions*/}
            <div className="overlay_cover" id='overlay_top' >
              <div className='overla' >
             
              </div>
            </div>

                {/* start -  this is the first overlay and setting model for the left bwlo button */}
            <div className="settings_full_cover" id='setting_section_cover' >
                <div className="settings_cover"  >
                 <div className='setting_model' id='setting_model_id'>
                    <div className='titile_close' >
                      <h1 style={{fontWeight:'bold'}}>Settings</h1>
                      <svg onClick={() =>overlay_close()} stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"
                       stroke-linecap="round" stroke-linejoin="round" height="20" width="20" 
                       xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18">
                        </line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div> 
                    <hr className='hr_lines'></hr>

                   
                   
                     <div className="container">
                        <div className="left-column" id='setting-model-left-col-id'>
                         {/* Content for the left column goes here */}
                         <div className="general_tab" style={{display:'flex' , padding:'5px'}} onClick={right_show_func3}>
                                                          
                                 <svg stroke="currentColor"  id='general_text' stroke-width="0" viewBox="0 0 20 20" 
                                        className="h-5 w-5 fill-gray-800 group-radix-state-active:fill-white dark:fill-gray-500"
                                        height="1em" width="1.3em" style={{marginRight:'10px' , fill:'white'}} xmlns="http://www.w3.org/2000/svg">
                                       <path fill-rule="evenodd" 
                                        d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 
                                        0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947
                                        2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942
                                        2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533
                                        1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 
                                        0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 
                                        0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 
                                        1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" 
                                        clip-rule="evenodd"></path>
                                  </svg>

                              <p id='general_icon'>General</p>
                          </div>




                          <div className="general_tab1" style={{display:'flex' , marginTop:'10px' , padding:'5px'}} onClick={right_show_func}>
                            <svg stroke="currentColor"  id='data_control_icon' stroke-width="0" viewBox="0 0 20 20" 
                            className="1em" width="1.5em" style={{marginRight:'10px' , fill:'#8e8ea0'}} xmlns="http://www.w3.org/2000/svg"><path d="M3 12v3c0 1.657 
                            3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z"></path><path d="M3 7v3c0 
                            1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z"></path><path d="M17
                            5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z"></path></svg>
                                <p id='data_control_text' style={{color:'#8e8ea0'}}>Data controls</p>
                            </div>
                        </div>


                        <div className="right-column">
                          {/* <!-- Content for the right column goes here --> */}
                        
                        <div className='right-side-first-content' id='right_first_content'>                       
                          <div className="clear-chat-section">
                                <p style={{marginTop:'10px'}}>Theme</p>

                                 <select className="select-theme" id="colorDropdown" onChange={changeColor}>
                                    <option value="option1" className='select-theme-1' id='option1_id'>System</option>
                                    <option value="option2" className='select-theme-2'  id='option2_id'>Dark</option>
                                    <option value="option3" className='select-theme-3'  id='option3_id'>Light</option>
                                </select>                   
                          </div>

                          <hr className='hr_lines1'></hr>
                         
                          <div className="clear-chat-section">
                                <p style={{marginTop:'10px'}}>Clear all chats</p>
                                <div className="clear-chat-btn">Clear</div>
                          </div>  
                        </div>


                         <div className='right-side-second-content' id='right_second_content' style={{display:'none'}}>
                              <div className="clear-chat-section">
                                    <p style={{marginTop:'10px' , color:'#c5c5d2'}}>Chat history & training</p>
                                    {/* <div className="clear-chat-btn">Clear</div> */}

                                    <label className="switch">
                                      <input type="checkbox" checked></input>
                                      <span className="slider round"></span>
                                    </label>
                                    
                              </div>

                              <div className='data_contro-top-text'>
                                <p style={{color:'#8e8ea0'}}>Save new chats on this browser to your history and allow them to be used to improve our models. 
                                  Unsaved chats will be deleted from our systems within 30 days. 
                                  This setting does not sync across browsers or devices. Learn more</p>
                              </div>

                              <hr className='hr_lines1'></hr>
                              
                              <div className="clear-chat-section">
                                    <p style={{marginTop:'10px' , color:'#c5c5d2' }}>Shared links</p>
                                    <div className="clear-chat-btn" style={{background:'#343541'}}>Manage</div>
                              </div>

                              <hr className='hr_lines1'></hr>

                              <div className="clear-chat-section">
                                    <p style={{marginTop:'10px' , color:'#c5c5d2'}}>Export data</p>
                                    <div className="clear-chat-btn" style={{background:'#343541'}}>Export</div>
                              </div>

                              <hr className='hr_lines1'></hr>

                              <div className="clear-chat-section">
                                    <p style={{marginTop:'10px' , color:'#c5c5d2'}}>Delete account</p>
                                    <div className="clear-chat-btn" >Delete</div>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                 </div>
              </div>

               {/* End -  this is the first overlay and setting model for the left bwlo button */}



 {/* ============================================================================================================ */}




              {/* start -  this is the Second overlay and  model for the top  button */}


              <div className="settings_full_cover" id='setting_section_cover_premium'>
                <div className="settings_cover"  >
                 <div className='setting_model' id='setting_model_id' style={{width:'45%' , height:'fit-content'}}>
                    <div className='titile_close' >
                      <h1 style={{fontWeight:'bold'}}>Your plan</h1>
                      <svg onClick={() =>overlay_close_premium()} stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24"
                       stroke-linecap="round" stroke-linejoin="round" height="20" width="20" 
                       xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="6" x2="6" y2="18">
                        </line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </div> 
                    <hr className='hr_lines'></hr>

                    
                   
                     <div className="container">
                        <div className="left-column1" id='setting-model-left-col-id'>
                       
                         <div className='free-top-text' style={{display:'flex' , justifyContent:'space-between'}}>
                              <h1 className='free-main-text'>Free plan</h1>
                          </div>
                          <button type="button"  style={{background:'#8e8ea0' , width:'100%' , padding:'10px' ,
                           borderRadius:'5px'}}>your current plan</button>

                           <div className='free-list'>
                             <div className='free_list1 list-flex'>
                                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                                  stroke-linejoin="round" className="icon-md text-gray-400 right-margin-free-list" height="1em" width="1em" 
                                  xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                  <p>Access to our GPT-3.5 model</p>
                             </div> 

                             <div className='free_list2 list-flex'>
                                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                                  stroke-linejoin="round" className="icon-md text-gray-400 right-margin-free-list" height="1em" width="1em" 
                                  xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                  <p>Standard response speed</p>
                             </div>  

                             <div className='free_list3 list-flex'>
                                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                                  stroke-linejoin="round" className="icon-md text-gray-400 right-margin-free-list" height="1em" width="1em" 
                                  xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                  <p>Regular model updates</p>
                             </div>                              
                           </div>                      
                        </div>

                        <div className="vertical-line"></div>


                        <div className="right-column1">
                          <div className='plus-top-text' style={{display:'flex' , justifyContent:'space-between'}}>
                              <h1 className='free-main-text'>chatGPT Plus </h1>
                              <h1 className='free-main-text' style={{color:'#8e8ea0'}}>USD $20/mo</h1>
                          </div>
                          <button type="button"  style={{background:'#10a37f' , width:'100%' , padding:'10px' ,
                           borderRadius:'5px'}}>Upgrade to  Plus</button>

                            <div className='paid-list'>
                             <div className='free_list1 list-flex'>
                                <svg stroke="currentColor" style={{color:'#10a37f'}} fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                                  stroke-linejoin="round" className="icon-md text-gray-400 right-margin-free-list" height="1em" width="1em" 
                                  xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                  <p>Access to GPT-4, our most capable model</p>
                             </div> 

                             <div className='free_list2 list-flex'>
                                <svg stroke="currentColor" style={{color:'#10a37f'}} fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                                  stroke-linejoin="round" className="icon-md text-gray-400 right-margin-free-list" height="1em" width="1em" 
                                  xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                  <p>Faster response speed</p>
                             </div>  

                             <div className='free_list3 list-flex'>
                                <svg stroke="currentColor" style={{color:'#10a37f'}} fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                                  stroke-linejoin="round" className="icon-md text-gray-400 right-margin-free-list" height="1em" width="1em" 
                                  xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                  <p>Exclusive access to features like </p>
                                  {/* <br><p>Plugins and Advanced Data Analysis</p></br> */}
                                
                             </div> 

                              <div className='free_list4 list-flex1'>
                                  <a href='' className='list-flex1-link'>I need help with a billing issue</a>                                  
                             </div> 





                           </div>
            



                        </div>


                      </div>
                    </div>
                 </div>
              </div>






              {/* End -  this is the Second overlay and  model for the top  button */}



          <div className="fixed top-0 w-full sm:hidden ">
            <Navbar
              selectedConversation={selectedConversation}
              onNewConversation={handleNewConversation}
            />
          </div>

          <div className="flex h-full w-full pt-[48px] sm:pt-0">
            <Chatbar />
            <div className="flex flex-1">
              <Chat stopConversationRef={stopConversationRef} />
            </div>
            {/* <Promptbar /> */}
          </div>         
        </main>
      )}
    </HomeContext.Provider>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      process.env.DEFAULT_MODEL) ||
    fallbackModelID;

  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  return {
    props: {
      serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
      defaultModelId,
      serverSidePluginKeysSet,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
        'settings',
      ])),
    },
  };
};

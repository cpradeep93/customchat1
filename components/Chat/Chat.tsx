

import { IconClearAll, IconSettings } from '@tabler/icons-react';
import {
  MutableRefObject,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { getEndpoint } from '@/utils/app/api';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { throttle } from '@/utils/data/throttle';

import { ChatBody, Conversation, Message } from '@/types/chat';
import { Plugin } from '@/types/plugin';

import HomeContext from '@/pages/api/home/home.context';

// import Spinner from '../Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';
import { TemperatureSlider } from './Temperature';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import MyImg from '../imgs/MyImg';

import 'material-icons/iconfont/material-icons.css'



interface Props {
  stopConversationRef: MutableRefObject<boolean>;
}

export const Chat = memo(({ stopConversationRef }: Props) => {
  const { t } = useTranslation('chat');

  const {
    state: {
      selectedConversation,
      conversations,
      models,
      apiKey,
      pluginKeys,
      serverSideApiKeyIsSet,
      messageIsStreaming,
      modelError,
      loading,
      prompts,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0, plugin: Plugin | null = null) => {
      if (selectedConversation) {
        let updatedConversation: Conversation;
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message],
          };
        } else {
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, message],
          };
        }
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });
        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });
        const chatBody: ChatBody = {
          model: updatedConversation.model,
          messages: updatedConversation.messages,
          key: apiKey,
          prompt: updatedConversation.prompt,
          temperature: updatedConversation.temperature,
        };
        const endpoint = getEndpoint(plugin);
        let body;
        if (!plugin) {
          body = JSON.stringify(chatBody);
        } else {
          body = JSON.stringify({
            ...chatBody,
            googleAPIKey: pluginKeys
              .find((key) => key.pluginId === 'google-search')
              ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
            googleCSEId: pluginKeys
              .find((key) => key.pluginId === 'google-search')
              ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
          });
        }
        const controller = new AbortController();
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body,
        });
        if (!response.ok) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          toast.error(response.statusText);
          return;
        }
        const data = response.body;
        if (!data) {
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          return;
        }
        if (!plugin) {
          if (updatedConversation.messages.length === 1) {
            const { content } = message;
            const customName =
              content.length > 30 ? content.substring(0, 30) + '...' : content;
            updatedConversation = {
              ...updatedConversation,
              name: customName,
            };
          }
          homeDispatch({ field: 'loading', value: false });
          const reader = data.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let isFirst = true;
          let text = '';
          while (!done) {
            if (stopConversationRef.current === true) {
              controller.abort();
              done = true;
              break;
            }
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);
            text += chunkValue;
            if (isFirst) {
              isFirst = false;
              const updatedMessages: Message[] = [
                ...updatedConversation.messages,
                { role: 'assistant', content: chunkValue },
              ];
              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages,
              };
              homeDispatch({
                field: 'selectedConversation',
                value: updatedConversation,
              });
            } else {
              const updatedMessages: Message[] =
                updatedConversation.messages.map((message, index) => {
                  if (index === updatedConversation.messages.length - 1) {
                    return {
                      ...message,
                      content: text,
                    };
                  }
                  return message;
                });
              updatedConversation = {
                ...updatedConversation,
                messages: updatedMessages,
              };
              homeDispatch({
                field: 'selectedConversation',
                value: updatedConversation,
              });
            }
          }
          saveConversation(updatedConversation);
          const updatedConversations: Conversation[] = conversations.map(
            (conversation) => {
              if (conversation.id === selectedConversation.id) {
                return updatedConversation;
              }
              return conversation;
            },
          );
          if (updatedConversations.length === 0) {
            updatedConversations.push(updatedConversation);
          }
          homeDispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);
          homeDispatch({ field: 'messageIsStreaming', value: false });
        } else {
          const { answer } = await response.json();
          const updatedMessages: Message[] = [
            ...updatedConversation.messages,
            { role: 'assistant', content: answer },
          ];
          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages,
          };
          homeDispatch({
            field: 'selectedConversation',
            value: updateConversation,
          });
          saveConversation(updatedConversation);
          const updatedConversations: Conversation[] = conversations.map(
            (conversation) => {
              if (conversation.id === selectedConversation.id) {
                return updatedConversation;
              }
              return conversation;
            },
          );
          if (updatedConversations.length === 0) {
            updatedConversations.push(updatedConversation);
          }
          homeDispatch({ field: 'conversations', value: updatedConversations });
          saveConversations(updatedConversations);
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
        }
      }
    },
    [
      apiKey,
      conversations,
      pluginKeys,
      homeDispatch,
      selectedConversation,
      stopConversationRef,
    ],
  );

  const scrollToBottom = useCallback(() => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
    }
  }, [autoScrollEnabled]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        chatContainerRef.current;
      const bottomTolerance = 30;

      if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
        setAutoScrollEnabled(false);
        setShowScrollDownButton(true);
      } else {
        setAutoScrollEnabled(true);
        setShowScrollDownButton(false);
      }
    }
  };

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  };

  const handleSettings = () => {
    setShowSettings(!showSettings);
  };

  const onClearAll = () => {
    if (
      confirm(t<string>('Are you sure you want to clear all messages?')) &&
      selectedConversation
    ) {
      handleUpdateConversation(selectedConversation, {
        key: 'messages',
        value: [],
      });
    }
  };




  // CUSTOM JS CODE - DYNAMICALLY CHANGE CONTENTS OF BOTTOM LIST CONTENTS OF THE CHAT AREA   - START 


useEffect(() => {

    // First Tab 
  const wordDisplayElement = document.getElementById('hibro');
  if (wordDisplayElement) {
    const wordsArray = ['Give me ideas', 'Make up a story', 'Suggest fun activities', 'Compare marketing strategies' ,'Help me debug'];
    const randomIndex = Math.floor(Math.random() * wordsArray.length);
    const randomWord = wordsArray[randomIndex];
    wordDisplayElement.innerHTML = randomWord;
  }

  const wordDisplayElement1 = document.getElementById('hibro1');
  if (wordDisplayElement1) {
    const wordsArray1 = ['for what to do with my kids', 'about Sharky, a tooth-brushing shark superhero', 'for a family of 4 to do indoors on a rainy day', 'for sunglasses for Gen Z and Millennials' , 'a linked list problem'];
    const randomIndex1 = Math.floor(Math.random() * wordsArray1.length);
    const randomWord1 = wordsArray1[randomIndex1];
    wordDisplayElement1.innerHTML = randomWord1;
  }



  
    // Second Tab 
    const wordDisplayElement2 = document.getElementById('hibro2');
    if (wordDisplayElement2) {
      const wordsArray2 = ['Explain options trading', 'Come up with concepts', 'Recommend a dish', 'Recommend a dish' , 'Explain this code:'];
      const randomIndex2 = Math.floor(Math.random() * wordsArray2.length);
      const randomWord2 = wordsArray2[randomIndex2];
      wordDisplayElement2.innerHTML = randomWord2;
    }
  
    const wordDisplayElement3 = document.getElementById('hibro3');
    if (wordDisplayElement3) {
      const wordsArray3 = ['if I am familiar with buying and selling stocks', 'for a retro-style arcade game', 'to impress a date who is a picky eater', 'to bring to a potluck' , 'cat config.yaml | awk NF'];
      const randomIndex3 = Math.floor(Math.random() * wordsArray3.length);
      const randomWord3 = wordsArray3[randomIndex3];
      wordDisplayElement3.innerHTML = randomWord3;
    }




    
    // Third Tab 
    const wordDisplayElement4 = document.getElementById('hibro4');
    if (wordDisplayElement4) {
      const wordsArray4 = ['Help me pick', 'Plan a trip', 'Plan an itinerary', 'Explain options trading' , 'Compare marketing strategies'];
      const randomIndex4 = Math.floor(Math.random() * wordsArray4.length);
      const randomWord4 = wordsArray4[randomIndex4];
      wordDisplayElement4.innerHTML = randomWord4;
    }
  
    const wordDisplayElement5 = document.getElementById('hibro5');
    if (wordDisplayElement5) {
      const wordsArray5 = ['a birthday gift for my mom who likes gardening', 'to experience Seoul like a local', 'to experience the wildlife in the Australian outback', 'if I am familiar with buying and selling stocks' , 'for sunglasses for Gen Z and Millennials'];
      const randomIndex5 = Math.floor(Math.random() * wordsArray5.length);
      const randomWord5 = wordsArray5[randomIndex5];
      wordDisplayElement5.innerHTML = randomWord5;
    }





    
    // fourth Tab 
    const wordDisplayElement6 = document.getElementById('hibro6');
    if (wordDisplayElement6) {
      const wordsArray6 = ['Plan a trip', 'Create a content calendar', 'Give me ideas', 'Help me pick' , 'Show me a code snippet'];
      const randomIndex6 = Math.floor(Math.random() * wordsArray6.length);
      const randomWord6 = wordsArray6[randomIndex6];
      wordDisplayElement6.innerHTML = randomWord6;
    }
  
    const wordDisplayElement7 = document.getElementById('hibro7');
    if (wordDisplayElement7) {
      const wordsArray7 = ['to explore the rock formations in Cappadocia', 'for a TikTok account', 'for what to do with my kids art', 'an outfit that will look good on camera' , 'of a websites sticky header'];
      const randomIndex7 = Math.floor(Math.random() * wordsArray7.length);
      const randomWord7 = wordsArray7[randomIndex7];
      wordDisplayElement7.innerHTML = randomWord7;
    }


}, []);

  // CUSTOM JS CODE - DYNAMICALLY CHANGE CONTENTS OF BOTTOM LIST CONTENTS OF THE CHAT AREA   - END

 //=======================================================================================================================================



   // CUSTOM JS CODE - TOP TWO TOGGLE POPUPS   - START

  //First popup

  const popupalert1 = () => {
    const element1 = document.getElementById('popup1_ids');
  // Check if the element exists and hide it
    if (element1) {
      element1.style.display = 'block';
    }
  };

  const togglePopup = () => {
    const element1 = document.getElementById('popup1_ids');
  // Check if the element exists and hide it
    if (element1) {

      element1.style.display = 'none';

      // setTimeout(function(){
      //   element1.style.display = 'none';
      // }, 1000);
    }  
  };


  //second popup

  const popupalert2 = () => {
    const element1 = document.getElementById('popup1_ids1');
  // Check if the element exists and hide it
    if (element1) {
      element1.style.display = 'block';
    } 
  };


  const togglePopup1 = () => {
    const element11 = document.getElementById('popup1_ids1');
  // Check if the element exists and hide it
    if (element11) {
      element11.style.display = 'none';

      // setTimeout(function(){
      //   element11.style.display = 'none';
      // }, 1000);
     
    }  
  };


   // CUSTOM JS CODE - TOP TWO TOGGLE POPUPS   - END

   //==================================================================================================================================




// End - Custom functions for chatgpt (show and hide popup alerts )

// const overlay_hide = () => {
//   const element12 = document.getElementById('overlay_top');
// // Check if the element exists and hide it
//   if (element12) {
//     element12.style.display = 'block';
   
//   }  
// };









  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView(true);
    }
  };
  const throttledScrollDown = throttle(scrollDown, 250);

  // useEffect(() => {
  //   console.log('currentMessage', currentMessage);
  //   if (currentMessage) {
  //     handleSend(currentMessage);
  //     homeDispatch({ field: 'currentMessage', value: undefined });
  //   }
  // }, [currentMessage]);


  
const side_popup1 = () => {
  const element1 = document.getElementById('side_popup_id1');
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



  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(
        selectedConversation.messages[selectedConversation.messages.length - 2],
      );
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setAutoScrollEnabled(entry.isIntersecting);
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }
      },
      {
        root: null,
        threshold: 0.5,
      },
    );
    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [messagesEndRef]);




  //overlay setting
const overlay_open_pemium = () => {
  const element12 = document.getElementById('overlay_top');
  const element13 = document.getElementById('setting_section_cover_premium');
  const element1 = document.getElementById('side_popup_id');
// Check if the element exists and hide it
  if (element12 && element13 && element1) {
    element12.style.display = 'block';
    element13.style.display = 'block';
    element1.style.display = 'none';
   
  }  
};





  return (
    <div className="relative flex-1 overflow-auto bg-white dark:bg-[#343541]" id='body_style'>
      {!(apiKey || serverSideApiKeyIsSet) ? (
        <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
          <div className="text-center text-4xl font-bold text-black dark:text-white">
            Welcome to chatGPT
          </div>
          <div className="text-center text-lg text-black dark:text-white">
            <div className="mb-8">{`Chatbot UI is an open source clone of OpenAI's ChatGPT UI.`}</div>
            <div className="mb-2 font-bold">
              Important: Chatbot UI is 100% unaffiliated with OpenAI.
            </div>
          </div>
          <div className="text-center text-gray-500 dark:text-gray-400">
            <div className="mb-2">
              Chatbot UI allows you to plug in your API key to use this UI with
              their API.
            </div>
            <div className="mb-2">
              It is <span className="italic">only</span> used to communicate
              with their API.
            </div>
            <div className="mb-2">
              {t(
                'Please set your OpenAI API key in the bottom left of the sidebar.',
              )}
            </div>
            <div>
              {t("If you don't have an OpenAI API key, you can get one here: ")}
              <a
                href="https://platform.openai.com/account/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline"
              >
                openai.com
              </a>
            </div>
          </div>
        </div>
      ) : modelError ? (
        <ErrorMessageDiv error={modelError} />
      ) : (
        <>
          <div
            className="max-h-full "
            ref={chatContainerRef}
            onScroll={handleScroll}
          >
            {selectedConversation?.messages.length === 0 ? (
              <>
                <div className="mx-auto flex flex-col space-y-5 md:space-y-10 px-3 pt-5 md:pt-12 sm:max-w-[600px]">

             

                <div className="hii" id='top_tow_section_back' style={{display: 'flex', justifyContent: 'center', border: 'solid', padding: '3px', 
                 width: 'fit-content', margin: '0 auto' , borderColor:'#202123' , background:'#202123' , borderRadius:'15px'}}>
                              
                  <div className="hello" id='top_gp3_button' onMouseMove={popupalert1} onMouseOut={togglePopup} style={{border: 'solid', marginRight: '3px' , background:'#40414f' , borderColor:'#40414f' ,
                      borderRadius:'10px' , paddingLeft:'18px' , paddingRight:'18px' , display:'flex'}}>              
                      
                      <svg xmlns="http://www.w3.org/2000/svg"  style={{marginTop:'6px' , color:'#24c37f'}} viewBox="0 0 16 16" fill="none" className="h-4 w-4 transition-colors text-brand-green" width="16" 
                      height="16" stroke-width="2"><path d="M9.586 1.526A.6.6 0 0 0 8.553 1l-6.8 7.6a.6.6 0 0 0 .447 1h5.258l-1.044 4.874A.6.6 0 0 0 7.447 15l6.8-7.6a.6.6 0 0 0-.447-1H8.542l1.044-4.874Z" 
                      fill="currentColor"></path></svg>
                      <h1 style={{padding:'5px'}}>GPT - 3.5</h1>
                  </div>



                  <div className="hello"  id='top_gp4'   onMouseMove={popupalert2} onMouseOut={togglePopup1} style={{border: 'solid' , borderColor:'#202123' , background:'#202123' , paddingLeft:'18px' , paddingRight:'18px' , display:'flex' , color:'#8e8ea0'}}>
                        <svg xmlns="http://www.w3.org/2000/svg" style={{color:'#8e8ea0' , marginTop:'6px' }} viewBox="0 0 16 16" fill="none" className="h-4 w-4 transition-colors group-hover/button:text-brand-purple"
                        width="16" height="16" stroke-width="2"><path d="M12.784 1.442a.8.8 0 0 0-1.569 0l-.191.953a.8.8 0 0 1-.628.628l-.953.19a.8.8 0 0 0 0 1.57l.953.19a.8.8 0 0 1
                        .628.629l.19.953a.8.8 0 0 0 1.57 0l.19-.953a.8.8 0 0 1 .629-.628l.953-.19a.8.8 0 0 0 0-1.57l-.953-.19a.8.8 0 0 1-.628-.629l-.19-.953h-.002ZM5.559 4.546a.8.8 0 0 0-1.519 
                        0l-.546 1.64a.8.8 0 0 1-.507.507l-1.64.546a.8.8 0 0 0 0 1.519l1.64.547a.8.8 0 0 1 .507.505l.546 1.641a.8.8 0 0 0 1.519 0l.546-1.64a.8.8 0 0 1 .506-.507l1.641-.546a.8.8 
                        0 0 0 0-1.519l-1.64-.546a.8.8 0 0 1-.507-.506L5.56 4.546Zm5.6 6.4a.8.8 0 0 0-1.519 0l-.147.44a.8.8 0 0 1-.505.507l-.441.146a.8.8 0 0 0 0 1.519l.44.146a.8.8 0 0 1 
                        .507.506l.146.441a.8.8 0 0 0 1.519 0l.147-.44a.8.8 0 0 1 .506-.507l.44-.146a.8.8 0 0 0 0-1.519l-.44-.147a.8.8 0 0 1-.507-.505l-.146-.441Z" 
                        fill="currentColor"></path></svg>
                        <h1  style={{padding:'5px'}}>GPT - 4</h1>
                        <svg xmlns="http://www.w3.org/2000/svg"  style={{color:'#8e8ea0' , marginTop:'6px' }} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" stroke-width="2" className="h-4 w-4 ml-0.5 h-4 w-4 transition-colors sm:ml-0 
                        group-hover/options:text-gray-500 !text-gray-500 -ml-2 group-hover/button:text-brand-purple"><path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 
                        3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clip-rule="evenodd"></path></svg>
                  </div>

                </div>


                <div className="popup1" id="popup1_ids" style={{ display:'none' , position:'absolute'}}>
                  <div className="class1 popup_1"  style={{ margin: '10px', flexDirection: 'column' , background:'#202123'  , borderColor:'#202123'  }}>
                    <h5 className="textcolor1" style={{marginBottom:'13px'}}>Our fastest model, great for most everyday tasks.</h5>
                    <p className="textcolor2">Available to Free and Plus users</p>
                  </div>
                </div>


                <div className="popup1" id="popup1_ids1"   onMouseMove={popupalert2}  onMouseOut={togglePopup1}  style={{ display:'none' , position:'absolute'}}>
                  <div className="class1 popup_1"  style={{ margin: '13px', flexDirection: 'column' , background:'#202123'  , borderColor:'#202123'  }}>
                    <h5 className="textcolor1" style={{marginBottom:'13px'}}>Our most capable model, great for tasks that require creativity and advanced reasoning.</h5>
                    <p className="textcolor2" style={{marginBottom:'13px'}}>Available exclusively to Plus users.</p>
                    <p className="textcolor2" style={{marginBottom:'13px'}}>GPT-4 currently has a cap of 25 messages every 3 hours.</p>
                    <button type="button" onClick={overlay_open_pemium} style={{background:'#ab68fd' , width:'100%' , padding:'10px' , borderRadius:'5px'}}>Upgrade to ChatGPT Plus</button>
            
                  </div>
                </div>



                  <div className="text-center text-3xl font-semibold 
                  text-gray-800 dark:text-gray-100" style={{color:'#565869' , fontSize:'40px'}}>
                    {models.length === 0 ? (
                      <div>
                        {/* <Spinner size="16px" className="mx-auto" /> */}
                      </div>
                    ) : (
                      'ChatGPT'
                    )}
                  </div>

                  {/* {models.length > 0 && (
                    <div id='model_set' className="flex h-full flex-col space-y-4 rounded-lg 
                    border border-neutral-200 p-4 dark:border-neutral-600"
                    }}>
                    
                    
                        <h1>Hello worl</h1>
                     
                    </div>
                  )} */}
                </div>
              </>
            ) : (
              <>
                {/* <div className="sticky top-0 z-10 flex justify-center border border-b-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#444654] dark:text-neutral-200">
                  {t('Model')}: {selectedConversation?.model.name} | {t('Temp')}
                  : {selectedConversation?.temperature} |
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={handleSettings}
                  >
                    <IconSettings size={18} />
                  </button>
                  <button
                    className="ml-2 cursor-pointer hover:opacity-50"
                    onClick={onClearAll}
                  >
                    <IconClearAll size={18} />
                  </button>
                </div> */}
                {showSettings && (
                  <div className="flex flex-col space-y-10 md:mx-auto md:max-w-xl md:gap-6 md:py-3 md:pt-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                    <div className="flex h-full flex-col space-y-4 border-b border-neutral-200 p-4 dark:border-neutral-600 md:rounded-lg md:border">
                      <ModelSelect />
                    </div>
                  </div>
                )}

                {selectedConversation?.messages.map((message, index) => (
                  <MemoizedChatMessage
                    key={index}
                    message={message}
                    messageIndex={index}
                    onEdit={(editedMessage) => {
                      setCurrentMessage(editedMessage);
                      // discard edited message and the ones that come after then resend
                      handleSend(
                        editedMessage,
                        selectedConversation?.messages.length - index,
                      );
                    }}
                  />
                ))}

                {loading && <ChatLoader />}

                <div className="h-[162px] bg-white dark:bg-[#343541]" ref={messagesEndRef} 
                />
              </>
            )}
          </div>


          {/* <div  style="display: flex; flex-direction: column; align-items: center;">
            <div class="class1" style="margin: 10px;">Content 1</div>
            <div class="class2" style="margin: 10px;">Content 2</div>
          </div> */}

          {/* <div className="bottom_section" style={{display:'flex' , flexDirection:'column' , alignItems:'center'}}>
             <div className="class1" style={{margin:'10px'}}>Content 1</div>
             <div className="class2" style={{margin:'10px'}}>Content 1</div>
          </div> */}



   <div className="bottom_main" id="bottom_main_id" style={{bottom:'115px' , position:'inherit' , zIndex:'9' , top:'195px'}}>
      <div className="bottom_section" style={{ display: 'flex', flexDirection: 'column' , alignItems:"center"}}>
     
      <div className="class1 class11" id='bottom_list_1' style={{ margin: '10px', display: 'flex',  flexDirection: 'column' }}>
          <h5 className="textcolor1" id="hibro">Brainstorm names</h5>
          <p className="textcolor2" id="hibro1">for an orange cat we are adopting from the shelter</p>
      </div>

      <div className="class1 class11" id='bottom_list_2' style={{ margin: '10px', display: 'flex', flexDirection: 'column'}}>
          <h5 className="textcolor1" id="hibro2">Make a content strategy</h5>
          <p className="textcolor2" id="hibro3">for a newsletter featuring free local weekend events</p>
      </div>
    </div>

      <div className="bottom_section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="class1 class11" id='bottom_list_3'  style={{ margin: '10px', display: 'flex', flexDirection: 'column'}}>
          <h5 className="textcolor1" id="hibro4">Compare storytelling techniques</h5>
          <p className="textcolor2" id="hibro5">in novels and in films</p>
        </div>
        <div className="class1 class11" id='bottom_list_4' style={{ margin: '10px', display: 'flex', flexDirection: 'column'}}>
          <h5 className="textcolor1" id="hibro6">Help me study</h5>
          <p className="textcolor2" id="hibro7">vocabulary for a college entrance exam</p>
        </div>
      </div>

   </div>


   
         <div className="side_settings" id='side_popup_id1' style={{display:'none', width:'auto' 
         , right:'1%',zIndex:'9' ,bottom:'9%'}}>
                <a href="https://help.openai.com/en/collections/3742473-chatgpt" className="setting1" target="_blank">
                  <svg stroke="currentColor"  fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"
                      className="h-4 w-4 icons_position" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 
                      1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 
                      0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0
                      0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 
                      0 0-1.51 1z"></path>
                  </svg>
                  <h1>Help & FAQ</h1>
                </a>
                <hr style={{marginBottom:'8px'}}></hr>

                <a href="https://openai.com/policies" className="setting1" target="_blank">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" 
                stroke-linejoin="round" className="icon-sm icons_position" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9">
                  </polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                  <h1>Terms & policies</h1>
                </a>

                                
                <hr style={{marginBottom:'8px'}}></hr>
                <div className="setting1" >
                  <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" className="h-4 w-4 icons_position" 
                  height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7">
                    </polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <h1>Keyboard shortcuts </h1>
                </div>
            </div>



              <div className='right_popup_button_round' style={{bottom:'2%',position:'absolute' , zIndex:'1' , right:'3%'}} onClick={() => side_popup1()}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"
                 >
                     <circle cx="50" cy="50" r="40" fill="#4a4b53" />
                     <text x="50" y="60" font-size="40" text-anchor="middle" fill="white" >?</text>
                  </svg>    
              </div>
    



       
      {/* <div className="bottom_section">         
          <div className="class1">
              <h1>Hello world</h1>
          </div>
          <div className="class2">
               <h1>Hello world</h1>
          </div>
       </div> */}

          <ChatInput
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            onSend={(message, plugin) => {
              setCurrentMessage(message);
              handleSend(message, 0, plugin);
            }}
            onScrollDownClick={handleScrollDown}
            onRegenerate={() => {
              if (currentMessage) {
                handleSend(currentMessage, 2, null);
              }
            }}
            showScrollDownButton={showScrollDownButton}
          />
        </>
      )}

{/* 
      
              <div className="hii" style={{display: 'flex', justifyContent: 'center', border: 'solid', padding: '3px',  
                 width: 'fit-content', margin: '0 auto' , borderColor:'#202123' , background:'#202123' , borderRadius:'15px' , bottom:'0'}}>
                  <div className="hello" style={{border: 'solid', marginRight: '3px' , background:'#40414f' , borderColor:'#40414f' , borderRadius:'10px' , paddingLeft:'18px' , paddingRight:'18px'}}>
                    <h1 style={{padding:'5px'}}>GPT - 3.5</h1>
                  </div>
                  <div className="hello" style={{border: 'solid' , borderColor:'#202123' , background:'#202123' , paddingLeft:'18px' , paddingRight:'18px'}}>
                  <h1  style={{padding:'5px'}}>GPT - 3.5</h1>
                  </div>
                </div> */}


    </div>
  );
});
Chat.displayName = 'Chat';


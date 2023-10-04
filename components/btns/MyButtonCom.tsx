import { FC } from 'react';

interface Props {
  text: string;
  icon: JSX.Element;
  onClick: () => void;
}

export const MyButtonCom: FC<Props> = ({ text, icon, onClick }) => {
  return (
    <button
      className="flex w-full cursor-pointer select-none items-center gap-3 rounded-md py-3 px-3 text-[14px] leading-3 text-white transition-colors duration-200 hover:bg-gray-500/10 left:10"
      // onClick={onClick}
      style={{ color: 'black' , backgroundColor: ' #fae6a0' , position : 'absolute' , width:'25%' , right:'5%' , padding:'7px' , justifyContent : 'center' , marginTop: '5%'}}
    > 
      {/* <div>{icon}</div> */}
      <span>{text}</span>
    </button>
  );
};

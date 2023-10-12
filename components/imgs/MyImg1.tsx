import Image from 'next/image';
import { relative } from 'path';

function MyImg1() {
  return (
    <div>
      {/* Use the `src` prop to specify the path to your image */}
      <Image
        src="/icons_chat.png" // Path to your image in the public directory
        alt="My Image"
        width={45} // Width of the displayed image
        height={45} // Height of the displayed image

        style={ { position:'relative' , left:'0px' , bottom:'12px'}}
        
      />
    </div>
  );
}

export default MyImg1;

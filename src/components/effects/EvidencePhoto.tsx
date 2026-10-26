import {motion} from "motion/react";
import type {ReactNode} from "react";
import {ArrowUpRight} from "lucide-react";
import {useSceneMotion} from "../../useSceneMotion";

/** A reusable paper exhibit; previews never intercept the normal pointer. */
export function EvidencePhoto({title,index,image,children,kind="CREATIVE EVIDENCE"}:{title:string;index:string;image?:string;children?:ReactNode;kind?:string}) {
  const {still}=useSceneMotion();
  return <motion.figure className="evidence-photo" initial={still?false:{opacity:0,y:18,rotate:3}} animate={{opacity:1,y:0,rotate:-3}} exit={{opacity:0,y:-12,rotate:-7}} transition={{duration:still?0:.38,ease:[.22,1,.36,1]}}>
    <div className="evidence-photo-visual">{image?<img src={`${import.meta.env.BASE_URL}media/${image}`} alt="" draggable={false}/>:children}</div>
    <figcaption><small>{kind} / {index}</small><span>{title}<ArrowUpRight size={13}/></span></figcaption>
  </motion.figure>;
}

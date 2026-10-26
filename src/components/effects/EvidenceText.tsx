import { useSceneMotion } from "../../useSceneMotion";
import DecryptedText from "./DecryptedText";

/** A finite cipher reveal. No hover tracker, looping ticker or hidden scrambled copy. */
export function EvidenceText({text,className=""}:{text:string;className?:string}) {
  const {still}=useSceneMotion();
  if(still) return <span className={`evidence-cipher ${className}`}>{text}</span>;
  return <DecryptedText key={text} text={text} animateOn="view" sequential revealDirection="center"
    speed={25} maxIterations={8} characters="221B4869/ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    scrambleColor="#8eb6c8" effect="fade" loop={false} parentClassName={`evidence-cipher ${className}`}/>;
}

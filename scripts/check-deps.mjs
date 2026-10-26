import { readFileSync } from "node:fs";

const pkg=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"));
const lock=JSON.parse(readFileSync(new URL("../package-lock.json",import.meta.url),"utf8"));
const allowed=["react","react-dom","three","motion","lucide-react","@base-ui/react"];
const unexpected=Object.keys(pkg.dependencies).filter(name=>!allowed.includes(name));
const problems=unexpected.map(name=>`Unexpected runtime dependency: ${name}. Update the documented policy before expanding the stack.`);
for(const name of [...allowed,"framer-motion"]) {
  const entries=Object.entries(lock.packages).filter(([path])=>path===`node_modules/${name}`||path.endsWith(`/node_modules/${name}`));
  if(entries.length!==1)problems.push(`${name}: expected one installed package location, found ${entries.length}`);
  const versions=new Set(entries.map(([,entry])=>entry.version));
  if(versions.size>1)problems.push(`${name}: duplicate versions ${[...versions].join(", ")}`);
}
if(problems.length){console.error(problems.join("\n"));process.exitCode=1;}
else console.log("Dependency policy passed: 6 runtime roles, one copy of every core package; Motion owns its single framer-motion implementation.");

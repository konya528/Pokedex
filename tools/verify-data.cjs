// Run the current catalog and personal-data checks in isolated test contexts.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for(const file of ['verify-pokedex.cjs','verify-ownership.cjs','verify-annotations.cjs','verify-national.cjs']){
 const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status||1);
}

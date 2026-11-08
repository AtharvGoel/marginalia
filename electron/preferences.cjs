const defaults=require('../shared/reading-defaults.json');
const choices={theme:['light','sepia','dark'],fontFamily:['book','serif','sans','mono'],layout:['paginated','scroll']};
const ranges={fontSize:[14,30],lineHeight:[1.3,2.2],margin:[8,64],readingWidth:[480,1200],sidebarWidth:[220,420]};
function validatePreferences(value,current=defaults){
 if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('Invalid reading preferences.');
 const result={...defaults,...current};
 for(const [key,options]of Object.entries(choices)){
  if(value[key]!==undefined){if(!options.includes(value[key]))throw new Error('Invalid reading preference: '+key);result[key]=value[key];}
 }
 for(const [key,[min,max]]of Object.entries(ranges)){
  if(value[key]!==undefined){if(!Number.isFinite(value[key]) || value[key]<min || value[key]>max)throw new Error('Invalid reading preference: '+key);result[key]=value[key];}
 }
 if(value.sidebarCollapsed!==undefined){if(typeof value.sidebarCollapsed!=='boolean')throw new Error('Invalid sidebar state.');result.sidebarCollapsed=value.sidebarCollapsed;}
 return result;
}
module.exports={defaults,validatePreferences};

// @ts-check
import { defineConfig } from 'astro/config';
import  notebookAstroResolver  from "@zikojs/notebook-astro-resolver"


import zikojs from '@zikojs/astro';


// https://astro.build/config
export default defineConfig({
  integrations: [
    zikojs(),
    notebookAstroResolver({
         modules: [
                "ziko",
                "ziko/dom",
                "ziko/hooks",
         ]
      })
  ],
  // vite:{
  //   resolve:{
  //     noExternal:[
  //       '@zikojs/notebook', 
  //       '@zikojs/console', 
  //     ]
  //   }
  // }
});
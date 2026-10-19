// @ts-check
import { defineConfig } from 'astro/config';
import { notebookAstroResolver } from './resolver.js'


import zikojs from '@zikojs/astro';

// https://astro.build/config
export default defineConfig({
  integrations: [
    zikojs(),
    notebookAstroResolver({
         packages: [
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
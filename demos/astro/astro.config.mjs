// @ts-check
import { defineConfig } from 'astro/config';
import { notebookViteResolver } from './resolver.js'


import zikojs from '@zikojs/astro';

// https://astro.build/config
export default defineConfig({
  vite:{
    plugins:[
      notebookViteResolver({
         packages: [
                "ziko",
                "ziko/dom",
                "ziko/hooks",
         ]
      })
    ]
  },
  integrations: [zikojs()],
  // vite:{
  //   resolve:{
  //     noExternal:[
  //       '@zikojs/notebook', 
  //       '@zikojs/console', 
  //     ]
  //   }
  // }
});
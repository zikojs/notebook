// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import node from '@astrojs/node'

// https://astro.build/config
export default defineConfig({
	output: "server",
    adapter: node({ mode: "standalone" }),
	integrations: [
		starlight({
			title: 'My Docs',
			prerender: false,
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withastro/starlight' }],
			sidebar: [
				// {
				// 	label: 'Guides',
				// 	items: [
				// 		// Each item here is one entry in the navigation menu.
				// 		{ label: 'Example Guide', slug: 'guides/example' },
				// 	],
				// },
				// {
				// 	label: 'Reference',
				// 	items: [{ autogenerate: { directory: 'reference' } }],
				// },
			],
		}),
	],
});

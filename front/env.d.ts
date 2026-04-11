// Allow importing .glsl files as raw strings via Vite's ?raw suffix
declare module "*.glsl?raw" {
	const src: string;
	export default src;
}

interface ImportMetaEnv {
	readonly STRAPI_URL: string;
	readonly PUBLIC_SITE_URL: string;
	readonly PROD: boolean;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

// Popin API on window object
interface Window {
	Popin: {
		open: (id: string) => void;
		close: (id: string) => void;
	};
}

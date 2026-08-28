import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: 'es2020',
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false,
        sourcemap: false,
        lib: {
            entry: 'src/main.js',
            formats: ['es'],
            fileName: () => 'roundeditor.js',
            cssFileName: 'roundeditor',
        },
        rollupOptions: {
            output: {
                assetFileNames: 'roundeditor.[ext]',
            },
        },
    },
});

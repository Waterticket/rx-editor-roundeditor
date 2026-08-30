import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        target: 'es2020',
        outDir: 'dist',
        emptyOutDir: true,
        cssCodeSplit: false,
        // Keep the minified module small while allowing browser devtools to
        // map production errors back to the original source files.
        sourcemap: true,
        // Library mode does not minify by default. Use Terser so the deployed
        // module is as small as possible and contains no source comments.
        minify: 'terser',
        terserOptions: {
            module: true,
            compress: {
                passes: 3,
                drop_console: true,
            },
            mangle: {
                toplevel: true,
            },
            format: {
                comments: false,
            },
        },
        lib: {
            entry: 'src/main.js',
            formats: ['es'],
            fileName: () => 'roundeditor.min.js',
            cssFileName: 'roundeditor',
        },
        rollupOptions: {
            output: {
                assetFileNames: 'roundeditor.[ext]',
            },
        },
    },
});

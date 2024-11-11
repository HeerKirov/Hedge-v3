import path from "path"
import { BuildOptions, defineConfig, PluginOption } from "vite"
import electron from "vite-plugin-electron/simple"
import { getServerVersion } from "./build/utils"

export default defineConfig(async env => {
    const serverVersion = await getServerVersion()

    return {
        build: <BuildOptions>{
            outDir: "dist-electron",
            minify: "esbuild"
        },
        plugins: <PluginOption[]>[
            await electron({
                main: {
                    entry: "src/main.ts",
                    vite: {
                        define: {
                            "import.meta.env.SERVER_VERSION": JSON.stringify(serverVersion)
                        },
                        resolve: {
                            alias: {
                                "@": path.resolve(__dirname, "src")
                            }
                        },
                        build: {
                            rollupOptions: {
                                external: ['bufferutil', 'utf-8-validate', 'classic-level']
                            }
                        }
                    }
                },
                preload: {
                    input: "src/application/ipc/preload.ts",
                    vite: {
                        resolve: {
                            alias: {
                                "@": path.resolve(__dirname, "src")
                            }
                        }
                    }
                }
            })
        ]
    }
})
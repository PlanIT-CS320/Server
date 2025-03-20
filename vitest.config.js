/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        fileParallelism: false,
        include: ["./tests/**/*.test.js"],
        poolOptions: {
            forks: {
                execArgv: ["--env-file=.test.env"],
            },
        },
    },
});

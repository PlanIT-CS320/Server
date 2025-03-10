/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["./tests/**/*.test.js"],
        poolOptions: {
            forks: {
                execArgv: ["--env-file=.test.env"],
            },
        },
    },
});

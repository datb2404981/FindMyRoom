import {existsSync} from 'node:fs'
import {defineConfig} from '@playwright/test'
const localChrome='/Users/macos/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
export default defineConfig({testDir:'./tests',timeout:30000,workers:1,use:{baseURL:'http://127.0.0.1:5173',headless:true,launchOptions:{executablePath:process.env.CHROME_PATH||(existsSync(localChrome)?localChrome:undefined)}},reporter:'list'})
